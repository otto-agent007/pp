import type {
  ChemicalLog,
  Job,
  TechnicianLicense,
  TechnicianLicenseBranch,
  TechnicianLicenseInput,
  TechnicianLicenseStatus,
  TechnicianLicenseType,
  TechnicianProfile,
} from "@pest-patrol/types";

export type TechnicianCredentialReadinessStatus =
  | "expiring_soon"
  | "ready"
  | "review_required";

export interface TechnicianCredentialStatus {
  activeCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  matchingLicenses: TechnicianLicense[];
  status: TechnicianCredentialReadinessStatus;
  summary: string;
}

export interface BranchCredentialSummary {
  branch2: TechnicianCredentialStatus;
  branch3: TechnicianCredentialStatus;
  general: TechnicianCredentialStatus;
  technician: Pick<TechnicianProfile, "display_name" | "email" | "id">;
}

export interface CredentialReadinessReview {
  matchingLicense: TechnicianLicense | null;
  severity: "info" | "warning" | "critical";
  status: TechnicianCredentialReadinessStatus;
  summary: string;
}

type NormalizedTechnicianLicenseInput = {
  branch: TechnicianLicenseBranch;
  expires_at: string | null;
  issuing_authority: string;
  license_number: string;
  license_type: TechnicianLicenseType;
  notes: string | null;
  status: TechnicianLicenseStatus;
  technician_id: string;
};

const licenseTypes: TechnicianLicenseType[] = [
  "applicator",
  "field_representative",
  "operator",
  "registered_company",
  "other",
];

const licenseBranches: TechnicianLicenseBranch[] = [
  "branch_2",
  "branch_3",
  "general",
];

const licenseStatuses: TechnicianLicenseStatus[] = [
  "active",
  "expired",
  "expiring_soon",
  "suspended",
  "unknown",
];

const expiringSoonDays = 45;

export const CHEMICAL_LOG_MISSING_TECHNICIAN_CREDENTIAL_COPY =
  "Technician credential cannot be verified because this chemical log does not include technician identity.";

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function assertOneOf<T extends string>(
  value: T,
  allowed: readonly T[],
  fieldName: string,
) {
  if (!allowed.includes(value)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
}

function normalizeDate(value?: string | null) {
  const normalized = normalizeOptional(value);

  if (!normalized) {
    return null;
  }

  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error("Expiration date must be a valid date");
  }

  return normalized;
}

