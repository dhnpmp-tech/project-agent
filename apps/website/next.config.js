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
      // Public teardown surface — clean URL on the marketing host that
      // proxies into the dashboard project so prospects don't see the
      // /app/* path. Both the form page, the API, and the [slug]
      // permalinks live there.
      { source: "/teardown", destination: `${DASHBOARD_HOST}/app/teardown` },
      { source: "/teardown/", destination: `${DASHBOARD_HOST}/app/teardown` },
      { source: "/teardown/:slug", destination: `${DASHBOARD_HOST}/app/teardown/:slug` },
      { source: "/api/teardown", destination: `${DASHBOARD_HOST}/app/api/teardown` },
    ];
  },
};

module.exports = nextConfig;
