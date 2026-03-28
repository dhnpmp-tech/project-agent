/** @type {import('next').NextConfig} */
const nextConfig = {
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
