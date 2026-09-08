/**
 * Ports: what the use cases in this package need from the outside world.
 *
 * `docs/architecture.md` makes this package the owner of ports, and requires
 * that it stay provider-independent — nothing here may name a Supabase client,
 * a Stripe object, or an HTTP status. Implementations live in
 * `@pest-patrol/api-client`, which may depend on this package, and are selected
 * at the app composition roots.
 *
 * Method names deliberately match the adapter functions they replace, so the
 * mapping between a port and its implementation stays one-to-one and reviewable.
 * Where an adapter took a provider client, the port does not: the client is
 * bound when the implementation is constructed, which is what moves provider
 * selection out to the composition root.
 */

import type { ComplianceChunkSearchInput } from "@pest-patrol/domain";
import type {
  AutomationRule,
  AutomationRuleInput,
  AutomationRuleStatus,
  AutomationSchedulerResult,
  AutomationSchedulerRun,
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  ChemicalLog,
  ChemicalLogInput,
  CloseoutCaptureSummary,
  ComplianceAdvisory,
  ComplianceAdvisoryAudit,
  ComplianceAdvisoryStatus,
  ComplianceChunk,
  ComplianceDocument,
  ComplianceSource,
  ComplianceWorkflow,
  Customer,
  CustomerInput,
  CustomerPortalAccessGrant,
  CustomerPortalAccessInput,
  CustomerPortalAccessTokenEventListResponse,
  CustomerPortalAccessTokenSummary,
  CustomerPortalCloseout,
  CustomerPortalFormSubmission,
  CustomerPortalInvoice,
  CustomerPortalJob,
  CustomerPortalMedia,
  CustomerPortalProviderStatus,
  CustomerPortalSendInput,
  CustomerPortalSendResult,
  CustomerPortalUpgradeIntentInput,
  CustomerPortalUpgradeIntentResult,
  FormTemplate,
  Invoice,
  InvoiceInput,
  InvoicePaymentLinkInput,
  InvoiceStatus,
  Job,
  JobFormSubmission,
  JobFormSubmissionInput,
  JobGeofenceEvent,
  JobGeofenceEventInput,
  JobInput,
  JobMedia,
  JobPhotoUploadQueuePayload,
  JobSignatureCaptureQueuePayload,
  JobStatus,
  NotificationEvent,
  NotificationEventInput,
  NotificationProviderStatus,
  NotificationTemplate,
  NotificationTemplateInput,
  NotificationTemplateStatus,
  StripePaymentProviderStatus,
  TechnicianInviteInput,
  TechnicianInviteResult,
  TechnicianLicense,
  TechnicianLicenseInput,
  TechnicianProfile,
  TechnicianStatus,
  UserProfile,
} from "@pest-patrol/types";

/**
 * An authenticated session paired with its profile.
 *
 * The session itself is opaque to this package: no use case inspects it, they
 * only pass it back to the caller. Keeping it a type parameter is what lets the
 * composition root work with its provider's concrete session type while
 * `packages/application` stays provider-independent.
 */
export interface AuthRecord<TSession = unknown> {
  session: TSession;
  profile: UserProfile;
}

/** The outcome of a manually triggered automation scheduler run. */
export interface AutomationSchedulerManualRun {
  result: AutomationSchedulerResult;
  run: AutomationSchedulerRun;
}

/** The audit row written when a compliance advisory is produced. */
export interface ComplianceAdvisoryAuditInput {
  citation_chunk_ids: string[];
  created_by?: string | null;
  request: Record<string, unknown>;
  response: ComplianceAdvisory;
  status: ComplianceAdvisoryStatus;
  workflow: ComplianceWorkflow;
}

/** One delivery attempt's outcome inside a bulk notification send. */
export interface NotificationBulkDeliveryOutcome {
  error: string | null;
  event: NotificationEvent | null;
  id: string;
  status: "sent" | "failed";
}

/** The aggregate result of sending a batch of notification deliveries. */
export interface NotificationBulkDeliveryRecordResult {
  failed_count: number;
  results: NotificationBulkDeliveryOutcome[];
  sent_count: number;
}

export interface AuthPort<TSession = unknown> {
  getCurrentAuthRecord(): Promise<AuthRecord<TSession> | null>;
  resetPasswordForEmailRecord(email: string, redirectTo: string): Promise<void>;
  setPasswordRecoverySessionRecord(
    accessToken: string,
    refreshToken: string,
  ): Promise<TSession>;
  signInWithPasswordRecord(
    email: string,
    password: string,
  ): Promise<AuthRecord<TSession>>;
  signOutRecord(): Promise<void>;
  updatePasswordRecord(password: string): Promise<unknown>;
}

