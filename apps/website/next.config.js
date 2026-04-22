/** @type {import('next').NextConfig} */
// Hosted on Vercel at agents.dcp.sa. The dashboard is mounted at /app/* via
// a cross-project rewrite (see vercel.json). Static export is intentionally
// removed so the Phase C `/api/rami/*` route handlers can run server-side.
const nextConfig = {
  trailingSlash: true,
};

module.exports = nextConfig;
