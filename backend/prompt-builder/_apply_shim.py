#!/usr/bin/env python3
"""
One-shot patcher: makes prompt-builder modules tolerant of missing
SUPABASE_* env vars and routes httpx.AsyncClient calls through the
supa.py shim.

Idempotent: re-running on already-patched files is a no-op.

Run from /opt/prompt-builder/ on the VPS (or in the repo, then SCP).
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent

# Files to patch (everything except database.py, supa.py, this script,
# tests/, __pycache__, .bak files).
SKIP = {"database.py", "supa.py", "_apply_shim.py", "__init__.py"}

PATCHES = [
    # 1. Make required env-var lookups tolerant.
    (
        re.compile(r'_SUPA_KEY\s*=\s*os\.environ\["SUPABASE_SERVICE_ROLE_KEY"\]'),
        '_SUPA_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")',
    ),
    (
        re.compile(r'os\.environ\["SUPABASE_SERVICE_ROLE_KEY"\]'),
        'os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")',
    ),
    # 2. Replace httpx.AsyncClient(...) with supa.client(...).
    #    The smart proxy delegates non-Supabase URLs to real httpx, so this is safe.
    (
        re.compile(r"\bhttpx\.AsyncClient\("),
        "supa.client(",
    ),
]

IMPORT_HEADER = "import supa  # post-Supabase shim (routes _SUPA_URL → asyncpg)"


def patch_file(p: Path) -> int:
    src = p.read_text()
    orig = src
    for pattern, repl in PATCHES:
        src = pattern.sub(repl, src)

    # If we replaced httpx.AsyncClient with supa.client, ensure `import supa`
    # is present. Insert right after the `import httpx` line — that always
    # exists as a single-line statement, so no multi-line continuation risk.
    if "supa.client(" in src and "import supa" not in src:
        lines = src.split("\n")
        for i, line in enumerate(lines):
            if line.strip() == "import httpx":
                lines.insert(i + 1, IMPORT_HEADER)
                break
        else:
            # Fallback: insert after the first "import os" line
            for i, line in enumerate(lines):
                if line.strip() == "import os":
                    lines.insert(i + 1, IMPORT_HEADER)
                    break
        src = "\n".join(lines)

    if src == orig:
        return 0

    p.write_text(src)
    return 1


def main() -> int:
    patched = 0
    skipped = 0
    for p in sorted(ROOT.glob("*.py")):
        if p.name in SKIP or p.name.endswith(".bak") or "test_" in p.name:
            skipped += 1
            continue
        if patch_file(p):
            print(f"  patched: {p.name}")
            patched += 1
    print(f"\nDone. patched={patched} skipped={skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
