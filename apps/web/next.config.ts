import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(appDir, "../.."),
  transpilePackages: [
    "@pest-patrol/api-client",
    "@pest-patrol/domain",
    "@pest-patrol/i18n",
    "@pest-patrol/ui-tokens",
    "@pest-patrol/types",
  ],
};

export default nextConfig;
