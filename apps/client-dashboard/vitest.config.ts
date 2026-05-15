// Minimal vitest config for client-dashboard tests.
//
// Required because `tests/tenant-isolation.test.ts` uses
// `vi.mock("@/lib/session", ...)`. Without an explicit `@` alias here,
// vitest's resolver hangs trying to satisfy the mock against an
// unresolvable specifier (the dashboard's tsconfig path mapping is not
// honored by vitest without this).
//
// Node environment because the test exercises server-side query helpers
// (postgres-js, server-only) — no JSDOM needed. No setupFiles.

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
