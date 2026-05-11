"""
PostgREST-compatible shim that routes Supabase-style URLs to local asyncpg.

Drop-in for httpx.AsyncClient where the calls hit `{_SUPA_URL}/rest/v1/*`.

Existing call sites look like:
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.get(f"{_SUPA_URL}/rest/v1/clients?id=eq.{x}",
                                headers=_SUPA_HEADERS)
        rows = resp.json()

After the swap, replace `httpx.AsyncClient(...)` with `supa.client()`:
    async with supa.client() as client:
        resp = await client.get(f"{_SUPA_URL}/rest/v1/clients?id=eq.{x}",
                                headers=_SUPA_HEADERS)
        rows = resp.json()      # ← still works, returns list[dict]

The shim ignores `headers`, supports the URL filter grammar PostgREST uses,
and returns objects that look enough like an httpx.Response for existing
code paths (status_code, .json()).
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

import httpx

from database import db, _quote_ident

log = logging.getLogger(__name__)

# Any URL whose host matches one of these prefixes routes to the Postgres shim.
# Everything else delegates to real httpx so existing Kapso/MiniMax/etc calls
# keep working.
_SUPABASE_HOSTS = {"sybzqktipimbmujtowoz.supabase.co"}
_extra = os.environ.get("SUPA_SHIM_HOSTS", "").strip()
if _extra:
    _SUPABASE_HOSTS.update(h.strip() for h in _extra.split(",") if h.strip())


def _is_supa(url: str) -> bool:
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return False
    return host in _SUPABASE_HOSTS

# Operator markers used by PostgREST query strings: col=op.value
_OP_RE = re.compile(r"^(eq|neq|gt|gte|lt|lte|like|ilike|in|is|not)\.(.+)$", re.DOTALL)


class _Resp:
    __slots__ = ("status_code", "_body")

    def __init__(self, status_code: int, body: Any):
        self.status_code = status_code
        self._body = body

    def json(self) -> Any:
        return self._body

    @property
    def text(self) -> str:
        return json.dumps(self._body, default=str)

    def raise_for_status(self) -> None:
        if 400 <= self.status_code < 600:
            raise RuntimeError(f"HTTP {self.status_code}: {self.text[:200]}")


def _parse_table(url: str) -> tuple[str, dict[str, list[str]]]:
    """Extract table name and query params from a PostgREST URL."""
    parsed = urlparse(url)
    path = parsed.path
    if "/rest/v1/" not in path:
        raise ValueError(f"Not a PostgREST URL: {url}")
    table = path.split("/rest/v1/", 1)[1].strip("/").split("/", 1)[0]
    qs = parse_qs(parsed.query, keep_blank_values=True)
    return table, qs


def _compile_filters(qs: dict[str, list[str]]) -> tuple[str, list[Any], dict[str, Any]]:
    """
    Turn PostgREST query string into a WHERE clause + params.

    Returns (where_sql, params, meta) where meta has order_by, limit, offset, select.
    """
    clauses: list[str] = []
    params: list[Any] = []
    meta: dict[str, Any] = {
        "order_by": None,
        "limit": None,
        "offset": None,
        "select": "*",
    }

    for raw_key, raw_values in qs.items():
        value = raw_values[0] if raw_values else ""

        if raw_key == "select":
            # Allow simple column lists; reject anything weird
            cols = value or "*"
            if cols == "*" or re.fullmatch(r"[A-Za-z0-9_,\s]+", cols):
                meta["select"] = cols
            else:
                meta["select"] = "*"
            continue
        if raw_key == "order":
            # PostgREST: order=col.asc,col2.desc — take first only
            first = value.split(",")[0] if value else ""
            if "." in first:
                col, direction = first.rsplit(".", 1)
            else:
                col, direction = first, "asc"
            if col:
                meta["order_by"] = (col, direction.lower() == "desc")
            continue
        if raw_key == "limit":
            meta["limit"] = int(value)
            continue
        if raw_key == "offset":
            meta["offset"] = int(value)
            continue

        m = _OP_RE.match(value)
        if not m:
            # Treat as eq.value implicitly
            op, val = "eq", value
        else:
            op, val = m.group(1), m.group(2)

        col_sql = _compile_col_expr(raw_key)

        if op == "eq":
            params.append(_decode(val))
            clauses.append(f"{col_sql} = ${len(params)}")
        elif op == "neq":
            params.append(_decode(val))
            clauses.append(f"{col_sql} != ${len(params)}")
        elif op == "gt":
            params.append(_decode(val))
            clauses.append(f"{col_sql} > ${len(params)}")
        elif op == "gte":
            params.append(_decode(val))
            clauses.append(f"{col_sql} >= ${len(params)}")
        elif op == "lt":
            params.append(_decode(val))
            clauses.append(f"{col_sql} < ${len(params)}")
        elif op == "lte":
            params.append(_decode(val))
            clauses.append(f"{col_sql} <= ${len(params)}")
        elif op == "like":
            params.append(_decode(val))
            clauses.append(f"{col_sql} LIKE ${len(params)}")
        elif op == "ilike":
            params.append(_decode(val))
            clauses.append(f"{col_sql} ILIKE ${len(params)}")
        elif op == "in":
            # value format: (v1,v2,v3) or v1,v2,v3
            stripped = val.strip("()")
            items = [_decode(x.strip()) for x in stripped.split(",")]
            params.append(items)
            clauses.append(f"{col_sql} = ANY(${len(params)})")
        elif op == "is":
            # is.null or is.true/false
            v = val.lower()
            if v == "null":
                clauses.append(f"{col_sql} IS NULL")
            elif v == "true":
                clauses.append(f"{col_sql} IS TRUE")
            elif v == "false":
                clauses.append(f"{col_sql} IS FALSE")
            else:
                params.append(val)
                clauses.append(f"{col_sql} IS ${len(params)}")
        elif op == "not":
            # not.is.null, not.eq.value etc — minimal support
            sub = _OP_RE.match(val)
            if sub:
                sub_op, sub_val = sub.group(1), sub.group(2)
                if sub_op == "is" and sub_val.lower() == "null":
                    clauses.append(f"{col_sql} IS NOT NULL")
                else:
                    params.append(_decode(sub_val))
                    sym = {"eq": "!=", "gt": "<=", "gte": "<", "lt": ">=", "lte": ">"}.get(sub_op, "!=")
                    clauses.append(f"{col_sql} {sym} ${len(params)}")

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return where_sql, params, meta


def _decode(s: str) -> Any:
    """Unquote URL-encoded value; preserve as string (PG handles casts)."""
    return unquote(s)


def _compile_col_expr(expr: str) -> str:
    """
    Translate PostgREST column-or-json-path syntax to a SQL expression.

    Examples:
      column                       → "column"
      config->>phoneNumberId       → "config" ->> 'phoneNumberId'
      config->settings->>locale    → "config" -> 'settings' ->> 'locale'
      config->path->key            → "config" -> 'path' -> 'key'
    """
    if "->" not in expr:
        return _quote_ident(expr)

    # Split on -> while preserving the >> distinction. PostgREST uses '->>'
    # for the last text accessor (when present). We walk left-to-right.
    parts: list[str] = []
    remaining = expr
    # First token is the column name
    head_end = remaining.find("->")
    column = remaining[:head_end]
    parts.append(_quote_ident(column))
    remaining = remaining[head_end:]
    while remaining:
        if remaining.startswith("->>"):
            op = "->>"
            remaining = remaining[3:]
        elif remaining.startswith("->"):
            op = "->"
            remaining = remaining[2:]
        else:
            raise ValueError(f"Bad json path syntax: {expr!r}")
        # Read until next -> or end
        nxt = remaining.find("->")
        key = remaining if nxt == -1 else remaining[:nxt]
        remaining = "" if nxt == -1 else remaining[nxt:]
        # Whitelist key characters
        if not all(c.isalnum() or c in {"_", "-"} for c in key):
            raise ValueError(f"Refusing unsafe json key: {key!r}")
        parts.append(f"{op} '{key}'")
    return " ".join(parts)


# ---- Async client interface ------------------------------------------------

class _Client:
    """
    Smart httpx.AsyncClient proxy.

    For URLs whose host is in _SUPABASE_HOSTS, routes to local Postgres.
    For everything else, delegates to a real httpx.AsyncClient.
    """

    def __init__(self, *, timeout: float | None = None, **kwargs: Any):
        self.timeout = timeout
        self._real = httpx.AsyncClient(timeout=timeout, **{
            k: v for k, v in kwargs.items() if k != "timeout"
        })

    async def __aenter__(self) -> "_Client":
        await self._real.__aenter__()
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self._real.__aexit__(*args)

    async def get(self, url: str, *, headers: Any = None, params: Any = None, **kw: Any) -> _Resp:
        if not _is_supa(url):
            return await self._real.get(url, headers=headers, params=params, **kw)
        table, qs = _parse_table(url)
        where_sql, where_params, meta = _compile_filters(qs)
        order_sql = ""
        if meta["order_by"]:
            col, desc = meta["order_by"]
            order_sql = f"ORDER BY {_quote_ident(col)} {'DESC' if desc else 'ASC'}"
        limit_sql = f"LIMIT {meta['limit']}" if meta["limit"] is not None else ""
        offset_sql = f"OFFSET {meta['offset']}" if meta["offset"] is not None else ""
        sql = " ".join(
            x for x in [
                f"SELECT {meta['select']} FROM {_quote_ident(table)}",
                where_sql, order_sql, limit_sql, offset_sql,
            ] if x
        )
        try:
            rows = await db.query(sql, *where_params)
            return _Resp(200, rows)
        except Exception as e:
            log.exception("[supa] GET %s failed: %s", url, e)
            return _Resp(500, [])  # callers expect list[dict] on success; degrade safely

    async def post(self, url: str, *, headers: Any = None, json: Any = None, **kw: Any) -> _Resp:
        if not _is_supa(url):
            return await self._real.post(url, headers=headers, json=json, **kw)
        table, _ = _parse_table(url)
        body = json or {}
        rows = [body] if isinstance(body, dict) else list(body)
        try:
            result = await db.insert(table, rows, returning="*")
            return _Resp(201, result)
        except Exception as e:
            log.exception("[supa] POST %s failed: %s", url, e)
            return _Resp(500, [])

    async def patch(self, url: str, *, headers: Any = None, json: Any = None, **kw: Any) -> _Resp:
        if not _is_supa(url):
            return await self._real.patch(url, headers=headers, json=json, **kw)
        table, qs = _parse_table(url)
        where_sql, where_params, _meta = _compile_filters(qs)
        body = json or {}
        if not body:
            return _Resp(204, [])
        set_parts: list[str] = []
        params = list(where_params)
        for col, val in body.items():
            params.append(val)
            set_parts.append(f"{_quote_ident(col)} = ${len(params)}")
        sql = (
            f"UPDATE {_quote_ident(table)} SET {', '.join(set_parts)} "
            f"{where_sql} RETURNING *"
        )
        try:
            rows = await db.query(sql, *params)
            return _Resp(200, rows)
        except Exception as e:
            log.exception("[supa] PATCH %s failed: %s", url, e)
            return _Resp(500, [])

    async def delete(self, url: str, *, headers: Any = None, **kw: Any) -> _Resp:
        if not _is_supa(url):
            return await self._real.delete(url, headers=headers, **kw)
        table, qs = _parse_table(url)
        where_sql, where_params, _meta = _compile_filters(qs)
        sql = f"DELETE FROM {_quote_ident(table)} {where_sql}"
        try:
            n = await db.delete(table, _filters_from_qs(qs))
            return _Resp(204, None)
        except Exception as e:
            log.exception("[supa] DELETE %s failed: %s", url, e)
            return _Resp(500, [])


def _filters_from_qs(qs: dict[str, list[str]]) -> dict[str, Any]:
    """Convert PostgREST qs to db.delete()'s filter dict format."""
    out: dict[str, Any] = {}
    for k, vs in qs.items():
        v = vs[0] if vs else ""
        m = _OP_RE.match(v)
        if not m:
            out[k] = _decode(v)
            continue
        op, val = m.group(1), m.group(2)
        if op == "eq":
            out[k] = _decode(val)
        elif op == "in":
            out[f"{k}__in"] = [_decode(x.strip()) for x in val.strip("()").split(",")]
        else:
            out[f"{k}__{op}"] = _decode(val)
    return out


def client(**kwargs: Any) -> _Client:
    """Factory mirroring httpx.AsyncClient(...) for Supabase calls."""
    return _Client(timeout=kwargs.get("timeout"))
