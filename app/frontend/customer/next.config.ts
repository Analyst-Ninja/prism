import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@prism/ui"],
  reactStrictMode: true,
};

export default nextConfig;
