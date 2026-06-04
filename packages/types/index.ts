export type UserRole = "admin" | "dispatcher" | "technician";

export type TechnicianStatus = "active" | "inactive";

export type JobStatus =
  | "scheduled"
  | "en_route"
  | "in_progress"
  | "completed"
  | "canceled";

export type CustomerStatus = "active" | "archived";

export type PropertyType = "residential" | "commercial" | "other";

export type InventoryStatus = "active" | "archived";

export type InventoryUnit = "oz" | "gal" | "lb" | "each";

export type OfflineQueueAction =
  | "form_submission_create"
  | "job_status_update"
  | "chemical_log_create"
  | "photo_upload"
  | "signature_capture"
  | "geofence_event_create";

export type OfflineQueueStatus = "queued" | "retrying" | "failed" | "synced";

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select";

export type FormTemplateStatus = "active" | "archived";

export type FormValue = string | number | boolean | null;

export type JobMediaType = "photo" | "signature";

export type JobGeofenceEventType = "arrival" | "departure";

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export type PaymentStatus = "pending" | "succeeded" | "failed";

export type PaymentProvider = "stripe";

export type PaymentWebhookReconciliationStatus = "processed" | "ignored";

export type DemoSeedAction = "dry_run" | "seed" | "reset";
export type DemoSeedTarget = "local" | "preview";

export interface DemoSeedSummary {
  admin_users: number;
  chemical_logs: number;
  customers: number;
  form_submissions: number;
  inventory_items: number;
  invoices: number;
  jobs: number;
  locations: number;
  media_items: number;
  payments: number;
  technicians: number;
}

export interface DemoSeedRuntimeStatus {
  available: boolean;
  environment_label: string;
  reason: string | null;
  target: DemoSeedTarget;
}

export interface DemoSeedStatusResponse {
  status: DemoSeedRuntimeStatus;
  summary: DemoSeedSummary;
}

export interface DemoSeedActionInput {
  action: DemoSeedAction;
  confirm?: string;
  target: DemoSeedTarget;
}

export interface DemoSeedActionResponse {
  action: DemoSeedAction;
  result:
    | DemoSeedSummary
    | {
        reset: Partial<DemoSeedSummary>;
        seed: Partial<DemoSeedSummary>;
      };
  status: DemoSeedRuntimeStatus;
  summary: DemoSeedSummary;
}

export type CustomerPortalAccessStatus = "active" | "revoked";
export type CustomerPortalAccessEventKind =
  | "generated"
  | "opened"
  | "revoked"
  | "send_requested"
  | "send_succeeded"
  | "send_failed";
export type CustomerPortalDeliveryProvider = "manual" | "webhook";
export type CustomerPortalUpgradePlanId = "general_pest_recurring";
export type CustomerPortalUpgradeIntentStatus =
  | "requested"
  | "already_requested";

export type AutomationRuleType =
  | "follow_up_reminder"
  | "recurring_service_prompt";

export type AutomationRuleStatus = "active" | "paused" | "archived";

export type NotificationEventStatus = "pending" | "handled" | "dismissed";

export type NotificationTemplateStatus = "active" | "archived";

export type NotificationDeliveryStatus =
  | "not_sent"
  | "sending"
  | "sent"
  | "failed";

export type NotificationDeliveryProvider = "manual" | "webhook";

export type ComplianceJurisdiction = "california" | "federal";

export type ComplianceAuthority = "cdpr" | "epa" | "spcb" | "internal";

export type ComplianceWorkflow =
  | "chemical_application"
  | "multi_unit_audit"
  | "recurring_route"
  | "wdo_branch3";

export type ComplianceBranch = "branch_2" | "branch_3" | "general";

export type ComplianceReviewStatus = "draft" | "reviewed" | "archived";

export type ComplianceFindingSeverity = "info" | "warning" | "critical";

export type ComplianceAdvisoryStatus =
  | "advisory_ready"
  | "insufficient_sources"
  | "rag_disabled";

export type ComplianceSetupStatus = "ready" | "schema_unavailable";

export type ComplianceRequiredFieldStatus = "missing" | "present" | "unknown";