function startOfDay(value: string) {
  const date = new Date(value);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function daysUntil(date: string, now: string) {
  return Math.floor(
    (startOfDay(date) - startOfDay(now)) / (24 * 60 * 60 * 1000),
  );
}

function isArchived(license: Pick<TechnicianLicense, "archived_at">) {
  return Boolean(license.archived_at);
}

function statusForLicense(
  license: TechnicianLicense,
  now: string,
): TechnicianCredentialReadinessStatus {
  if (isArchived(license)) return "review_required";
  if (license.status === "suspended" || license.status === "unknown") {
    return "review_required";
  }
  if (license.status === "expired") return "review_required";
  if (license.expires_at && daysUntil(license.expires_at, now) < 0) {
    return "review_required";
  }
  if (license.status === "expiring_soon") return "expiring_soon";
  if (
    license.expires_at &&
    daysUntil(license.expires_at, now) <= expiringSoonDays
  ) {
    return "expiring_soon";
  }

  return license.status === "active" ? "ready" : "review_required";
}

function readinessFromLicenses(
  licenses: TechnicianLicense[],
  now: string,
): CredentialReadinessReview {
  const status = getTechnicianCredentialStatus(licenses, now);

  return {
    matchingLicense: status.matchingLicenses[0] ?? null,
    severity:
      status.status === "ready"
        ? "info"
        : status.status === "expiring_soon"
          ? "warning"
          : "critical",
    status: status.status,
    summary: status.summary,
  };
}

export function validateTechnicianLicenseInput(
  input: TechnicianLicenseInput,
): NormalizedTechnicianLicenseInput {
  return {
    branch: assertOneOf(input.branch, licenseBranches, "Credential branch"),
    expires_at: normalizeDate(input.expires_at),
    issuing_authority: normalizeOptional(input.issuing_authority) ?? "spcb",
    license_number: requireNonEmpty(input.license_number, "License number"),
    license_type: assertOneOf(input.license_type, licenseTypes, "License type"),
    notes: normalizeOptional(input.notes),
    status: assertOneOf(
      input.status ?? "active",
      licenseStatuses,
      "License status",
    ),
    technician_id: requireNonEmpty(input.technician_id, "Technician"),
  };
}

export function getTechnicianCredentialStatus(
  licenses: readonly TechnicianLicense[],
  now = new Date().toISOString(),
): TechnicianCredentialStatus {
  const currentLicenses = licenses.filter((license) => !isArchived(license));
  const statuses = currentLicenses.map((license) =>
    statusForLicense(license, now),
  );
  const activeLicenses = currentLicenses.filter(
    (license, index) => statuses[index] === "ready",
  );
  const expiringLicenses = currentLicenses.filter(
    (license, index) => statuses[index] === "expiring_soon",
  );
  const expiredLicenses = currentLicenses.filter(
    (license, index) => statuses[index] === "review_required",
  );

  if (activeLicenses.length > 0) {
    return {
      activeCount: activeLicenses.length,
      expiredCount: expiredLicenses.length,
      expiringSoonCount: expiringLicenses.length,
      matchingLicenses: activeLicenses,
      status: "ready",
      summary: "credential ready",
    };
  }

  if (expiringLicenses.length > 0) {
    return {
      activeCount: 0,
      expiredCount: expiredLicenses.length,
      expiringSoonCount: expiringLicenses.length,
      matchingLicenses: expiringLicenses,
      status: "expiring_soon",
      summary: "expiration review",
    };
  }

  return {
    activeCount: 0,
    expiredCount: expiredLicenses.length,
    expiringSoonCount: 0,
    matchingLicenses: expiredLicenses,
    status: "review_required",
    summary: "license evidence missing",
  };
}

export function getBranchCredentialSummary(
  technician: Pick<TechnicianProfile, "display_name" | "email" | "id">,
  licenses: readonly TechnicianLicense[],
  now = new Date().toISOString(),
): BranchCredentialSummary {
  const technicianLicenses = licenses.filter(
    (license) => license.technician_id === technician.id,
  );

  return {
    branch2: getTechnicianCredentialStatus(
      technicianLicenses.filter((license) => license.branch === "branch_2"),
      now,
    ),
    branch3: getTechnicianCredentialStatus(
      technicianLicenses.filter((license) => license.branch === "branch_3"),
      now,
    ),
    general: getTechnicianCredentialStatus(
      technicianLicenses.filter((license) => license.branch === "general"),
      now,
    ),
    technician,
  };
}

export function getCredentialReadinessForJob(
  job: Pick<Job, "assigned_tech_id"> | null | undefined,
  licenses: readonly TechnicianLicense[],
  now = new Date().toISOString(),
): CredentialReadinessReview {
  if (!job?.assigned_tech_id) {
    return {
      matchingLicense: null,
      severity: "critical",
      status: "review_required",
      summary: "license evidence missing",
    };
  }

  return readinessFromLicenses(
    licenses.filter(
      (license) =>
        license.technician_id === job.assigned_tech_id &&
        (license.branch === "branch_2" || license.branch === "branch_3"),
    ),
    now,
  );
}

export function getChemicalLogCredentialReview(
  log: Pick<ChemicalLog, "job">,
  licenses: readonly TechnicianLicense[],
  now = new Date().toISOString(),
): CredentialReadinessReview {
  if (!log.job?.assigned_tech_id) {
    return {
      matchingLicense: null,
      severity: "critical",
      status: "review_required",
      summary: CHEMICAL_LOG_MISSING_TECHNICIAN_CREDENTIAL_COPY,
    };
  }

  return getCredentialReadinessForJob(log.job, licenses, now);
}

export function getWdoCredentialReview(
  job: Pick<Job, "assigned_tech_id"> | null | undefined,
  licenses: readonly TechnicianLicense[],
  now = new Date().toISOString(),
): CredentialReadinessReview {
  if (!job?.assigned_tech_id) {
    return {
      matchingLicense: null,
      severity: "critical",
      status: "review_required",
      summary: "credential review required",
    };
  }

  const review = readinessFromLicenses(
    licenses.filter(
      (license) =>
        license.technician_id === job.assigned_tech_id &&
        license.branch === "branch_3",
    ),
    now,
  );

  return review.status === "ready"
    ? { ...review, summary: "Branch 3 credential ready" }
    : { ...review, summary: "credential review required" };
}
