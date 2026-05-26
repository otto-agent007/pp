import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = dirname(fileURLToPath(import.meta.url));

export function buildLocalWhisperRewrites(nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv !== "development") {
    return [];
  }

  return [
    {
      destination: "http://127.0.0.1:8765/transcribe",
      source: "/api/transcribe",
    },
    {
      destination: "http://127.0.0.1:8765/health",
      source: "/api/whisper-health",
    },
  ];
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(appDir, "../.."),
  rewrites() {
    return Promise.resolve(buildLocalWhisperRewrites());
  },
  transpilePackages: [
    "@pest-patrol/api-client",
    "@pest-patrol/domain",
    "@pest-patrol/i18n",
    "@pest-patrol/ui",
    "@pest-patrol/ui-tokens",
    "@pest-patrol/types",
  ],
};

export default nextConfig;
