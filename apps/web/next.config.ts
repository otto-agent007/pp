import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@pest-patrol/api-client",
    "@pest-patrol/domain",
    "@pest-patrol/i18n",
    "@pest-patrol/types",
  ],
};

export default nextConfig;
