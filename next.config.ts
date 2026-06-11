import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./data/**/*", "./templates/**/*"],
  },
};

export default nextConfig;
