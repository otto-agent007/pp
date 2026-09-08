import type { Customer, Location, LocationUnit } from "./customers";
import type {
  JobBillingDisposition,
  JobEstimateStatus,
  JobPurpose,
  JobServiceCadence,
  ServiceBillingFamily,
  ServiceBillingOfferingId,
} from "./serviceBillingCatalog";
import type { UserProfile } from "./technicians";

export type JobStatus =
  | "scheduled"
  | "en_route"
  | "in_progress"
  | "completed"
  | "canceled";

export type JobUnitAuditStatus =
  | "inaccessible"
  | "pending"
  | "requires_follow_up"
  | "skipped"
  | "treated";

export interface Job {
  id: string;
  customer_id: string;
  location_id: string;
  assigned_tech_id: string | null;
  status: JobStatus;
  scheduled_start: string;
  scheduled_end: string | null;
  service_notes: string | null;
  job_purpose?: JobPurpose | null;
  service_offering_id?: ServiceBillingOfferingId | null;
  service_family?: ServiceBillingFamily | null;
  billing_disposition?: JobBillingDisposition | null;
  service_cadence?: JobServiceCadence | null;
  estimate_status?: JobEstimateStatus | null;
  parent_job_id?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  location?: Location;
  assigned_technician?: UserProfile | null;
  parent_job?: Job | null;
}

export interface JobInput {
  customer_id: string;
  location_id: string;
  assigned_tech_id?: string | null;
  scheduled_start: string;
  scheduled_end?: string | null;
  status?: JobStatus;
  service_notes?: string | null;
  job_purpose?: JobPurpose | null;
  service_offering_id?: ServiceBillingOfferingId | null;
  service_family?: ServiceBillingFamily | null;
  billing_disposition?: JobBillingDisposition | null;
  service_cadence?: JobServiceCadence | null;
  estimate_status?: JobEstimateStatus | null;
  parent_job_id?: string | null;
}

export interface JobUnitAuditItem {
  id: string;
  job_id: string;
  location_unit_id: string;
  status: JobUnitAuditStatus;
  evidence: Record<string, unknown>;
  notes: string | null;
  audited_by: string | null;
  audited_at: string | null;
  created_at: string;
  updated_at: string;
  job?: Job;
  location_unit?: LocationUnit;
}

export interface JobUnitAuditItemInput {
  audited_at?: string | null;
  evidence?: Record<string, unknown>;
  job_id: string;
  location_unit_id: string;
  notes?: string | null;
  status: JobUnitAuditStatus;
}
