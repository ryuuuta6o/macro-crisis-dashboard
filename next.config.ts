import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.8"],
};

export default nextConfig;
