"""
Thin asyncpg-backed data layer for the post-Supabase prompt-builder.

Drop-in replacement for the httpx + PostgREST patterns previously used
against Supabase. Exposes select/insert/update/delete primitives that
mirror the URL-filter style of the old calls, so refactoring call sites
stays mostly mechanical.

Usage:
    from database import db

    # SELECT
    rows = await db.select("clients", {"id": client_id})

    # SELECT with order + limit
    rows = await db.select(
        "active_bookings",
        {"customer_phone": phone, "status__in": ["collecting", "confirming"]},
        order_by="-created_at",
        limit=1,
    )

    # INSERT (returns inserted rows)
    rows = await db.insert("conversation_messages", {
        "client_id": cid, "customer_phone": p, "direction": "inbound",
    })

    # UPDATE (returns updated rows)
    rows = await db.update("active_bookings", {"id": booking_id}, {"status": "confirmed"})

    # DELETE (returns count)
    n = await db.delete("auth_otp_codes", {"email": email})

    # Raw SQL escape hatch
    rows = await db.query("SELECT COUNT(*) AS c FROM activity_logs WHERE client_id = $1", cid)
"""

from __future__ import annotations

import json
import os
import asyncio
import logging
from typing import Any, Iterable, Mapping, Sequence

import asyncpg

log = logging.getLogger(__name__)


async def _init_connection(conn: asyncpg.Connection) -> None:
    """
    Register type codecs so JSONB/JSON columns deserialize into Python dicts
    automatically (asyncpg returns raw strings by default). Without this,
    callers that expect `row["field"]` to be a dict get a string and crash
    with `'str' object has no attribute 'get'`.
    """
    for typename in ("jsonb", "json"):
        await conn.set_type_codec(
            typename,
            encoder=json.dumps,
            decoder=json.loads,
            schema="pg_catalog",
        )

_DATABASE_URL = os.environ.get("DATABASE_URL")
_pool: asyncpg.Pool | None = None
_pool_lock = asyncio.Lock()


async def _get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is not None:
        return _pool
    async with _pool_lock:
        if _pool is not None:
            return _pool
        if not _DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL is not set — point at postgresql://agents_app:<pw>@host:5433/agents"
            )
        _pool = await asyncpg.create_pool(
            dsn=_DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=15.0,
            init=_init_connection,
        )
        log.info("[database] pool ready: %s", _redact(_DATABASE_URL))
    return _pool


def _redact(dsn: str) -> str:
    # postgresql://user:password@host:port/db → postgresql://user:***@host:port/db
    if "@" not in dsn or "://" not in dsn:
        return dsn
    head, tail = dsn.split("@", 1)
    if ":" in head.split("://", 1)[1]:
        scheme_user = head.rsplit(":", 1)[0]
        return f"{scheme_user}:***@{tail}"
    return dsn


# ---- Filter compilation ----------------------------------------------------

def _compile_where(filters: Mapping[str, Any] | None) -> tuple[str, list[Any]]:
    """
    Turn a {col: value} dict into a SQL WHERE clause + positional params.

    Supports operator suffixes:
      col           → col = $N
      col__eq       → col = $N
      col__ne       → col != $N
      col__in       → col = ANY($N)  (value must be a sequence)
      col__gt/gte/lt/lte → col >/>=/</<= $N
      col__like     → col ILIKE $N
      col__is_null  → col IS NULL (value ignored)
      col__not_null → col IS NOT NULL (value ignored)
    """
    if not filters:
        return "", []
    clauses: list[str] = []
    params: list[Any] = []
    for raw_key, value in filters.items():
        if "__" in raw_key:
            col, op = raw_key.rsplit("__", 1)
        else:
            col, op = raw_key, "eq"

        col_sql = _quote_ident(col)

        if op == "eq":
            params.append(value)
            clauses.append(f"{col_sql} = ${len(params)}")
        elif op == "ne":
            params.append(value)
            clauses.append(f"{col_sql} != ${len(params)}")
        elif op == "in":
            if not isinstance(value, (list, tuple, set)):
                raise ValueError(f"{raw_key} requires a list/tuple/set")
            params.append(list(value))
            clauses.append(f"{col_sql} = ANY(${len(params)})")
        elif op in {"gt", "gte", "lt", "lte"}:
            sym = {"gt": ">", "gte": ">=", "lt": "<", "lte": "<="}[op]
            params.append(value)
            clauses.append(f"{col_sql} {sym} ${len(params)}")
        elif op == "like":
            params.append(value)
            clauses.append(f"{col_sql} ILIKE ${len(params)}")
        elif op == "is_null":
            clauses.append(f"{col_sql} IS NULL")
        elif op == "not_null":
            clauses.append(f"{col_sql} IS NOT NULL")
        else:
            raise ValueError(f"Unknown operator suffix: {op}")
    return "WHERE " + " AND ".join(clauses), params


