import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve, sep } from "node:path";

import {
  buildLocalFixtureSmokePlan,
  localFixtureSmokeSensitivePatterns,
  localFixtureSmokeStorageKeys,
} from "@pest-patrol/domain";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

interface CliOptions {
  baseUrl?: string;
  keepServer: boolean;
  port: number;
  preserveNextCache: boolean;
}

interface RouteResult {
  errors: string[];
  label: string;
  viewport: string;
}

const defaultPort = 3300;
const consoleErrorTypes = new Set(["error"]);
const envNamesToClear = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PORTAL_DELIVERY_WEBHOOK_URL",
  "PORTAL_DELIVERY_WEBHOOK_SECRET",
  "NOTIFICATION_DELIVERY_WEBHOOK_URL",
  "NOTIFICATION_DELIVERY_WEBHOOK_SECRET",
];

function usage() {
  return [
    "Usage:",
    "  corepack pnpm demo:fixture-smoke",
    "  corepack pnpm demo:fixture-smoke -- --port 3301",
    "  corepack pnpm demo:fixture-smoke -- --base-url http://127.0.0.1:3000 --keep-server",
    "  corepack pnpm demo:fixture-smoke -- --preserve-next-cache",
    "",
    "Runs a local no-env fixture browser smoke. Evidence is sanitized and",
    "tokened portal routes are printed only as `tokened /portal`.",
  ].join("\n");
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    keepServer: false,
    port: defaultPort,
    preserveNextCache: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    }

    if (arg === "--base-url") {
      if (!next) {
        throw new Error(`Missing value for --base-url.\n\n${usage()}`);
      }

      options.baseUrl = next.replace(/\/$/, "");
      index += 1;
      continue;
    }

    if (arg === "--keep-server") {
      options.keepServer = true;
      continue;
    }

    if (arg === "--preserve-next-cache") {
      options.preserveNextCache = true;
      continue;
    }

    if (arg === "--port") {
      if (!next) {
        throw new Error(`Missing value for --port.\n\n${usage()}`);
      }

      options.port = Number(next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown fixture smoke argument: ${arg}\n\n${usage()}`);
  }

  if (!Number.isInteger(options.port) || options.port < 1) {
    throw new Error(`Port must be a positive integer.\n\n${usage()}`);
  }

  return options;
}

function localFixtureEnv() {
  const env = { ...process.env };

  for (const name of envNamesToClear) {
    delete env[name];
  }

  env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-anon-key";
  env.VERCEL_ENV = "development";

  return env;
}

function clearNextDevCache() {
  const webRoot = resolve(process.cwd(), "apps", "web");
  const nextDir = resolve(webRoot, ".next");

  if (!nextDir.startsWith(`${webRoot}${sep}`)) {
    throw new Error(`Refusing to clear unexpected Next cache path: ${nextDir}`);
  }

  rmSync(nextDir, { force: true, recursive: true });
}

function startServer(port: number, preserveNextCache: boolean) {
  if (!preserveNextCache) {
    clearNextDevCache();
  }

  return spawn(
    "corepack",
    [
      "pnpm",
      "--dir",
      "apps/web",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: localFixtureEnv(),
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

async function waitForServer(baseUrl: string, server: ChildProcess | null) {
  const startedAt = Date.now();
  let lastError = "not reachable yet";

  while (Date.now() - startedAt < 180_000) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) {
      throw new Error(`Local fixture server exited before it was ready.`);
    }

    try {
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(2_000),
      });

      if (response.status < 500) {
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request failed";
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Local fixture server was not ready: ${lastError}`);
}

function stopServer(server: ChildProcess) {
  if (process.platform === "win32" && server.pid) {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  server.kill();
}

async function ensureDemoSession(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

  const demoButton = page.getByRole("button", { name: "Log in as demo" });

  if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click();
  }

  try {
    await page.waitForSelector("text=Dashboard overview", { timeout: 20_000 });
  } catch (error) {
    const bodyText = await page
      .locator("body")
      .innerText({ timeout: 2_000 })
      .catch(() => "");
    throw new Error(
      `Fixture demo session did not reach the dashboard. Visible text: ${bodyText
        .replace(/\s+/g, " ")
        .slice(0, 240)}`,
    );
  }
}

async function installFixtureStorage(context: BrowserContext, baseUrl: string) {
  await context.addInitScript((keys) => {
    try {
      for (const key of keys) {
        window.localStorage.setItem(key, "active");
      }
    } catch {
      // The smoke harness will fall back to the visible demo-login button.
    }
  }, localFixtureSmokeStorageKeys);

  await context.addCookies(
    localFixtureSmokeStorageKeys.map((key) => ({
      domain: "127.0.0.1",
      name: key,
      path: "/",
      value: "active",
    })),
  );

  const url = new URL(baseUrl);
  if (url.hostname === "localhost") {
    await context.addCookies(
      localFixtureSmokeStorageKeys.map((key) => ({
        domain: "localhost",
        name: key,
        path: "/",
        value: "active",
      })),
    );
  }
}

