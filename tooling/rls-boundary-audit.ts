import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type RlsBoundaryAuditSeverity = "error" | "warning";

/**
 * Every finding this audit can raise, as a value rather than a type, so a test
 * can check each one is described in docs/RLS_BOUNDARY_AUDIT.md. That document
 * listed four rules while the audit raised five -- the rule added by
 * 20260910200000 never reached it -- which is the same drift the audit exists
 * to catch, one level up.
 */
export const rlsBoundaryAuditCodes = [
  "anon_sensitive_grant",
  "insert_policy_missing_author_stamp",
  "missing_rls_enablement",
  "personal_policy_missing_author_check",
  "policy_name_truncation_collision",
  "public_rpc_grant",
  "sensitive_using_true",
  "technician_policy_missing_status_check",
] as const;

export type RlsBoundaryAuditCode = (typeof rlsBoundaryAuditCodes)[number];

export interface RlsBoundaryAuditFinding {
  code: RlsBoundaryAuditCode;
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

/**
 * Tables whose rows are one person's personal record, and the column naming
 * that person.
 *
 * Reaching these through jobs.assigned_tech_id alone scopes them to whoever
 * holds the job *now*, so reassigning a job hands its new assignee the previous
 * one's rows. For job_location_events that is a named technician's GPS history.
 * A policy that reaches such a table through assignment has to constrain the
 * author column too.
 */
const personalRecordTables: Record<string, string> = {
  job_location_events: "recorded_by",
};

/**
 * Tables a technician writes, and the column that has to name the writer.
 *
 * job_id says which job a row belongs to, not who produced it, so without an
 * author column an abusive or mistaken write cannot be traced to a person.
 * chemical_logs went without one while its insert trigger moved inventory.
 * Only insert policies are checked: the matching read is usually meant to be
 * wider than the author, since an admin may write a row on a technician's
 * behalf.
 */
const authorStampedTables: Record<string, string> = {
  chemical_logs: "logged_by",
  job_location_events: "recorded_by",
  job_unit_audit_items: "audited_by",
};

function isInsertPolicy(statement: string) {
  return /\bfor\s+insert\b/i.test(statement);
}

/**
 * Postgres truncates identifiers at 63 bytes, silently and without warning.
 * Six policy names in this repo are already longer than that, so the name in
 * the migration file is not the name in the database. That is survivable while
 * the truncations stay distinct; two that collide would mean a `drop policy`
 * aimed at one policy removes another, or a `create policy` fails as a
 * duplicate. RLS policies are permissive and OR together, so the failure mode
 * is a weak policy left in force.
 */
const maxIdentifierBytes = 63;

function truncatedIdentifier(name: string) {
  return Buffer.from(name, "utf8")
    .subarray(0, maxIdentifierBytes)
    .toString("utf8");
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

  const effective = effectivePolicies(sources);
  const byTruncatedName = new Map<string, EffectivePolicy[]>();

  for (const policy of effective.values()) {
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

    const authorColumn = personalRecordTables[policy.table];

    if (
      authorColumn &&
      /assigned_tech_id/i.test(policy.statement) &&
      !new RegExp(`\\b${authorColumn}\\b`, "i").test(policy.statement)
    ) {
      findings.push({
        code: "personal_policy_missing_author_check",
        message: `${policy.table} policy "${policy.name}" reaches rows through assigned_tech_id without constraining ${authorColumn}, so reassigning a job exposes the previous assignee's rows`,
        severity: "error",
        source: policy.source,
        table: policy.table,
      });
    }

    const authorStamp = authorStampedTables[policy.table];

    if (
      authorStamp &&
      isInsertPolicy(policy.statement) &&
      /assigned_tech_id/i.test(policy.statement) &&
      !new RegExp(`\\b${authorStamp}\\b`, "i").test(policy.statement)
    ) {
      findings.push({
        code: "insert_policy_missing_author_stamp",
        message: `${policy.table} insert policy "${policy.name}" lets an assigned technician write a row without stamping ${authorStamp}, so the write cannot be traced to a person`,
        severity: "error",
        source: policy.source,
        table: policy.table,
      });
    }

    const key = `${policy.table}|${truncatedIdentifier(policy.name.toLowerCase())}`;
    byTruncatedName.set(key, [...(byTruncatedName.get(key) ?? []), policy]);
  }

  for (const [key, collided] of byTruncatedName) {
    if (collided.length < 2) {
      continue;
    }

    findings.push({
      code: "policy_name_truncation_collision",
      message: `${collided[0]?.table} policies ${collided
        .map((policy) => `"${policy.name}"`)
        .join(" and ")} both truncate to the same ${maxIdentifierBytes}-byte identifier, so the database cannot tell them apart`,
      severity: "error",
      source: collided.map((policy) => policy.source).join(", "),
      table: key.split("|")[0],
    });
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
