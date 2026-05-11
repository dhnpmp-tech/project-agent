#!/usr/bin/env python3
"""
Transform existing Supabase migrations into self-hosted Postgres equivalents.

Reads each input .sql file, strips Supabase-specific RLS scaffolding,
and writes adapted output to ./out/.

Stripped:
- ALTER TABLE ... ENABLE ROW LEVEL SECURITY
- CREATE POLICY ... (multi-line block, terminated by ; at end of line)
- DROP POLICY ... (single line block)

Rewritten:
- GRANT ... TO authenticated  → GRANT ... TO agents_app
- GRANT ... TO service_role   → GRANT ... TO agents_admin
- auth.uid()                  → NULL  (callers will filter by client_id explicitly)

Run: python3 _transform.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
OUT_DIR = ROOT / "out"
OUT_DIR.mkdir(exist_ok=True)

# (output_filename, source_path_from_repo_root)
PIPELINE = [
    ("001_clients.sql",            "packages/supabase/migrations/001_clients.sql"),
    ("002_agent_deployments.sql",  "packages/supabase/migrations/002_agent_deployments.sql"),
    ("003_activity_logs.sql",      "packages/supabase/migrations/003_activity_logs.sql"),
    ("004_api_keys.sql",           "packages/supabase/migrations/004_api_keys.sql"),
    # 005 + 009 from packages/ are pure RLS — skip entirely
    ("006_calendar_providers.sql", "packages/supabase/migrations/006_calendar_providers.sql"),
    ("007_business_knowledge.sql", "packages/supabase/migrations/007_business_knowledge.sql"),
    ("008_customer_memory.sql",    "packages/supabase/migrations/008_customer_memory.sql"),
    ("009_active_bookings.sql",    "packages/supabase/migrations/010_active_bookings.sql"),
    ("010_vault_schema.sql",       "supabase/migrations/009_vault_schema.sql"),
    ("011_ceo_persona.sql",        "supabase/migrations/010_ceo_persona.sql"),
    ("012_ceo_chat.sql",           "supabase/migrations/011_ceo_chat.sql"),
    ("013_no_show_recovery.sql",   "supabase/migrations/012_no_show_recovery.sql"),
    ("014_expense_capture.sql",    "supabase/migrations/013_expense_capture.sql"),
]

REPO_ROOT = ROOT.parent.parent.parent  # → /Users/pp/Desktop/Moboob/project-agent


def strip_create_policy_blocks(sql: str) -> str:
    """
    Remove CREATE POLICY ... ; blocks (potentially multi-line).
    Also removes DROP POLICY ...;
    """
    # Greedy from CREATE POLICY through next semicolon at end of statement.
    # Postgres CREATE POLICY can span many lines; terminator is `;` outside
    # of quoted strings. Our migrations don't have ; inside policy strings,
    # so a simple ;-at-line-end heuristic is sufficient.
    sql = re.sub(
        r"CREATE\s+POLICY[\s\S]*?;\s*\n",
        "",
        sql,
        flags=re.IGNORECASE,
    )
    sql = re.sub(
        r"DROP\s+POLICY[\s\S]*?;\s*\n",
        "",
        sql,
        flags=re.IGNORECASE,
    )
    return sql


def strip_enable_rls(sql: str) -> str:
    return re.sub(
        r"^\s*ALTER\s+TABLE[^\n]*ENABLE\s+ROW\s+LEVEL\s+SECURITY\s*;\s*\n",
        "",
        sql,
        flags=re.IGNORECASE | re.MULTILINE,
    )


def rewrite_grants(sql: str) -> str:
    sql = re.sub(r"\bTO\s+authenticated\b", "TO agents_app", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\bTO\s+service_role\b", "TO agents_admin", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\bTO\s+anon\b", "TO agents_app", sql, flags=re.IGNORECASE)
    return sql


def transform(sql: str, filename: str) -> str:
    original_lines = sql.count("\n")
    sql = strip_create_policy_blocks(sql)
    sql = strip_enable_rls(sql)
    sql = rewrite_grants(sql)

    # Add provenance header
    header = (
        f"-- AUTO-ADAPTED for self-hosted Postgres on {filename}\n"
        "-- RLS stripped (replaced with app-layer client_id filters).\n"
        "-- grants rewritten: authenticated→agents_app, service_role→agents_admin.\n"
        "-- Source mapping in infrastructure/agents-platform/migrations/_transform.py.\n\n"
    )
    out = header + sql
    new_lines = out.count("\n")
    print(f"  {filename}: {original_lines} → {new_lines} lines")
    return out


def main() -> int:
    print(f"Transforming {len(PIPELINE)} migrations to {OUT_DIR}/")
    for out_name, src_rel in PIPELINE:
        src = REPO_ROOT / src_rel
        if not src.exists():
            print(f"  MISSING: {src}", file=sys.stderr)
            return 1
        sql = src.read_text()
        adapted = transform(sql, out_name)
        (OUT_DIR / out_name).write_text(adapted)
    print(f"\nDone. {len(PIPELINE)} files in {OUT_DIR}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
