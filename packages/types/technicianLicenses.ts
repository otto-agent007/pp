import type { ComplianceBranch } from "./compliance";
import type { TechnicianProfile } from "./technicians";

export type TechnicianLicenseType =
  | "applicator"
  | "field_representative"
  | "operator"
  | "registered_company"
  | "other";

export type TechnicianLicenseBranch = ComplianceBranch;

export type TechnicianLicenseStatus =
  | "active"
  | "expired"
  | "expiring_soon"
  | "suspended"
  | "unknown";

export interface TechnicianLicense {
  id: string;
  technician_id: string;
  license_type: TechnicianLicenseType;
  branch: TechnicianLicenseBranch;
  license_number: string;
  issuing_authority: string;
  status: TechnicianLicenseStatus;
  expires_at: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  technician?: TechnicianProfile | null;
}

export interface TechnicianLicenseInput {
  technician_id: string;
  license_type: TechnicianLicenseType;
  branch: TechnicianLicenseBranch;
  license_number: string;
  issuing_authority?: string | null;
  status?: TechnicianLicenseStatus;
  expires_at?: string | null;
  notes?: string | null;
}
