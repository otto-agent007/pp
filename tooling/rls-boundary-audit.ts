import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type RlsBoundaryAuditSeverity = "error" | "warning";

export interface RlsBoundaryAuditFinding {
  code:
    | "anon_sensitive_grant"
    | "missing_rls_enablement"
    | "public_rpc_grant"
    | "sensitive_using_true"
    | "technician_policy_missing_status_check";
  message: string;
  severity: RlsBoundaryAuditSeverity;
  source: string;
  table?: string;
}

export interface RlsBoundaryAuditSource {
  name: string;
  sql: string;
}

export interface EffectivePolicy {
  name: string;
  source: string;
  statement: string;
  table: string;
}

/**
 * The predicate that makes a technician branch respect profiles.status.
 *
 * private.has_admin_access() has enforced status since 2026-09-06, but the
 * technician branches keyed on jobs.assigned_tech_id alone until
 * 20260910200000_technician_status_boundary_v1, so a deactivated technician
 * kept every assigned job. Any future policy that reaches rows through
 * assigned_tech_id has to carry this predicate too.
 */
const activeProfilePredicate = "has_active_profile";

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

/** Strip comments and dollar-quoted function bodies, keeping statement order. */
function statementsOf(sql: string) {
  return sql
    .replace(/--.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const dropPolicyPattern =
  /^drop\s+policy\s+(?:if\s+exists\s+)?(?:"([^"]+)"|([a-z0-9_]+))\s+on\s+(?:([a-z0-9_]+)\.)?([a-z0-9_]+)/i;
const createPolicyPattern =
  /^create\s+policy\s+(?:"([^"]+)"|([a-z0-9_]+))\s+on\s+(?:([a-z0-9_]+)\.)?([a-z0-9_]+)/i;

/** `public` is implicit everywhere else in the audit, so drop it from the key. */
function qualifiedTable(schema: string | undefined, table: string) {
  const normalized = table.toLowerCase();

  return !schema || schema.toLowerCase() === "public"
    ? normalized
    : `${schema.toLowerCase()}.${normalized}`;
}

/**
 * The policy set a fresh database ends up with after replaying every migration.
 *
 * Auditing the concatenated SQL cannot answer this on its own: a policy that
 * was weak in 2026-05 and rewritten in 2026-09 still has its old, weak text
 * sitting in the older file. Replaying drop/create in filename order -- the
 * order Supabase applies them in -- leaves only the definition that is actually
 * live, which is the only one worth auditing.
 */
export function effectivePolicies(sources: RlsBoundaryAuditSource[]) {
  const policies = new Map<string, EffectivePolicy>();

  for (const source of sources) {
    for (const statement of statementsOf(source.sql)) {
      const dropped = dropPolicyPattern.exec(statement);

      if (dropped) {
        const name = (dropped[1] ?? dropped[2]) as string;
        const table = qualifiedTable(dropped[3], dropped[4] as string);
        policies.delete(`${table}|${name.toLowerCase()}`);
        continue;
      }

      const created = createPolicyPattern.exec(statement);

      if (!created) {
        continue;
      }

      const name = (created[1] ?? created[2]) as string;
      const table = qualifiedTable(created[3], created[4] as string);
      policies.set(`${table}|${name.toLowerCase()}`, {
        name,
        source: source.name,
        statement,
        table,
      });
    }
  }

  return policies;
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

  for (const policy of effectivePolicies(sources).values()) {
    if (
      /assigned_tech_id/i.test(policy.statement) &&
      !policy.statement.toLowerCase().includes(activeProfilePredicate)
    ) {
      findings.push({
        code: "technician_policy_missing_status_check",
        message: `${policy.table} policy "${policy.name}" reaches rows through assigned_tech_id without private.${activeProfilePredicate}(), so a deactivated technician keeps access`,
        severity: "error",
        source: policy.source,
        table: policy.table,
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