export interface AutomationPort {
  createAutomationRuleRecord(
    input: AutomationRuleInput,
  ): Promise<AutomationRule>;
  createGeneratedNotificationEventRecord(
    input: NotificationEventInput,
  ): Promise<NotificationEvent | null>;
  createNotificationEventRecord(
    input: NotificationEventInput,
  ): Promise<NotificationEvent>;
  createNotificationTemplateRecord(
    input: NotificationTemplateInput,
  ): Promise<NotificationTemplate>;
  dismissNotificationEventRecord(id: string): Promise<NotificationEvent>;
  getNotificationProviderStatusRecord(): Promise<NotificationProviderStatus>;
  listAutomationRuleRecords(): Promise<AutomationRule[]>;
  listAutomationSchedulerJobRecords(): Promise<Job[]>;
  listAutomationSchedulerRunRecords(): Promise<AutomationSchedulerRun[]>;
  listNotificationEventRecords(): Promise<NotificationEvent[]>;
  listNotificationTemplateRecords(): Promise<NotificationTemplate[]>;
  markNotificationEventHandledRecord(id: string): Promise<NotificationEvent>;
  runAutomationSchedulerManualRecord(): Promise<AutomationSchedulerManualRun>;
  sendNotificationEventDeliveriesRecord(
    ids: string[],
  ): Promise<NotificationBulkDeliveryRecordResult>;
  sendNotificationEventDeliveryRecord(id: string): Promise<NotificationEvent>;
  updateAutomationRuleRecord(
    id: string,
    input: AutomationRuleInput,
  ): Promise<AutomationRule>;
  updateAutomationRuleStatusRecord(
    id: string,
    status: AutomationRuleStatus,
  ): Promise<AutomationRule>;
  updateNotificationTemplateRecord(
    id: string,
    input: NotificationTemplateInput,
  ): Promise<NotificationTemplate>;
  updateNotificationTemplateStatusRecord(
    id: string,
    status: NotificationTemplateStatus,
  ): Promise<NotificationTemplate>;
}

export interface CloseoutsPort {
  createCustomerPortalAccessTokenRecord(
    input: CustomerPortalAccessInput,
  ): Promise<CustomerPortalAccessGrant>;
  getCustomerPortalProviderStatusRecord(): Promise<CustomerPortalProviderStatus>;
  listCloseoutCaptureSummaryRecords(
    jobIds: string[],
  ): Promise<CloseoutCaptureSummary[]>;
  listCustomerPortalAccessTokenEventRecords(
    id: string,
  ): Promise<CustomerPortalAccessTokenEventListResponse>;
  listCustomerPortalAccessTokenRecords(
    customerId: string,
  ): Promise<CustomerPortalAccessTokenSummary[]>;
  listCustomerPortalBillingRecords(
    customerId: string,
  ): Promise<CustomerPortalInvoice[]>;
  listCustomerPortalCloseoutRecords(
    customerId: string,
  ): Promise<CustomerPortalCloseout[]>;
  requestCustomerPortalUpgradeIntentRecord(
    customerId: string,
    input: CustomerPortalUpgradeIntentInput,
  ): Promise<CustomerPortalUpgradeIntentResult>;
  revokeCustomerPortalAccessTokenRecord(
    id: string,
  ): Promise<CustomerPortalAccessTokenSummary>;
  sendCustomerPortalAccessTokenRecord(
    input: CustomerPortalSendInput,
  ): Promise<CustomerPortalSendResult>;
}

export interface CompliancePort {
  createComplianceAdvisoryAuditRecord(
    input: ComplianceAdvisoryAuditInput,
  ): Promise<ComplianceAdvisoryAudit>;
  listComplianceAdvisoryAuditRecords(): Promise<ComplianceAdvisoryAudit[]>;
  listComplianceChunkRecords(): Promise<ComplianceChunk[]>;
  listComplianceDocumentRecords(): Promise<ComplianceDocument[]>;
  listComplianceSourceRecords(): Promise<ComplianceSource[]>;
  searchComplianceChunkRecords(
    input: ComplianceChunkSearchInput,
  ): Promise<ComplianceChunk[]>;
}

export interface CustomersPort {
  archiveCustomerRecord(id: string): Promise<Customer>;
  createCustomerRecord(input: CustomerInput): Promise<Customer>;
  listCustomerRecords(): Promise<Customer[]>;
  updateCustomerRecord(id: string, input: CustomerInput): Promise<Customer>;
}