export type LocationUnitStatus = "active" | "archived";

export type LocationUnitAreaType =
  | "common_area"
  | "exterior"
  | "other"
  | "unit";

export type JobUnitAuditStatus =
  | "inaccessible"
  | "pending"
  | "requires_follow_up"
  | "skipped"
  | "treated";

export type AutomationSchedulerRunStatus = "success" | "failed";

export type AutomationSchedulerRunTrigger = "cron" | "manual";

export interface UserProfile {
  id: string;
  role: UserRole;
  email?: string | null;
  display_name?: string | null;
  status?: TechnicianStatus;
  created_at: string;
  updated_at: string;
}

export interface TechnicianProfile extends UserProfile {
  role: "technician";
  email: string | null;
  display_name: string | null;
  status: TechnicianStatus;
}

export interface TechnicianInviteInput {
  email: string;
  display_name?: string | null;
}

export interface TechnicianInviteResult {
  technician: TechnicianProfile;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  property_type: PropertyType;
  service_notes: string | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
  locations?: Location[];
}

export interface Location {
  id: string;
  customer_id: string;
  address: string;
  nickname: string | null;
  service_notes: string | null;
  is_primary: boolean;
  latitude?: number | null;
  longitude?: number | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface CustomerLocationInput {
  id?: string;
  address: string;
  nickname?: string | null;
  service_notes?: string | null;
  is_primary?: boolean;
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  property_type: PropertyType;
  service_notes?: string | null;
  locations: CustomerLocationInput[];
}

export interface Job {
  id: string;
  customer_id: string;
  location_id: string;
  assigned_tech_id: string | null;
  status: JobStatus;
  scheduled_start: string;
  scheduled_end: string | null;
  service_notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  location?: Location;
  assigned_technician?: UserProfile | null;
}

export interface JobInput {
  customer_id: string;
  location_id: string;
  assigned_tech_id?: string | null;
  scheduled_start: string;
  scheduled_end?: string | null;
  status?: JobStatus;
  service_notes?: string | null;
}

export interface JobStatusUpdateQueuePayload extends Record<string, unknown> {
  job_id: string;
  status: JobStatus;
  previous_status?: JobStatus;
}

export interface JobGeofenceEvent {
  id: string;
  job_id: string;
  event_type: JobGeofenceEventType;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  distance_m: number | null;
  within_radius: boolean | null;
  recorded_by: string | null;
  client_event_id: string;
  captured_at: string;
  created_at: string;
  job?: Job;
}

export interface JobGeofenceEventInput extends Record<string, unknown> {
  job_id: string;
  event_type: JobGeofenceEventType;
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  distance_m?: number | null;
  within_radius?: boolean | null;
  client_event_id: string;
  captured_at: string;
}

export interface JobGeofenceEventQueuePayload extends Record<string, unknown> {
  job_id: string;
  event_type: JobGeofenceEventType;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  distance_m: number | null;
  within_radius: boolean | null;
  client_event_id: string;
  captured_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  total_cents: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  job_id: string;
  customer_id: string;
  status: InvoiceStatus;
  currency: string;
  subtotal_cents: number;
  total_cents: number;
  due_date: string | null;
  notes: string | null;
  payment_url: string | null;
  stripe_payment_link_id: string | null;
  created_at: string;
  updated_at: string;
  job?: Job;
  customer?: Customer;
  line_items?: InvoiceLineItem[];
  payments?: PaymentRecord[];
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unit_amount_cents: number;
}

export interface InvoiceInput {
  job_id: string;
  customer_id: string;
  currency?: string | null;
  due_date?: string | null;
  notes?: string | null;
  line_items: InvoiceLineItemInput[];
}

export type ServiceBillingFamily =
  | "general_pest"
  | "recurring_general_pest"
  | "termite_wdo"
  | "rodent_attic"
  | "bed_bug"
  | "commercial"
  | "hoa_property_management"
  | "bird_gopher"
  | "green_diy"
  | "other";

export type ServiceBillingOfferingId =
  | "general_pest_initial"
  | "general_pest_monthly"
  | "general_pest_bimonthly"
  | "general_pest_quarterly"
  | "ant_control"
  | "bee_wasp_control"
  | "cockroach_control"
  | "earwig_control"
  | "flea_control"
  | "silverfish_control"
  | "spider_control"
  | "bed_bug_inspection"
  | "bed_bug_treatment"
  | "termite_inspection"
  | "termite_fumigation"
  | "termite_localized_treatment"
  | "termite_repair"
  | "wdo_escrow_inspection"
  | "escrow_clearance_document"
  | "rodent_inspection"
  | "rodent_exclusion"
  | "attic_cleanup_sanitation"
  | "insulation_removal"
  | "re_insulation"
  | "gopher_control"
  | "bird_removal"
  | "bird_exclusion"
  | "commercial_single_site"
  | "commercial_multi_site"
  | "hoa_common_area"
  | "property_management_unit_service"
  | "green_pest_treatment"
  | "diy_consultation"
  | "other_service";

export interface ServiceBillingLineItemTemplate {
  description: string;
  quantity: number;
}

export interface ServiceBillingPromotionSuggestion {
  id: string;
  label: string;
  reviewCopy: string;
  searchTerms: string[];
  summary: string;
}

export interface ServiceBillingOffering {
  closeoutGuidance: string[];
  customerSafeDescription: string;
  family: ServiceBillingFamily;
  id: ServiceBillingOfferingId;
  internalBillingGuidance: string;
  label: string;
  pestTags: string[];
  portalSafeSummary: string;
  promotionSuggestions: ServiceBillingPromotionSuggestion[];
  searchTerms: string[];
  serviceTags: string[];
  shortLabel: string;
  suggestedLineItems: ServiceBillingLineItemTemplate[];
  suggestedNotes: string[];
}

export interface ServiceBillingInferenceResult {
  confidence: "fallback" | "high" | "medium";
  matchedTerms: string[];
  offering: ServiceBillingOffering;
  sourceSummary: string;
}

export interface ServiceBillingGuidance {
  family: ServiceBillingFamily;
  items: string[];
  label: string;
  offeringId: ServiceBillingOfferingId;
  summary: string;
}

export interface InvoicePaymentLinkInput {
  invoice_id: string;
}

export interface InvoicePaymentLinkResult {
  provider: PaymentProvider;
  provider_payment_link_id: string;
  payment_url: string;
}

export interface PaymentRecord {
  id: string;
  invoice_id: string;
  provider: PaymentProvider;
  provider_payment_id: string | null;
  status: PaymentStatus;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  invoice?: Invoice;
}

export interface PaymentWebhookReconciliationResult {
  status: PaymentWebhookReconciliationStatus;
  invoice_id: string | null;
  payment_id: string | null;
  message: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  type: AutomationRuleType;
  status: AutomationRuleStatus;
  template_id: string | null;
  offset_days: number | null;
  message: string | null;
  created_at: string;
  updated_at: string;
  template?: NotificationTemplate | null;
}

export interface AutomationRuleInput {
  name: string;
  type: AutomationRuleType;
  template_id?: string | null;
  offset_days?: number | null;
  message?: string | null;
}

export interface NotificationEvent {
  id: string;
  rule_id: string | null;
  type: AutomationRuleType;
  generated_key: string | null;
  customer_id: string | null;
  job_id: string | null;
  status: NotificationEventStatus;
  title: string;
  message: string | null;
  due_at: string;
  handled_at: string | null;
  delivery_status: NotificationDeliveryStatus;
  delivery_provider: NotificationDeliveryProvider | null;
  provider_message_id: string | null;
  delivery_attempts: number;
  last_delivery_attempted_at: string | null;
  delivered_at: string | null;
  last_delivery_error: string | null;
  created_at: string;
  updated_at: string;
  rule?: AutomationRule | null;
  customer?: Customer | null;
  job?: Job | null;
}

export interface NotificationEventInput {
  rule_id?: string | null;
  type: AutomationRuleType;
  generated_key?: string | null;
  customer_id?: string | null;
  job_id?: string | null;
  title: string;
  message?: string | null;
  due_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: AutomationRuleType;
  status: NotificationTemplateStatus;
  title: string;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplateInput {
  name: string;
  type: AutomationRuleType;
  title: string;
  message?: string | null;
}

export interface NotificationDeliveryResult {
  event: NotificationEvent;
  provider: NotificationDeliveryProvider;
  provider_message_id: string | null;
}

export interface NotificationDeliveryProviderPayload {
  event: {
    id: string;
    type: AutomationRuleType;
    title: string;
    message: string | null;
    due_at: string;
    status: NotificationEventStatus;
    delivery_status: NotificationDeliveryStatus;
    customer_id: string | null;
    job_id: string | null;
    generated_key: string | null;
  };
  target: {
    customer_id: string | null;
    job_id: string | null;
    location_id: string | null;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  job: {
    id: string;
    status: JobStatus;
    scheduled_start: string;
    scheduled_end: string | null;
  } | null;
  location: {
    id: string;
    address: string;
    nickname: string | null;
  } | null;
}

export interface NotificationProviderStatus {
  provider: NotificationDeliveryProvider;
  webhook_configured: boolean;
  webhook_secret_configured: boolean;
}

export interface CustomerPortalProviderStatus {
  provider: CustomerPortalDeliveryProvider;
  webhook_configured: boolean;
  webhook_secret_configured: boolean;
}

export interface AutomationSchedulerResult {
  created: number;
  skipped_duplicates: number;
  evaluated_rules: number;
  evaluated_jobs: number;
}

export interface AutomationSchedulerRun {
  id: string;
  status: AutomationSchedulerRunStatus;
  triggered_by: AutomationSchedulerRunTrigger;
  triggered_by_user_id: string | null;
  started_at: string;
  finished_at: string;
  created_count: number;
  skipped_duplicate_count: number;
  evaluated_rule_count: number;
  evaluated_job_count: number;
  error_message: string | null;
}

export interface ChemicalInventoryItem {
  id: string;
  name: string;
  epa_number: string | null;
  current_stock: number;
  unit: InventoryUnit;
  reorder_level: number | null;
  status: InventoryStatus;
  created_at: string;
  updated_at: string;
}

export interface ChemicalInventoryInput {
  name: string;
  epa_number?: string | null;
  current_stock: number;
  unit: InventoryUnit;
  reorder_level?: number | null;
}

export interface ChemicalLog {
  id: string;
  job_id: string;
  chemical_id: string;
  amount_used: number;
  notes: string | null;
  created_at: string;
  chemical?: ChemicalInventoryItem;
  job?: Job;
}

export interface ChemicalLogInput {
  job_id: string;
  chemical_id: string;
  amount_used: number;
  notes?: string | null;
}

export interface ChemicalLogQueuePayload extends Record<string, unknown> {
  job_id: string;
  chemical_id: string;
  amount_used: number;
  notes?: string | null;
}

export interface JobMedia {
  id: string;
  job_id: string;
  media_type: JobMediaType;
  storage_bucket: string;
  storage_path: string;
  signed_url?: string | null;
  description: string | null;
  uploaded_by: string | null;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
  job?: Job;
}

export interface JobMediaInput {
  job_id: string;
  media_type: JobMediaType;
  storage_bucket: string;
  storage_path: string;
  description?: string | null;
  captured_at?: string | null;
}

export interface JobCloseoutReview {
  job: Job;
  form_submissions: JobFormSubmission[];
  chemical_logs: ChemicalLog[];
  media: JobMedia[];
  photos: JobMedia[];
  signatures: JobMedia[];
}

export interface CloseoutCaptureSummary {
  chemicalLogs: number;
  forms: number;
  jobId: string;
  photos: number;
  signatures: number;
}

export interface CustomerPortalCustomer {
  id: string;
  name: string;
}

export interface CustomerPortalLocation {
  id: string;
  address: string;
  nickname: string | null;
}

export interface CustomerPortalJob {
  id: string;
  customer_id: string;
  location_id: string;
  status: "completed";
  scheduled_start: string;
  scheduled_end: string | null;
  customer?: CustomerPortalCustomer;
  location?: CustomerPortalLocation;
}

export interface CustomerPortalFormSubmission {
  id: string;
  job_id: string;
  form_data: JobFormData;
  submitted_at: string;
  template?: FormTemplate;
}

export interface CustomerPortalMedia {
  id: string;
  job_id: string;
  media_type: JobMediaType;
  signed_url?: string | null;
  description: string | null;
  captured_at: string | null;
}

export interface CustomerPortalCloseout {
  job: CustomerPortalJob;
  form_submissions: CustomerPortalFormSubmission[];
  photos: CustomerPortalMedia[];
  signatures: CustomerPortalMedia[];
}

export type CustomerPortalInvoiceStatus = "open" | "paid";

export interface CustomerPortalInvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  total_cents: number;
}

export interface CustomerPortalInvoice {
  id: string;
  job_id: string;
  status: CustomerPortalInvoiceStatus;
  currency: string;
  total_cents: number;
  balance_cents: number;
  due_date: string | null;
  payment_url: string | null;
  paid_at: string | null;
  created_at: string;
  job?: CustomerPortalJob;
  line_items: CustomerPortalInvoiceLineItem[];
}

export interface CustomerPortalAccessToken {
  id: string;
  customer_id: string;
  token_hash: string;
  status: CustomerPortalAccessStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPortalAccessTokenSummary {
  id: string;
  customer_id: string;
  status: CustomerPortalAccessStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPortalAccessTokenEventSummary {
  id: string;
  token_id: string;
  customer_id: string;
  kind: CustomerPortalAccessEventKind;
  occurred_at: string;
}

export interface CustomerPortalAccessInput {
  customer_id: string;
  expires_at?: string | null;
}

export interface CustomerPortalAccessGrant {
  customer_id: string;
  access_token: string;
  expires_at: string | null;
  token_id: string;
  portal_url: string;
}

export interface CustomerPortalSendInput {
  customer_id: string;
  token_id: string;
  portal_url: string;
}

export interface CustomerPortalSendResult {
  provider: "webhook";
  status: "requested";
}

export interface CustomerPortalUpgradeIntentInput {
  plan_id: CustomerPortalUpgradePlanId;
}

export interface CustomerPortalUpgradeIntentRequest
  extends CustomerPortalUpgradeIntentInput {
  access_token: string;
}

export interface CustomerPortalUpgradeIntentResult {
  notification_id: string | null;
  plan_id: CustomerPortalUpgradePlanId;
  status: CustomerPortalUpgradeIntentStatus;
}

export interface CustomerPortalSendProviderPayload {
  portal_access: {
    customer_id: string;
    token_id: string;
    portal_url: string;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export interface CustomerPortalCloseoutResponse {
  closeouts: CustomerPortalCloseout[];
}

export interface CustomerPortalBillingResponse {
  invoices: CustomerPortalInvoice[];
}

export interface CustomerPortalAccessTokenListResponse {
  tokens: CustomerPortalAccessTokenSummary[];
}

export interface CustomerPortalAccessTokenEventListResponse {
  events: CustomerPortalAccessTokenEventSummary[];
  truncated_before: string | null;
}

export interface JobPhotoUploadQueuePayload extends Record<string, unknown> {
  job_id: string;
  local_uri: string;
  file_name: string;
  content_type: string;
  storage_bucket: string;
  storage_path: string;
  description?: string | null;
  captured_at?: string | null;
}

export interface JobSignatureCaptureQueuePayload extends Record<
  string,
  unknown
> {
  job_id: string;
  local_uri: string;
  file_name: string;
  content_type: string;
  storage_bucket: string;
  storage_path: string;
  signer_name?: string | null;
  captured_at?: string | null;
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: FormFieldOption[];
  placeholder?: string;
}

export interface FormTemplateSchema {
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  name: string;
  version: number;
  schema: FormTemplateSchema;
  status: FormTemplateStatus;
  created_at: string;
  updated_at: string;
}

export interface FormTemplateInput {
  name: string;
  version?: number;
  schema: FormTemplateSchema;
  status?: FormTemplateStatus;
}

export interface JobFormData {
  [fieldId: string]: FormValue;
}

export interface JobFormSubmission {
  id: string;
  job_id: string;
  template_id: string;
  form_data: JobFormData;
  submitted_by: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  template?: FormTemplate;
  job?: Job;
}

export interface JobFormSubmissionInput {
  job_id: string;
  template_id: string;
  form_data: JobFormData;
}

export interface FormSubmissionQueuePayload extends Record<string, unknown> {
  job_id: string;
  template_id: string;
  form_data: JobFormData;
}

export interface FormDraft {
  job_id: string;
  template_id: string;
  values: JobFormData;
  updated_at: string;
  queued_at: string | null;
}

export interface ComplianceSource {
  id: string;
  title: string;
  url: string;
  jurisdiction: ComplianceJurisdiction;
  authority: ComplianceAuthority;
  workflow: ComplianceWorkflow;
  branch: ComplianceBranch;
  effective_date: string | null;
  retrieved_at: string;
  source_hash: string;
  review_status: ComplianceReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface ComplianceDocument {
  id: string;
  source_id: string;
  title: string;
  document_url: string;
  content_type: string;
  retrieved_at: string;
  source_hash: string;
  review_status: ComplianceReviewStatus;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
  source?: ComplianceSource;
}

export interface ComplianceChunk {
  id: string;
  source_id: string;
  document_id: string;
  chunk_index: number;
  heading: string | null;
  content: string;
  tokens_estimate: number | null;
  metadata: Record<string, unknown>;
  similarity?: number | null;
  created_at: string;
  updated_at: string;
  document?: ComplianceDocument;
  source?: ComplianceSource;
}

export interface ComplianceCitation {
  authority: ComplianceAuthority;
  chunk_id: string;
  document_title: string;
  excerpt: string;
  source_title: string;
  url: string;
}

export interface ComplianceRequiredField {
  field: string;
  label: string;
  reason: string;
  status: ComplianceRequiredFieldStatus;
}

export interface ComplianceFinding {
  citation_chunk_ids: string[];
  message: string;
  severity: ComplianceFindingSeverity;
  title: string;
  workflow: ComplianceWorkflow;
}

export interface ComplianceAdvisory {
  citations: ComplianceCitation[];
  findings: ComplianceFinding[];
  generated_at: string;
  required_fields: ComplianceRequiredField[];
  review_task: string | null;
  status: ComplianceAdvisoryStatus;
  summary: string;
  workflow: ComplianceWorkflow;
}

export interface ComplianceSetupReadiness {
  available: boolean;
  migrationName: "20260516175724_california_compliance_rag_v1.sql";
  reason: string | null;
  status: ComplianceSetupStatus;
}

export interface ComplianceAdvisoryAudit {
  id: string;
  workflow: ComplianceWorkflow;
  request: Record<string, unknown>;
  response: ComplianceAdvisory;
  citation_chunk_ids: string[];
  status: ComplianceAdvisoryStatus;
  created_by: string | null;
  created_at: string;
}

export interface ComplianceAdvisoryRequest {
  context?: {
    chemical_log_id?: string | null;
    job_id?: string | null;
    location_id?: string | null;
    unit_ids?: string[];
  };
  prompt?: string | null;
  workflow: ComplianceWorkflow;
}

export interface LocationUnit {
  id: string;
  location_id: string;
  unit_label: string;
  floor: string | null;
  area_type: LocationUnitAreaType;
  status: LocationUnitStatus;
  service_notes: string | null;
  created_at: string;
  updated_at: string;
  location?: Location;
}

export interface LocationUnitInput {
  area_type?: LocationUnitAreaType;
  floor?: string | null;
  location_id: string;
  service_notes?: string | null;
  unit_label: string;
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

export interface OfflineQueueInput<TPayload = Record<string, unknown>> {
  action: OfflineQueueAction;
  payload: TPayload;
}

export interface OfflineQueueItem<TPayload = Record<string, unknown>> {
  id: string;
  action: OfflineQueueAction;
  payload: TPayload;
  status: OfflineQueueStatus;
  attempts: number;
  created_at: string;
  updated_at: string;
  next_retry_at: string | null;
  last_error: string | null;
}
