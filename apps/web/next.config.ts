import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = dirname(fileURLToPath(import.meta.url));

type SecurityHeader = {
  key: string;
  value: string;
};

function uniqueSources(sources: string[]) {
  return Array.from(new Set(sources));
}

function getPublicSupabaseOrigin() {
  const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!publicSupabaseUrl) {
    return null;
  }

  try {
    return new URL(publicSupabaseUrl).origin;
  } catch {
    return null;
  }
}

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

export function buildAllowedConnectSources(nodeEnv = process.env.NODE_ENV) {
  const sources = [
    "'self'",
    "https://*.supabase.co",
    getPublicSupabaseOrigin(),
    "https://api.stripe.com",
    "https://checkout.stripe.com",
  ].filter((source): source is string => Boolean(source));

  if (nodeEnv === "development") {
    sources.push("http://127.0.0.1:8765", "http://localhost:8765");
  }

  return uniqueSources(sources);
}

export function buildAllowedImageSources(_nodeEnv = process.env.NODE_ENV) {
  return uniqueSources(
    [
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co",
      getPublicSupabaseOrigin(),
    ].filter((source): source is string => Boolean(source)),
  );
}

export const CSP_REPORT_PATH = "/api/csp-report";

export function buildContentSecurityPolicyReportOnly(
  nodeEnv = process.env.NODE_ENV,
) {
  const supabaseMediaSources = uniqueSources(
    [
      "https://*.supabase.co",
      getPublicSupabaseOrigin(),
    ].filter((source): source is string => Boolean(source)),
  );
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${buildAllowedImageSources().join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${buildAllowedConnectSources(nodeEnv).join(" ")}`,
    "frame-src 'self' https://checkout.stripe.com https://js.stripe.com",
    `media-src 'self' blob: data: ${supabaseMediaSources.join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    `report-uri ${CSP_REPORT_PATH}`,
  ];

  if (nodeEnv === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function buildSecurityHeaders(
  nodeEnv = process.env.NODE_ENV,
): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy-Report-Only",
      value: buildContentSecurityPolicyReportOnly(nodeEnv),
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        // The web app records audio itself via getUserMedia (useSpeechRecorder),
        // so the top-level document needs microphone access; cross-origin
        // embeds still get none.
        "microphone=(self)",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "bluetooth=()",
        "accelerometer=()",
        "gyroscope=()",
        "magnetometer=()",
      ].join(", "),
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin",
    },
    {
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
  ];
}

const nextConfig: NextConfig = {
  headers() {
    return Promise.resolve([
      {
        headers: buildSecurityHeaders(),
        source: "/(.*)",
      },
    ]);
  },
  outputFileTracingRoot: join(appDir, "../.."),
  poweredByHeader: false,
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
