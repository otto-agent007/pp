import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig, {
  buildAllowedConnectSources,
  buildAllowedImageSources,
  buildContentSecurityPolicyReportOnly,
  buildLocalWhisperRewrites,
  buildSecurityHeaders,
} from "./next.config";

const appDir = dirname(fileURLToPath(import.meta.url));

describe("web Next config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("applies report-only browser security headers broadly", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");

    const entries = await nextConfig.headers?.();
    expect(entries).toEqual([
      {
        headers: buildSecurityHeaders(),
        source: "/(.*)",
      },
    ]);

    const headers = entries?.[0]?.headers ?? [];
    const headerNames = headers.map((header) => header.key);

    expect(headerNames).toContain("Content-Security-Policy-Report-Only");
    expect(headerNames).not.toContain("Content-Security-Policy");
    expect(headers).toContainEqual({
      key: "X-Content-Type-Options",
      value: "nosniff",
    });
    expect(headers).toContainEqual({
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    });
    expect(headers).toContainEqual({
      key: "X-Frame-Options",
      value: "DENY",
    });
    expect(headers).toContainEqual({
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    });
    expect(headers).toContainEqual({
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    });
    expect(headers).toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  });

  it("disables the X-Powered-By header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("keeps the CSP baseline report-only and compatible with portal media, QR, Stripe, and Next", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project-ref.supabase.co");

    const csp = buildContentSecurityPolicyReportOnly("production");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: blob: https://*.supabase.co https://project-ref.supabase.co");
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).toContain("connect-src 'self' https://*.supabase.co https://project-ref.supabase.co https://api.stripe.com https://checkout.stripe.com");
    expect(csp).toContain("frame-src 'self' https://checkout.stripe.com https://js.stripe.com");
    expect(csp).toContain("media-src 'self' blob: data: https://*.supabase.co https://project-ref.supabase.co");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("manifest-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).toContain("report-uri /api/csp-report");
  });

  it("allows local Whisper connections only in development", () => {
    expect(buildAllowedConnectSources("production")).not.toContain(
      "http://127.0.0.1:8765",
    );
    expect(buildAllowedConnectSources("production")).not.toContain(
      "http://localhost:8765",
    );
    expect(buildAllowedConnectSources("development")).toEqual(
      expect.arrayContaining([
        "http://127.0.0.1:8765",
        "http://localhost:8765",
      ]),
    );
  });

  it("uses only public Supabase origins and ignores invalid Supabase URL values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");

    expect(buildAllowedImageSources("production")).toEqual([
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co",
    ]);
    expect(buildAllowedConnectSources("production")).toEqual([
      "'self'",
      "https://*.supabase.co",
      "https://api.stripe.com",
      "https://checkout.stripe.com",
    ]);
  });

  it("disables unnecessary browser permissions for the web app", () => {
    const permissionsPolicy = buildSecurityHeaders("production").find(
      (header) => header.key === "Permissions-Policy",
    )?.value;

    expect(permissionsPolicy).toContain("camera=()");
    expect(permissionsPolicy).toContain("microphone=(self)");
    expect(permissionsPolicy).toContain("geolocation=()");
    expect(permissionsPolicy).toContain("payment=()");
    expect(permissionsPolicy).toContain("usb=()");
    expect(permissionsPolicy).toContain("bluetooth=()");
    expect(permissionsPolicy).toContain("accelerometer=()");
    expect(permissionsPolicy).toContain("gyroscope=()");
    expect(permissionsPolicy).toContain("magnetometer=()");
  });
});
