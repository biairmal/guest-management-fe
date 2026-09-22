import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Same-origin proxy to the backend, so the browser never makes a
  // cross-origin call (the API has no CORS middleware).
  rewrites: async () => [
    {
      source: "/api/v1/:path*",
      destination: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/api/v1/:path*`,
    },
  ],
};

export default nextConfig;