async function checkNoHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const documentElement = document.documentElement;

    return documentElement.scrollWidth <= documentElement.clientWidth + 1;
  });
}

async function checkNoSensitiveText(page: Page) {
  const text = await page.locator("body").innerText();
  const matches = localFixtureSmokeSensitivePatterns.filter((pattern) =>
    text.includes(pattern),
  );

  return matches;
}

async function smokeRoute({
  baseUrl,
  page,
  route,
  viewport,
}: {
  baseUrl: string;
  page: Page;
  route: ReturnType<typeof buildLocalFixtureSmokePlan>[number];
  viewport: string;
}): Promise<RouteResult> {
  const errors: string[] = [];
  const response = await page.goto(`${baseUrl}${route.path}`, {
    waitUntil: "domcontentloaded",
  });

  if (response && !response.ok()) {
    errors.push(`route returned HTTP ${response.status()}`);
  }

  await page
    .waitForFunction(
      (expectedText) =>
        expectedText.every((text) => document.body.innerText.includes(text)),
      route.expectedText,
      { timeout: 20_000 },
    )
    .catch(() => undefined);

  for (const expected of route.expectedText) {
    if (!(await page.locator("body").innerText()).includes(expected)) {
      errors.push(`missing expected text: ${expected}`);
    }
  }

  if (!(await checkNoHorizontalOverflow(page))) {
    errors.push("document has horizontal overflow");
  }

  const sensitiveMatches = await checkNoSensitiveText(page);
  if (sensitiveMatches.length > 0) {
    errors.push(`sensitive text rendered: ${sensitiveMatches.join(", ")}`);
  }

  return {
    errors,
    label: route.label,
    viewport,
  };
}

async function runViewport({
  baseUrl,
  browser,
  height,
  label,
  width,
}: {
  baseUrl: string;
  browser: Browser;
  height: number;
  label: string;
  width: number;
}) {
  const context = await browser.newContext({
    viewport: { height, width },
  });
  try {
    await installFixtureStorage(context, baseUrl);
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (message) => {
      if (
        message
          .text()
          .includes(
            "Failed to load resource: the server responded with a status of 404",
          )
      ) {
        return;
      }

      if (consoleErrorTypes.has(message.type())) {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await ensureDemoSession(page, baseUrl);

    const results: RouteResult[] = [];
    for (const route of buildLocalFixtureSmokePlan()) {
      results.push(await smokeRoute({ baseUrl, page, route, viewport: label }));
    }

    return {
      errors: [
        ...consoleErrors.map((error) => `console error: ${error}`),
        ...pageErrors.map((error) => `page error: ${error}`),
      ],
      results,
    };
  } finally {
    await context.close();
  }
}

function printResults(results: RouteResult[]) {
  for (const result of results) {
    if (result.errors.length === 0) {
      console.log(`[pass] ${result.viewport} ${result.label}`);
      continue;
    }

    console.log(`[fail] ${result.viewport} ${result.label}`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }
}

async function launchSmokeBrowser() {
  if (process.platform === "win32") {
    try {
      return await chromium.launch({ channel: "msedge", headless: true });
    } catch {
      return chromium.launch({ headless: true });
    }
  }

  return chromium.launch({ headless: true });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = options.baseUrl ?? `http://127.0.0.1:${options.port}`;
  const server = options.baseUrl
    ? null
    : startServer(options.port, options.preserveNextCache);

  server?.stdout?.on("data", (chunk) => {
    const line = String(chunk).trim();
    if (line) {
      console.log(`[fixture-server] ${line}`);
    }
  });
  server?.stderr?.on("data", (chunk) => {
    const line = String(chunk).trim();
    if (line) {
      console.error(`[fixture-server] ${line}`);
    }
  });

  let browser: Browser | null = null;

  try {
    await waitForServer(baseUrl, server);
    browser = await launchSmokeBrowser();
    const desktop = await runViewport({
      baseUrl,
      browser,
      height: 1000,
      label: "1440x1000",
      width: 1440,
    });
    const narrow = await runViewport({
      baseUrl,
      browser,
      height: 900,
      label: "390x900",
      width: 390,
    });
    await browser.close();
    browser = null;

    const routeResults = [...desktop.results, ...narrow.results];
    printResults(routeResults);

    const errors = [
      ...routeResults.flatMap((result) =>
        result.errors.map(
          (error) => `${result.viewport} ${result.label}: ${error}`,
        ),
      ),
      ...desktop.errors.map((error) => `1440x1000: ${error}`),
      ...narrow.errors.map((error) => `390x900: ${error}`),
    ];

    if (errors.length > 0) {
      console.error("");
      console.error("Local fixture smoke failed.");
      for (const error of errors) {
        console.error(`- ${error}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("");
    console.log(
      "Local fixture smoke passed: route signals rendered, no page/console errors, no horizontal overflow, no sensitive patterns found.",
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    if (server && !options.keepServer) {
      stopServer(server);
    }
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "Local fixture smoke failed";
  console.error(message);
  process.exitCode = 1;
});