export interface FormsPort {
  createJobFormSubmissionRecord(
    input: JobFormSubmissionInput,
  ): Promise<JobFormSubmission>;
  listActiveFormTemplateRecords(): Promise<FormTemplate[]>;
  listCustomerPortalFormSubmissionRecords(
    customerId: string,
  ): Promise<CustomerPortalFormSubmission[]>;
  listJobFormSubmissionRecords(jobId: string): Promise<JobFormSubmission[]>;
}

export interface GeofencingPort {
  listJobGeofenceEventRecords(): Promise<JobGeofenceEvent[]>;
}

export interface InventoryPort {
  archiveChemicalInventoryRecord(id: string): Promise<ChemicalInventoryItem>;
  createChemicalInventoryRecord(
    input: ChemicalInventoryInput,
  ): Promise<ChemicalInventoryItem>;
  createChemicalLogRecord(input: ChemicalLogInput): Promise<ChemicalLog>;
  listChemicalInventoryRecords(): Promise<ChemicalInventoryItem[]>;
  listChemicalLogRecords(): Promise<ChemicalLog[]>;
  listJobChemicalLogRecords(jobId: string): Promise<ChemicalLog[]>;
  updateChemicalInventoryRecord(
    id: string,
    input: ChemicalInventoryInput,
  ): Promise<ChemicalInventoryItem>;
}

export interface JobsPort {
  cancelJobRecord(id: string): Promise<Job>;
  createJobRecord(input: JobInput): Promise<Job>;
  listAssignedTechnicianJobRecords(): Promise<Job[]>;
  listCustomerPortalJobRecords(
    customerId: string,
  ): Promise<CustomerPortalJob[]>;
  listJobRecords(): Promise<Job[]>;
  listTechnicianProfileRecords(
    status?: TechnicianStatus | undefined,
  ): Promise<TechnicianProfile[]>;
  updateJobRecord(id: string, input: JobInput): Promise<Job>;
}

export interface MediaPort {
  listCustomerPortalMediaRecords(
    customerId: string,
  ): Promise<CustomerPortalMedia[]>;
  listJobMediaRecords(jobId: string): Promise<JobMedia[]>;
}

/**
 * What the durable offline queue needs to drain one item.
 *
 * CR06 relocates the queue itself into `packages/sync`; this port is what lets
 * that move be a pure relocation rather than another adapter extraction.
 */
export interface OfflineSyncPort {
  createChemicalLogRecord(input: ChemicalLogInput): Promise<ChemicalLog>;
  createGeneratedNotificationEventRecord(
    input: NotificationEventInput,
  ): Promise<NotificationEvent | null>;
  createJobFormSubmissionRecord(
    input: JobFormSubmissionInput,
  ): Promise<JobFormSubmission>;
  createJobGeofenceEventRecord(
    input: JobGeofenceEventInput,
  ): Promise<JobGeofenceEvent>;
  updateAssignedTechnicianJobStatusRecord(
    id: string,
    status: JobStatus,
    previousStatus?: JobStatus,
  ): Promise<Job>;
  uploadJobPhotoRecord(input: JobPhotoUploadQueuePayload): Promise<JobMedia>;
  uploadJobSignatureRecord(
    input: JobSignatureCaptureQueuePayload,
  ): Promise<JobMedia>;
}

export interface PaymentsPort {
  createInvoicePaymentLinkRecord(
    input: InvoicePaymentLinkInput,
  ): Promise<Invoice>;
  createInvoiceRecord(input: InvoiceInput): Promise<Invoice>;
  getStripePaymentProviderStatusRecord(): Promise<StripePaymentProviderStatus>;
  listInvoiceRecords(): Promise<Invoice[]>;
  updateInvoiceStatusRecord(
    id: string,
    status: InvoiceStatus,
  ): Promise<Invoice>;
}

export interface TechnicianLicensesPort {
  archiveTechnicianLicenseRecord(id: string): Promise<TechnicianLicense>;
  createTechnicianLicenseRecord(
    input: TechnicianLicenseInput,
  ): Promise<TechnicianLicense>;
  listTechnicianLicenseRecords(
    technicianId?: string | undefined,
  ): Promise<TechnicianLicense[]>;
  updateTechnicianLicenseRecord(
    id: string,
    input: TechnicianLicenseInput,
  ): Promise<TechnicianLicense>;
}

export interface TechniciansPort {
  inviteTechnicianRecord(
    input: TechnicianInviteInput,
  ): Promise<TechnicianInviteResult>;
  listTechnicianProfileRecords(
    status?: TechnicianStatus | undefined,
  ): Promise<TechnicianProfile[]>;
}
