import type { Job, JobInput } from "./jobs";
import type {
  JobBillingDisposition,
  ServiceBillingOfferingId,
} from "./serviceBillingCatalog";

export type EstimateConversionStatus =
  | "ready"
  | "blocked"
  | "already_converted";

export interface EstimateConversionInput {
  estimate_job_id: string;
  scheduled_start: string;
  scheduled_end?: string | null;
  assigned_tech_id?: string | null;
  service_offering_id?: ServiceBillingOfferingId | null;
  billing_disposition?: JobBillingDisposition | null;
  service_notes?: string | null;
  create_another_phase?: boolean;
}

export interface EstimateConversionReadiness {
  can_convert: boolean;
  status: EstimateConversionStatus;
  title: string;
  summary: string;
  reasons: string[];
  warnings: string[];
  existing_work_order_job_id?: string | null;
}

export interface EstimateConversionResult {
  estimate_job: Job;
  work_order_job: Job;
  reused_existing_work_order: boolean;
  warning?: string | null;
}

export interface WorkOrderConversionCandidate {
  estimate_job: Job;
  existing_work_order_job?: Job | null;
  readiness: EstimateConversionReadiness;
  default_input?: JobInput | null;
}
