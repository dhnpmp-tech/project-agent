import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        surface: {
          0: "#ffffff",
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        // DCP Design Kit v1 — references CSS vars in globals.css so palette swap works
        dcp: {
          bg: "var(--dcp-bg)",
          "bg-2": "var(--dcp-bg-2)",
          paper: "var(--dcp-paper)",
          ink: "var(--dcp-ink)",
          "ink-2": "var(--dcp-ink-2)",
          mut: "var(--dcp-mut)",
          dim: "var(--dcp-dim)",
          line: "var(--dcp-line)",
          hair: "var(--dcp-hair)",
          teal: "var(--dcp-teal)",
          orange: "var(--dcp-orange)",
          accent: "var(--dcp-accent)",
          "accent-2": "var(--dcp-accent-2)",
          "accent-ink": "var(--dcp-accent-ink)",
          ok: "var(--dcp-ok)",
          warn: "var(--dcp-warn)",
          err: "var(--dcp-err)",
          info: "var(--dcp-info)",
        },
      },
      fontFamily: {
        // DCP type stack — applied via class on individual sections, not site-wide
        dcp: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Instrument Serif", '"Times New Roman"', "serif"],
        arabic: ["Noto Naskh Arabic", "serif"],
        "dcp-mono": ["JetBrains Mono", "ui-monospace", "Menlo", "monospace"],
      },
      maxWidth: {
        dcp: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
