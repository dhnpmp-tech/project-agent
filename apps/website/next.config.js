/** @type {import('next').NextConfig} */
// Hosted on Vercel at agents.dcp.sa. The dashboard (separate Vercel project)
// is mounted at /app/* via a cross-project rewrite. Static export is
// intentionally removed so the Phase C `/api/rami/*` route handlers can run
// server-side.
//
// Using next.config.js rewrites() instead of vercel.json because Vercel was
// not picking up vercel.json rewrites for this project (likely due to custom
// build commands).
const DASHBOARD_HOST = "https://project-agent-dc11.vercel.app";

const nextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      { source: "/app", destination: `${DASHBOARD_HOST}/app` },
      { source: "/app/:path*", destination: `${DASHBOARD_HOST}/app/:path*` },
    ];
  },
};

module.exports = nextConfig;
