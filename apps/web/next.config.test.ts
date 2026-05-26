import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import nextConfig, { buildLocalWhisperRewrites } from "./next.config";

const appDir = dirname(fileURLToPath(import.meta.url));

describe("web Next config", () => {
  it("keeps local Whisper proxy rewrites development-only", async () => {
    expect(buildLocalWhisperRewrites("production")).toEqual([]);
    expect(buildLocalWhisperRewrites("test")).toEqual([]);
    expect(buildLocalWhisperRewrites("development")).toEqual([
      {
        destination: "http://127.0.0.1:8765/transcribe",
        source: "/api/transcribe",
      },
      {
        destination: "http://127.0.0.1:8765/health",
        source: "/api/whisper-health",
      },
    ]);
  });

  it("preserves the typed monorepo config as the only web Next config", () => {
    expect(nextConfig.outputFileTracingRoot).toBeTruthy();
    expect(nextConfig.transpilePackages).toContain("@pest-patrol/domain");
    expect(existsSync(join(appDir, "next.config.js"))).toBe(false);
  });
});
