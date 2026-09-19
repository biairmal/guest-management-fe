import type { NextConfig } from "next";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // The backend sends no CORS headers, so the browser calls /api/v1/* on this
  // origin and Next proxies it.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiBaseUrl}/api/v1/:path*` }];
  },
};

export default nextConfig;
