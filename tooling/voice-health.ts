interface HealthResult {
  body?: unknown;
  error?: string;
  ok: boolean;
  status?: number;
  url: string;
}

function usage() {
  return [
    "Usage:",
    "  corepack pnpm voice:health",
    "  corepack pnpm voice:health -- --web-url http://127.0.0.1:3000",
    "",
    "Checks the Next development rewrite first, then the helper directly.",
  ].join("\n");
}

function parseArgs(argv: string[]) {
  let webUrl = "http://127.0.0.1:3000";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }

    if (arg === "--web-url") {
      if (!next) {
        throw new Error(`Missing value for --web-url.\n\n${usage()}`);
      }

      webUrl = next.replace(/\/$/, "");
      index += 1;
      continue;
    }

    throw new Error(`Unknown voice health argument: ${arg}\n\n${usage()}`);
  }

  return { webUrl };
}

async function check(url: string): Promise<HealthResult> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      body,
      ok: response.ok,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "request failed",
      ok: false,
      url,
    };
  }
}

function modelLabel(body: unknown) {
  if (body && typeof body === "object" && "model" in body) {
    return String((body as { model?: unknown }).model ?? "unknown");
  }

  return "unknown";
}

async function main() {
  const { webUrl } = parseArgs(process.argv.slice(2));
  const checks = [
    await check(`${webUrl}/api/whisper-health`),
    await check("http://127.0.0.1:8765/health"),
  ];
  const healthy = checks.find((result) => result.ok);

  if (healthy) {
    console.log(
      `Voice health: ok (${healthy.url}, model: ${modelLabel(healthy.body)})`,
    );
    return;
  }

  console.error("Voice health: unavailable");
  for (const result of checks) {
    const detail = result.status ? `HTTP ${result.status}` : result.error;
    console.error(`- ${result.url}: ${detail ?? "not reachable"}`);
  }
  console.error("");
  console.error(
    "Start the helper with `corepack pnpm voice:dev`, or start web + helper with `corepack pnpm dev:voice`.",
  );
  process.exitCode = 1;
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Voice health failed";
  console.error(message);
  process.exitCode = 1;
});
