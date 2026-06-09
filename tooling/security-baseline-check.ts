import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export interface SecurityFinding {
  file: string;
  rule: string;
  message: string;
}

const ignoredDirs = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

const secretPatterns = [
  {
    id: "stripe-live-key",
    regex: new RegExp("sk_" + "live_" + "(?!configured\\b)[A-Za-z0-9_=-]{8,}"),
  },
  {
    id: "stripe-test-key",
    regex: new RegExp("sk_" + "test_" + "(?!configured\\b)[A-Za-z0-9_=-]{8,}"),
  },
  {
    id: "supabase-secret-key",
    regex: new RegExp("sb_" + "secret_" + "[A-Za-z0-9_=-]{8,}"),
  },
  {
    id: "stripe-secret-env-assignment",
    regex: /STRIPE_SECRET_KEY[^\S\r\n]*=[^\S\r\n]*[^\s#][^\r\n]*/,
  },
  {
    id: "supabase-service-role-env-assignment",
    regex: /SUPABASE_SERVICE_ROLE_KEY[^\S\r\n]*=[^\S\r\n]*[^\s#][^\r\n]*/,
  },
];

function fileExtension(fileName: string) {
  const match = fileName.match(/(\.[^.]+)$/);

  return match?.[1] ?? "";
}

function isTextFile(fileName: string) {
  const name = basename(fileName);

  return name.startsWith(".env") || textExtensions.has(fileExtension(name));
}

function isEnvExample(fileName: string) {
  const name = basename(fileName);

  return name === ".env.example" || name.endsWith(".env.example");
}

function isEnvFile(fileName: string) {
  return basename(fileName).startsWith(".env");
}

function walk(root: string, current = root): string[] {
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(current, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirs.has(entry.name) ? [] : walk(root, fullPath);
    }

    return entry.isFile() && isTextFile(entry.name) ? [fullPath] : [];
  });
}

function toRepoPath(root: string, filePath: string) {
  return relative(root, filePath).split(sep).join("/");
}

function isSafeServiceRolePath(path: string) {
  return (
    path.startsWith("apps/web/app/api/") ||
    path.startsWith("tooling/") ||
    path.includes(".test.") ||
    path.endsWith("/server-auth.ts")
  );
}

function addFinding(
  findings: SecurityFinding[],
  file: string,
  rule: string,
  message: string,
) {
  findings.push({ file, rule, message });
}

function checkEnvFile(
  findings: SecurityFinding[],
  root: string,
  filePath: string,
  content: string,
) {
  const path = toRepoPath(root, filePath);

  if (isEnvFile(filePath) && !isEnvExample(filePath)) {
    addFinding(
      findings,
      path,
      "committed-env-file",
      "Committed env files are not allowed; keep only placeholder examples.",
    );
  }

  if (!isEnvFile(filePath)) {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (/^DEMO_SEED_ADMIN_PASSWORD\s*=\s*password\s*$/.test(trimmed)) {
      continue;
    }

    if (/password\s*=\s*[^\s#][^\r\n]*/i.test(trimmed)) {
      addFinding(
        findings,
        path,
        "password-env-assignment",
        "Env-like files must not commit password values.",
      );
    }
  }
}

function checkSecretLiterals(
  findings: SecurityFinding[],
  root: string,
  filePath: string,
  content: string,
) {
  const path = toRepoPath(root, filePath);

  if (isEnvExample(filePath) || path.includes(".test.")) {
    return;
  }

  for (const pattern of secretPatterns) {
    if (pattern.regex.test(content)) {
      addFinding(
        findings,
        path,
        pattern.id,
        "Secret-like literal detected; value redacted.",
      );
    }
  }
}

function checkServiceRoleBoundary(
  findings: SecurityFinding[],
  root: string,
  filePath: string,
  content: string,
) {
  const path = toRepoPath(root, filePath);
  const referencesServiceRoleEnv = content.includes("SUPABASE_SERVICE_ROLE_KEY");
  const referencesServiceRoleHelper = content.includes(
    "createServiceRoleSupabaseClient",
  );
  const isClientComponent = /^\s*["']use client["'];?/m.test(content);

  if ((referencesServiceRoleEnv || referencesServiceRoleHelper) && isClientComponent) {
    addFinding(
      findings,
      path,
      "client-service-role-reference",
      "Client components must not reference service-role env names or helpers.",
    );
  }

  if (referencesServiceRoleHelper && !isSafeServiceRolePath(path)) {
    addFinding(
      findings,
      path,
      "unsafe-service-role-reference",
      "Service-role references must stay in server API/lib files or operator tooling.",
    );
  }
}

function checkPortalLeakage(
  findings: SecurityFinding[],
  root: string,
  filePath: string,
  content: string,
) {
  const path = toRepoPath(root, filePath);

  if (path.includes("apps/web/app/api/portal/") && path.endsWith("route.ts")) {
    for (const line of content.split(/\r?\n/)) {
      if (/tokens\s*:/.test(line) && /(access_token|token_hash|portal_url|grant)/.test(line)) {
        addFinding(
          findings,
          path,
          "portal-list-token-leakage",
          "Portal token list responses must not return raw grants, hashes, or portal URLs.",
        );
      }
    }
  }

  if (
    path.startsWith("apps/web/app/portal/") &&
    /from\s+["'][^"']*(compliance|admin|server-auth|service-role)[^"']*["']/.test(
      content,
    )
  ) {
    addFinding(
      findings,
      path,
      "portal-admin-internal-import",
      "Customer portal pages must not import admin-only compliance or internal server modules.",
    );
  }
}

export function runSecurityBaseline(root = process.cwd()): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  if (!existsSync(join(root, "pnpm-lock.yaml"))) {
    addFinding(
      findings,
      "pnpm-lock.yaml",
      "missing-lockfile",
      "pnpm-lock.yaml is required for reproducible installs.",
    );
  }

  if (!existsSync(join(root, "apps/web/next.config.test.ts"))) {
    addFinding(
      findings,
      "apps/web/next.config.test.ts",
      "missing-next-config-test",
      "Next config coverage should remain present for security/header regressions.",
    );
  }

  for (const filePath of walk(root)) {
    const content = readFileSync(filePath, "utf8");

    checkEnvFile(findings, root, filePath, content);
    checkSecretLiterals(findings, root, filePath, content);
    checkServiceRoleBoundary(findings, root, filePath, content);
    checkPortalLeakage(findings, root, filePath, content);
  }

  return findings;
}

function printFindings(findings: SecurityFinding[]) {
  for (const finding of findings) {
    console.error(
      `[security-baseline] ${finding.rule} in ${finding.file}: ${finding.message}`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? process.cwd();
  const findings = runSecurityBaseline(root);

  if (findings.length > 0) {
    printFindings(findings);
    process.exitCode = 1;
  } else {
    console.log("Security baseline passed: no static guardrail findings.");
  }
}
