# Pytest bootstrap for prompt-builder.
#
# Backend modules read SUPABASE_SERVICE_ROLE_KEY at import time via
# os.environ[KEY] (fail-fast in production). Tests don't (and shouldn't)
# have the real key, so we seed a placeholder before pytest collects
# any test module — collection triggers `from app import app` which
# transitively imports every backend module.
import os

os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-placeholder-not-real")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.local")
