import path from "node:path";
import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ?? "http://127.0.0.1:4214";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/auth/login",
        destination: `${BACKEND_URL}/auth/login`,
      },
      {
        source: "/auth/callback",
        destination: `${BACKEND_URL}/auth/callback`,
      },
      {
        source: "/auth/logout",
        destination: `${BACKEND_URL}/auth/logout`,
      },
    ];
  },
};

export default nextConfig;