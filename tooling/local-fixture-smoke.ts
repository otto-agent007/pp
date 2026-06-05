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
  type APIResponse,
  type Page,
} from "@playwright/test";

interface CliOptions {
  baseUrl?: string;
  keepServer: boolean;
  port: number;
  preserveNextCache: boolean;
}

interface DomLink {
  disabled: boolean;
  formAction: string | null;
  href: string | null;
  tagName: string;
  text: string;
  type: string;
}

interface RouteFailure {
  routeId: string;
  stepLabel: string;
  viewport: string;
  errors: string[];
}

interface RouteResult {
  errors: string[];
  id: string;
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
  } catch {
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
  const lowerText = text.toLowerCase();
  const matches = localFixtureSmokeSensitivePatterns.filter((pattern) =>
    lowerText.includes(pattern.toLowerCase()),
  );

  return matches;
}

async function waitForRouteText(page: Page, expectedText: string[]) {
  for (const expected of expectedText) {
    const target = expected.toLowerCase();
    const deadline = Date.now() + 20_000;

    while (Date.now() < deadline) {
      const body = (await page.locator("body").innerText()).toLowerCase();
      if (body.includes(target)) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

async function collectVisibleDomLinks(page: Page): Promise<DomLink[]> {
  const selector =
    "a[href], button, [role='button'], input[type='button'], input[type='submit'], input[type='reset']";
  const elements = page.locator(selector);
  const visibleLinks: DomLink[] = [];
  const count = await elements.count();

  for (let index = 0; index < count; index += 1) {
    const element = elements.nth(index);

    if (!(await element.isVisible())) {
      continue;
    }

    const tagName = (await element.evaluate((node) => node.tagName.toUpperCase())) || "";
    const href = await element.getAttribute("href");
    const ariaLabel = await element.getAttribute("aria-label");
    const value = await element.inputValue().catch(() => null);
    const textContent = (await element.textContent()) || "";
    const textSource = ariaLabel || value || textContent;
    const text = textSource.replace(/\s+/g, " ").trim();

    if (!text) {
      continue;
    }

    const hasDisabledAttr =
      (await element.getAttribute("disabled")) !== null ||
      (await element.getAttribute("aria-disabled")) === "true";
    const isDisabled = hasDisabledAttr || (await element.isDisabled());
    const formAction = await element.getAttribute("formaction");
    const type =
      (await element.getAttribute("type")) ||
      (tagName === "A" ? "link" : "button");

    visibleLinks.push({
      disabled: Boolean(isDisabled),
      formAction,
      href,
      tagName,
      text,
      type,
    });
  }

  return visibleLinks;
}

function shouldIgnoreExternalProtocol(href: string) {
  return /^(mailto|tel|javascript):/i.test(href);
}

function isHashOnlyLink(href: string) {
  return href === "#" || href.startsWith("#");
}

function isInternalRouteLink(baseUrl: string, href: string) {
  const base = new URL(baseUrl);
  const resolved = new URL(href, base);

  if (resolved.origin !== base.origin) return false;
  if (shouldIgnoreExternalProtocol(href)) return false;
  if (isHashOnlyLink(href)) return false;

  const hasProtocol = /^[a-z][a-z\d+\-.]*:/i.test(href);
  if (!hasProtocol && href.startsWith("/")) return true;
  if (!hasProtocol) return false;

  return true;
}

function isTrackedInternalRoute(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const segments = normalized.split("/").filter(Boolean);

  if (segments.length === 0) {
    return true;
  }

  if (segments[0] === "portal") {
    return segments.length <= 2;
  }

  return segments.length === 1;
}

async function checkInternalLinks({
  baseUrl,
  candidate,
  page,
}: {
  baseUrl: string;
  candidate: DomLink[];
  page: Page;
}) {
  const errors: string[] = [];
  const base = new URL(baseUrl);
  const visited = new Set<string>();

  for (const link of candidate) {
    if (!link.href) continue;
    const href = link.href.trim();

    if (!isInternalRouteLink(baseUrl, href)) {
      continue;
    }

    const resolved = new URL(href, base);
    if (!isTrackedInternalRoute(resolved.pathname)) {
      continue;
    }

    const destination = resolved.pathname + resolved.search;
    if (visited.has(destination)) continue;
    visited.add(destination);

    let response: APIResponse | null = null;
    try {
      const cookies = await page.context().cookies(resolved.origin);
      const cookieHeader = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      response = await page.request.get(resolved.href, {
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      });
    } catch (error) {
      errors.push(`broken link ${link.href}: ${String(error)}`);
      continue;
    }

    if (response === null) {
      errors.push(`broken link ${link.href}: no response`);
      continue;
    }

    if (response.status() >= 400) {
      errors.push(`broken link ${link.href} -> HTTP ${response.status()}`);
      continue;
    }

    const body = await response.text().catch(() => "");
    if (body.trim().length === 0) {
      errors.push(`broken link ${link.href}: empty response`);
    }
  }

  return errors;
}

function progressionMatch(text: string, labels: string[]) {
  const normalizedText = text.toLowerCase();

  return labels.some(
    (label) =>
      normalizedText.includes(label.toLowerCase()) ||
      label.toLowerCase().includes(normalizedText),
  );
}

function checkDeadEndCtas({
  candidateLinks,
  baseUrl,
  ctaLabels,
}: {
  baseUrl: string;
  candidateLinks: DomLink[];
  ctaLabels: string[];
}) {
  if (ctaLabels.length === 0) {
    return null;
  }

  const base = new URL(baseUrl);
  const progressionCandidates = candidateLinks.filter((link) =>
    progressionMatch(link.text, ctaLabels),
  );

  if (progressionCandidates.length === 0) {
    return "missing primary CTA context for next-step progression";
  }

  const hasActionableCta = progressionCandidates.some((link) => {
    if (link.disabled) return false;

    if (link.tagName === "A" && link.href) {
      const href = link.href.trim();
      if (isHashOnlyLink(href) || shouldIgnoreExternalProtocol(href)) {
        return false;
      }

      if (/^(https?:)?\/\//i.test(href)) {
        try {
          const resolved = new URL(href, base);
          return resolved.origin === base.origin;
        } catch {
          return false;
        }
      }

      return href.startsWith("/") || href.startsWith("?") || href.startsWith(".");
    }

    const hasFormContext =
      typeof link.formAction === "string" && link.formAction.trim() !== "";
    if ((link.type || "").toLowerCase() === "submit" && !hasFormContext) {
      return false;
    }

    return true;
  });

  if (!hasActionableCta) {
    return "primary progression CTAs are disabled or non-interactive";
  }

  return null;
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
  const routeUrl = `${baseUrl}${route.path}`;

  const response = await page.goto(routeUrl, {
    waitUntil: "domcontentloaded",
  });
  if (response && !response.ok()) {
    errors.push(`route returned HTTP ${response.status()}`);
  }

  await waitForRouteText(page, route.expectedText);

  for (const expected of route.expectedText) {
    const body = await page.locator("body").innerText();
    if (!body.toLowerCase().includes(expected.toLowerCase())) {
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

  const domLinks = await collectVisibleDomLinks(page);

  const internalLinkErrors = await checkInternalLinks({
    baseUrl,
    candidate: domLinks,
    page,
  });
  errors.push(...internalLinkErrors);

  const deadEndReason = checkDeadEndCtas({
    baseUrl,
    candidateLinks: domLinks,
    ctaLabels: route.progressionCtaLabels,
  });
  if (deadEndReason) {
    errors.push(`${deadEndReason}: ${route.progressionCtaLabels.join(", ")}`);
  }

  return {
    errors,
    id: route.id,
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
      results.push(
        await smokeRoute({
          baseUrl,
          page,
          route,
          viewport: label,
        }),
      );
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
  const routeSummary = new Map<string, RouteFailure[]>();

  for (const result of results) {
    const group = routeSummary.get(result.label) ?? [];
    group.push({
      routeId: result.id,
      stepLabel: result.label,
      viewport: result.viewport,
      errors: result.errors,
    });
    routeSummary.set(result.label, group);
  }

  for (const [stepLabel, entries] of routeSummary) {
    const failedEntries = entries.filter((entry) => entry.errors.length > 0);

    if (failedEntries.length === 0) {
      console.log(`[pass] ${stepLabel}`);
      for (const entry of entries) {
        console.log(`  - ${entry.viewport}: OK`);
      }
      continue;
    }

    console.log(`[fail] ${stepLabel}`);
    for (const entry of failedEntries) {
      for (const error of entry.errors) {
        console.log(`  - ${entry.viewport}: ${error}`);
      }
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

    const routeFailures = routeResults
      .filter((result) => result.errors.length > 0)
      .map(
        (result) => `${result.label} [${result.viewport}]: ${result.errors.join(", ")}`,
      );
    const consoleErrors = [
      ...desktop.errors.map((error) => `1440x1000: ${error}`),
      ...narrow.errors.map((error) => `390x900: ${error}`),
    ];

    const groupedErrors = [...routeFailures, ...consoleErrors];

    if (groupedErrors.length > 0) {
      console.error("");
      console.error("Local fixture smoke failed.");
      for (const error of groupedErrors) {
        console.error(`- ${error}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log("");
    console.log(
      "Local fixture smoke passed: route signals rendered, no route/console/page errors, no horizontal overflow, no sensitive patterns, no broken internal links, and at least one actionable progression CTA per configured step.",
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
