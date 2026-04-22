/** @type {import('next').NextConfig} */
// basePath is read from NEXT_PUBLIC_BASE_PATH so local dev keeps working at
// `localhost:3000/` while production (Vercel) sets it to `/app` to nest the
// dashboard under `agents.dcp.sa/app/*`. The marketing site owns the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  basePath,
  eslint: {
    // Pre-existing lint errors in @project-agent/calendar-adapter imports
    // (ESLint import resolver does not pick up the workspace dist). The
    // module compiles and types check fine; skip lint during build.
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // Allow CORS for public booking API routes
        source: "/api/public/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.PUBLIC_WEBSITE_URL || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
