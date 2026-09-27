import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@silakebap/shared"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      {
        source: "/socket.io/:path*",
        destination: `${apiOrigin}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
