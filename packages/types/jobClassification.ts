import type {
  JobBillingDisposition,
  JobEstimateStatus,
  JobPurpose,
  JobServiceCadence,
  ServiceBillingFamily,
  ServiceBillingOfferingId,
} from "./serviceBillingCatalog";

export interface JobClassification {
  job_purpose: JobPurpose;
  service_offering_id: ServiceBillingOfferingId | null;
  service_family: ServiceBillingFamily | null;
  billing_disposition: JobBillingDisposition;
  service_cadence: JobServiceCadence;
  estimate_status: JobEstimateStatus;
  parent_job_id: string | null;
}
