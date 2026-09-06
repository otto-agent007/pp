import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type RlsBoundaryAuditSeverity = "error" | "warning";

export interface RlsBoundaryAuditFinding {
  code:
    | "anon_sensitive_grant"
    | "missing_rls_enablement"
    | "public_rpc_grant"
    | "sensitive_using_true";
  message: string;
  severity: RlsBoundaryAuditSeverity;
  source: string;
  table?: string;
}

export interface RlsBoundaryAuditSource {
  name: string;
  sql: string;
}

const sensitiveTables = [
  "profiles",
  "customers",
  "locations",
  "jobs",
  "job_media",
  "job_form_submissions",
  "form_templates",
  "chemical_inventory",
  "chemical_logs",
  "invoices",
  "invoice_line_items",
  "payments",
  "stripe_webhook_events",
  "notification_events",
  "notification_templates",
  "automation_rules",
  "automation_scheduler_runs",
  "customer_portal_access_tokens",
  "customer_portal_access_token_events",
  "customer_portal_sessions",
  "technician_licenses",
  "compliance_sources",
  "compliance_documents",
  "compliance_chunks",
  "compliance_advisory_audits",
  "job_location_events",
  "location_units",
  "job_unit_audit_items",
];

function normalizeSql(sql: string) {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function tablePattern(table: string) {
  return `(?:public\\.)?${table}`;
}

function mentionsTable(sql: string, table: string) {
  const pattern = new RegExp(
    `\\b(create\\s+table(?:\\s+if\\s+not\\s+exists)?|alter\\s+table|create\\s+policy|grant\\s+)\\s+(?:[^;]*?\\s+)?${tablePattern(table)}\\b`,
    "i",
  );

  return pattern.test(sql);
}

function hasRlsEnablement(sql: string, table: string) {
  return new RegExp(
    `\\balter\\s+table\\s+${tablePattern(table)}\\s+enable\\s+row\\s+level\\s+security\\b`,
    "i",
  ).test(sql);
}

function hasAnonGrant(sql: string, table: string) {
  return new RegExp(
    `\\bgrant\\s+[^;]*\\bon\\s+(?:table\\s+)?${tablePattern(table)}\\s+to\\s+(?:[^;]*,\\s*)?anon\\b`,
    "i",
  ).test(sql);
}

function hasUsingTruePolicy(sql: string, table: string) {
  return new RegExp(
    `\\bcreate\\s+policy\\b[^;]*\\bon\\s+${tablePattern(table)}\\b[^;]*\\busing\\s*\\(\\s*true\\s*\\)`,
    "i",
  ).test(sql);
}

function publicRpcGrants(sql: string) {
  return sql.match(
    /\bgrant\s+execute\s+on\s+function\s+public\.[^(;\s]+(?:\([^;]*?\))?\s+to\s+(?:[^;]*\b)?(?:anon|public)\b/gi,
  ) ?? [];
}

export function auditRlsBoundarySources(
  sources: RlsBoundaryAuditSource[],
): RlsBoundaryAuditFinding[] {
  const combinedSql = normalizeSql(sources.map((source) => source.sql).join("\n"));
  const findings: RlsBoundaryAuditFinding[] = [];

  for (const table of sensitiveTables) {
    if (mentionsTable(combinedSql, table) && !hasRlsEnablement(combinedSql, table)) {
      findings.push({
        code: "missing_rls_enablement",
        message: `${table} is referenced without static RLS enablement evidence`,
        severity: "warning",
        source: "combined migrations",
        table,
      });
    }

    if (hasAnonGrant(combinedSql, table)) {
      findings.push({
        code: "anon_sensitive_grant",
        message: `${table} appears to grant operational data access to anon`,
        severity: "error",
        source: "combined migrations",
        table,
      });
    }

    if (hasUsingTruePolicy(combinedSql, table)) {
      findings.push({
        code: "sensitive_using_true",
        message: `${table} has an unconditional using (true) policy`,
        severity: "error",
        source: "combined migrations",
        table,
      });
    }
  }

  for (const source of sources) {
    for (const grant of publicRpcGrants(normalizeSql(source.sql))) {
      findings.push({
        code: "public_rpc_grant",
        message: "Public RPC execute grants require explicit review",
        severity: "warning",
        source: `${source.name}: ${grant}`,
      });
    }
  }

  return findings;
}

export function readMigrationAuditSources(migrationsDir: string) {
  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => ({
      name: fileName,
      sql: readFileSync(join(migrationsDir, fileName), "utf8"),
    }));
}

export function auditRlsBoundaryDirectory(migrationsDir: string) {
  return auditRlsBoundarySources(readMigrationAuditSources(migrationsDir));
}