def _quote_ident(name: str) -> str:
    # Whitelist identifier characters; reject anything weird to prevent injection
    if not all(c.isalnum() or c == "_" for c in name):
        raise ValueError(f"Refusing unsafe identifier: {name!r}")
    return f'"{name}"'


def _compile_order(order_by: str | None) -> str:
    if not order_by:
        return ""
    desc = order_by.startswith("-")
    col = order_by.lstrip("-")
    return f"ORDER BY {_quote_ident(col)} {'DESC' if desc else 'ASC'}"


# ---- Public API ------------------------------------------------------------

class DB:
    async def select(
        self,
        table: str,
        filters: Mapping[str, Any] | None = None,
        *,
        order_by: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
        columns: str = "*",
    ) -> list[dict[str, Any]]:
        where_sql, params = _compile_where(filters)
        order_sql = _compile_order(order_by)
        limit_sql = f"LIMIT {int(limit)}" if limit is not None else ""
        offset_sql = f"OFFSET {int(offset)}" if offset is not None else ""
        sql = " ".join(
            x for x in [
                f"SELECT {columns} FROM {_quote_ident(table)}",
                where_sql, order_sql, limit_sql, offset_sql,
            ] if x
        )
        return await self.query(sql, *params)

    async def select_one(
        self,
        table: str,
        filters: Mapping[str, Any] | None = None,
        *,
        order_by: str | None = None,
        columns: str = "*",
    ) -> dict[str, Any] | None:
        rows = await self.select(table, filters, order_by=order_by, limit=1, columns=columns)
        return rows[0] if rows else None

    async def insert(
        self,
        table: str,
        data: Mapping[str, Any] | Sequence[Mapping[str, Any]],
        *,
        returning: str = "*",
        on_conflict: str | None = None,
    ) -> list[dict[str, Any]]:
        rows = [data] if isinstance(data, Mapping) else list(data)
        if not rows:
            return []
        cols = list(rows[0].keys())
        col_sql = ", ".join(_quote_ident(c) for c in cols)
        params: list[Any] = []
        value_groups: list[str] = []
        for row in rows:
            placeholders = []
            for c in cols:
                params.append(row.get(c))
                placeholders.append(f"${len(params)}")
            value_groups.append("(" + ", ".join(placeholders) + ")")
        conflict_sql = ""
        if on_conflict:
            conflict_sql = f"ON CONFLICT {on_conflict}"
        sql = (
            f"INSERT INTO {_quote_ident(table)} ({col_sql}) "
            f"VALUES {', '.join(value_groups)} {conflict_sql} "
            f"RETURNING {returning}"
        )
        return await self.query(sql, *params)

    async def update(
        self,
        table: str,
        filters: Mapping[str, Any],
        data: Mapping[str, Any],
        *,
        returning: str = "*",
    ) -> list[dict[str, Any]]:
        if not data:
            return []
        where_sql, where_params = _compile_where(filters)
        set_parts: list[str] = []
        params: list[Any] = list(where_params)
        for col, val in data.items():
            params.append(val)
            set_parts.append(f"{_quote_ident(col)} = ${len(params)}")
        sql = (
            f"UPDATE {_quote_ident(table)} "
            f"SET {', '.join(set_parts)} {where_sql} "
            f"RETURNING {returning}"
        )
        return await self.query(sql, *params)

    async def delete(self, table: str, filters: Mapping[str, Any]) -> int:
        where_sql, params = _compile_where(filters)
        sql = f"DELETE FROM {_quote_ident(table)} {where_sql}"
        pool = await _get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(sql, *params)
        # asyncpg returns e.g. "DELETE 3"
        return int(result.rsplit(" ", 1)[-1]) if result else 0

    async def query(self, sql: str, *args: Any) -> list[dict[str, Any]]:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            records = await conn.fetch(sql, *args)
        return [dict(r) for r in records]

    async def fetch_one(self, sql: str, *args: Any) -> dict[str, Any] | None:
        pool = await _get_pool()
        async with pool.acquire() as conn:
            record = await conn.fetchrow(sql, *args)
        return dict(record) if record else None

    async def close(self) -> None:
        global _pool
        if _pool is not None:
            await _pool.close()
            _pool = None


db = DB()
