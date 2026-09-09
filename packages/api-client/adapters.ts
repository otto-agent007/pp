/**
 * Port implementations: how this package satisfies what the use cases need.
 *
 * Each factory binds a provider client once and returns an object matching the
 * port interface `@pest-patrol/application` declares. Because the interface
 * comes from that package rather than being restated here, a signature that
 * drifts from its port is a type error rather than a runtime surprise.
 *
 * Adapters that take no client keep using the module-level `supabase`
 * singleton. That is deliberate and recorded: CR09 removes the singleton, and
 * until then provider selection at a composition root is real for the adapters
 * that accept a client and nominal for the rest.
 */

import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { withMutationFailure } from "./mutationFailures";

import type {
  AuthPort,
  AutomationPort,
  CloseoutsPort,
  CompliancePort,
  CustomersPort,
  FormsPort,
  GeofencingPort,
  InventoryPort,
  JobsPort,
  MediaPort,
  OfflineSyncPort,
  PaymentsPort,
  TechnicianLicensesPort,
  TechniciansPort,
} from "@pest-patrol/application";

import { supabase } from "./supabase";
import {
  getCurrentAuthRecord,
  resetPasswordForEmailRecord,
  setPasswordRecoverySessionRecord,
  signInWithPasswordRecord,
  signOutRecord,
  updatePasswordRecord,
} from "./auth";
import {
  createAutomationRuleRecord,
  createGeneratedNotificationEventRecord,
  createNotificationEventRecord,
  createNotificationTemplateRecord,
  dismissNotificationEventRecord,
  getNotificationProviderStatusRecord,
  listAutomationRuleRecords,
  listAutomationSchedulerJobRecords,
  listAutomationSchedulerRunRecords,
  listNotificationEventRecords,
  listNotificationTemplateRecords,
  markNotificationEventHandledRecord,
  runAutomationSchedulerManualRecord,
  sendNotificationEventDeliveriesRecord,
  sendNotificationEventDeliveryRecord,
  updateAutomationRuleRecord,
  updateAutomationRuleStatusRecord,
  updateNotificationTemplateRecord,
  updateNotificationTemplateStatusRecord,
} from "./automation";
import { listCloseoutCaptureSummaryRecords } from "./closeouts";
import {
  createComplianceAdvisoryAuditRecord,
  listComplianceAdvisoryAuditRecords,
  listComplianceChunkRecords,
  listComplianceDocumentRecords,
  listComplianceSourceRecords,
  searchComplianceChunkRecords,
} from "./compliance";
import {
  archiveCustomerRecord,
  createCustomerRecord,
  listCustomerRecords,
  updateCustomerRecord,
} from "./customers";
import {
  createJobFormSubmissionRecord,
  listActiveFormTemplateRecords,
  listCustomerPortalFormSubmissionRecords,
  listJobFormSubmissionRecords,
} from "./forms";
import {
  createJobGeofenceEventRecord,
  listJobGeofenceEventRecords,
} from "./geofencing";
import {
  archiveChemicalInventoryRecord,
  createChemicalInventoryRecord,
  createChemicalLogRecord,
  listChemicalInventoryRecords,
  listChemicalLogRecords,
  listJobChemicalLogRecords,
  updateChemicalInventoryRecord,
} from "./inventory";
import {
  cancelJobRecord,
  createJobRecord,
  listAssignedTechnicianJobRecords,
  listCustomerPortalJobRecords,
  listJobRecords,
  updateAssignedTechnicianJobStatusRecord,
  updateJobRecord,
} from "./jobs";
import {
  listCustomerPortalMediaRecords,
  listJobMediaRecords,
  uploadJobPhotoRecord,
  uploadJobSignatureRecord,
} from "./media";
import {
  createInvoicePaymentLinkRecord,
  createInvoiceRecord,
  getStripePaymentProviderStatusRecord,
  listInvoiceRecords,
  updateInvoiceStatusRecord,
} from "./payments";
import {
  createCustomerPortalAccessTokenRecord,
  getCustomerPortalProviderStatusRecord,
  listCustomerPortalAccessTokenEventRecords,
  listCustomerPortalAccessTokenRecords,
  listCustomerPortalBillingRecords,
  listCustomerPortalCloseoutRecords,
  requestCustomerPortalUpgradeIntentRecord,
  revokeCustomerPortalAccessTokenRecord,
  sendCustomerPortalAccessTokenRecord,
} from "./portal";
import {
  archiveTechnicianLicenseRecord,
  createTechnicianLicenseRecord,
  listTechnicianLicenseRecords,
  updateTechnicianLicenseRecord,
} from "./technicianLicenses";
import {
  inviteTechnicianRecord,
  listTechnicianProfileRecords,
} from "./technicians";

/**
 * The client shape these adapters accept.
 *
 * Adapters were written against several narrow client aliases; every one of
 * them is satisfied by a Supabase client, so the factories take that and let
 * each adapter's own parameter type do the narrowing.
 */
type SupabaseLikeClient = SupabaseClient;

export function createAuthAdapter(
  client: SupabaseLikeClient = supabase,
): AuthPort<Session> {
  return {
    getCurrentAuthRecord: () => getCurrentAuthRecord(client),
    resetPasswordForEmailRecord: (email, redirectTo) =>
      resetPasswordForEmailRecord(client, email, redirectTo),
    setPasswordRecoverySessionRecord: (accessToken, refreshToken) =>
      setPasswordRecoverySessionRecord(client, accessToken, refreshToken),
    signInWithPasswordRecord: (email, password) =>
      signInWithPasswordRecord(client, email, password),
    signOutRecord: () => signOutRecord(client),
    updatePasswordRecord: (password) => updatePasswordRecord(client, password),
  };
}

export function createAutomationAdapter(
  client: SupabaseLikeClient = supabase,
): AutomationPort {
  return {
    createAutomationRuleRecord: (input) => createAutomationRuleRecord(input),
    createGeneratedNotificationEventRecord: (input) =>
      createGeneratedNotificationEventRecord(input, client),
    createNotificationEventRecord: (input) =>
      createNotificationEventRecord(input),
    createNotificationTemplateRecord: (input) =>
      createNotificationTemplateRecord(input),
    dismissNotificationEventRecord: (id) => dismissNotificationEventRecord(id),
    getNotificationProviderStatusRecord: () =>
      getNotificationProviderStatusRecord(),
    listAutomationRuleRecords: () => listAutomationRuleRecords(client),
    listAutomationSchedulerJobRecords: () =>
      listAutomationSchedulerJobRecords(client),
    listAutomationSchedulerRunRecords: () =>
      listAutomationSchedulerRunRecords(client),
    listNotificationEventRecords: () => listNotificationEventRecords(),
    listNotificationTemplateRecords: () => listNotificationTemplateRecords(),
    markNotificationEventHandledRecord: (id) =>
      markNotificationEventHandledRecord(id),
    runAutomationSchedulerManualRecord: () =>
      runAutomationSchedulerManualRecord(),
    sendNotificationEventDeliveriesRecord: (ids) =>
      sendNotificationEventDeliveriesRecord(ids),
    sendNotificationEventDeliveryRecord: (id) =>
      sendNotificationEventDeliveryRecord(id),
    updateAutomationRuleRecord: (id, input) =>
      updateAutomationRuleRecord(id, input),
    updateAutomationRuleStatusRecord: (id, status) =>
      updateAutomationRuleStatusRecord(id, status),
    updateNotificationTemplateRecord: (id, input) =>
      updateNotificationTemplateRecord(id, input),
    updateNotificationTemplateStatusRecord: (id, status) =>
      updateNotificationTemplateStatusRecord(id, status),
  };
}

export function createCloseoutsAdapter(
  client: SupabaseLikeClient = supabase,
): CloseoutsPort {
  return {
    createCustomerPortalAccessTokenRecord: (input) =>
      createCustomerPortalAccessTokenRecord(input),
    getCustomerPortalProviderStatusRecord: () =>
      getCustomerPortalProviderStatusRecord(),
    listCloseoutCaptureSummaryRecords: (jobIds) =>
      listCloseoutCaptureSummaryRecords(jobIds, client),
    listCustomerPortalAccessTokenEventRecords: (id) =>
      listCustomerPortalAccessTokenEventRecords(id),
    listCustomerPortalAccessTokenRecords: (customerId) =>
      listCustomerPortalAccessTokenRecords(customerId),
    listCustomerPortalBillingRecords: (customerId) =>
      listCustomerPortalBillingRecords(customerId),
    listCustomerPortalCloseoutRecords: (customerId) =>
      listCustomerPortalCloseoutRecords(customerId),
    requestCustomerPortalUpgradeIntentRecord: (customerId, input) =>
      requestCustomerPortalUpgradeIntentRecord(customerId, input),
    revokeCustomerPortalAccessTokenRecord: (id) =>
      revokeCustomerPortalAccessTokenRecord(id),
    sendCustomerPortalAccessTokenRecord: (input) =>
      sendCustomerPortalAccessTokenRecord(input),
  };
}

export function createComplianceAdapter(
  client: SupabaseLikeClient = supabase,
): CompliancePort {
  return {
    createComplianceAdvisoryAuditRecord: (input) =>
      createComplianceAdvisoryAuditRecord(input, client),
    listComplianceAdvisoryAuditRecords: () =>
      listComplianceAdvisoryAuditRecords(client),
    listComplianceChunkRecords: () => listComplianceChunkRecords(client),
    listComplianceDocumentRecords: () => listComplianceDocumentRecords(client),
    listComplianceSourceRecords: () => listComplianceSourceRecords(client),
    searchComplianceChunkRecords: (input) =>
      searchComplianceChunkRecords(input, client),
  };
}

export function createCustomersAdapter(): CustomersPort {
  return {
    archiveCustomerRecord: (id) => archiveCustomerRecord(id),
    createCustomerRecord: (input) => createCustomerRecord(input),
    listCustomerRecords: () => listCustomerRecords(),
    updateCustomerRecord: (id, input) => updateCustomerRecord(id, input),
  };
}

export function createFormsAdapter(
  client: SupabaseLikeClient = supabase,
): FormsPort {
  return {
    createJobFormSubmissionRecord: (input) =>
      createJobFormSubmissionRecord(input, client),
    listActiveFormTemplateRecords: () => listActiveFormTemplateRecords(client),
    listCustomerPortalFormSubmissionRecords: (customerId) =>
      listCustomerPortalFormSubmissionRecords(customerId, client),
    listJobFormSubmissionRecords: (jobId) =>
      listJobFormSubmissionRecords(jobId, client),
  };
}

export function createGeofencingAdapter(
  client: SupabaseLikeClient = supabase,
): GeofencingPort {
  return {
    listJobGeofenceEventRecords: () => listJobGeofenceEventRecords(client),
  };
}

export function createInventoryAdapter(
  client: SupabaseLikeClient = supabase,
): InventoryPort {
  return {
    archiveChemicalInventoryRecord: (id) => archiveChemicalInventoryRecord(id),
    createChemicalInventoryRecord: (input) =>
      createChemicalInventoryRecord(input),
    createChemicalLogRecord: (input) => createChemicalLogRecord(input, client),
    listChemicalInventoryRecords: () => listChemicalInventoryRecords(client),
    listChemicalLogRecords: () => listChemicalLogRecords(client),
    listJobChemicalLogRecords: (jobId) =>
      listJobChemicalLogRecords(jobId, client),
    updateChemicalInventoryRecord: (id, input) =>
      updateChemicalInventoryRecord(id, input),
  };
}

export function createJobsAdapter(
  client: SupabaseLikeClient = supabase,
): JobsPort {
  return {
    cancelJobRecord: (id) => cancelJobRecord(id),
    createJobRecord: (input) => createJobRecord(input),
    listAssignedTechnicianJobRecords: () =>
      listAssignedTechnicianJobRecords(client),
    listCustomerPortalJobRecords: (customerId) =>
      listCustomerPortalJobRecords(customerId, client),
    listJobRecords: () => listJobRecords(client),
    listTechnicianProfileRecords: (status) =>
      listTechnicianProfileRecords(status, client),
    updateJobRecord: (id, input) => updateJobRecord(id, input),
  };
}

export function createMediaAdapter(
  client: SupabaseLikeClient = supabase,
): MediaPort {
  return {
    listCustomerPortalMediaRecords: (customerId) =>
      listCustomerPortalMediaRecords(customerId, client),
    listJobMediaRecords: (jobId) => listJobMediaRecords(jobId, client),
  };
}

export function createPaymentsAdapter(
  client: SupabaseLikeClient = supabase,
): PaymentsPort {
  return {
    createInvoicePaymentLinkRecord: (input) =>
      createInvoicePaymentLinkRecord(input),
    createInvoiceRecord: (input) => createInvoiceRecord(input),
    getStripePaymentProviderStatusRecord: () =>
      getStripePaymentProviderStatusRecord(),
    listInvoiceRecords: () => listInvoiceRecords(),
    updateInvoiceStatusRecord: (id, status) =>
      updateInvoiceStatusRecord(id, status, client),
  };
}

export function createTechnicianLicensesAdapter(
  client: SupabaseLikeClient = supabase,
): TechnicianLicensesPort {
  return {
    archiveTechnicianLicenseRecord: (id) =>
      archiveTechnicianLicenseRecord(id, client),
    createTechnicianLicenseRecord: (input) =>
      createTechnicianLicenseRecord(input, client),
    listTechnicianLicenseRecords: (technicianId) =>
      listTechnicianLicenseRecords(technicianId, client),
    updateTechnicianLicenseRecord: (id, input) =>
      updateTechnicianLicenseRecord(id, input, client),
  };
}

export function createTechniciansAdapter(
  client: SupabaseLikeClient = supabase,
): TechniciansPort {
  return {
    inviteTechnicianRecord: (input) => inviteTechnicianRecord(input),
    listTechnicianProfileRecords: (status) =>
      listTechnicianProfileRecords(status, client),
  };
}

/**
 * The one port whose failures the durable queue acts on rather than surfaces.
 *
 * Every method is wrapped so a provider rejection arrives at `packages/sync` as
 * a `MutationFailure` carrying a reason. The queue used to read the message
 * string off whatever was thrown, which made a PostgREST code part of its
 * behaviour; the interpretation now happens here, where knowing about the
 * provider is this package's job.
 */
export function createOfflineSyncAdapter(
  client: SupabaseLikeClient = supabase,
): OfflineSyncPort {
  return {
    createChemicalLogRecord: (input) =>
      withMutationFailure(() => createChemicalLogRecord(input, client)),
    createGeneratedNotificationEventRecord: (input) =>
      withMutationFailure(() =>
        createGeneratedNotificationEventRecord(input, client),
      ),
    createJobFormSubmissionRecord: (input) =>
      withMutationFailure(() => createJobFormSubmissionRecord(input, client)),
    createJobGeofenceEventRecord: (input) =>
      withMutationFailure(() => createJobGeofenceEventRecord(input, client)),
    updateAssignedTechnicianJobStatusRecord: (id, status, previousStatus) =>
      withMutationFailure(() =>
        updateAssignedTechnicianJobStatusRecord(
          client,
          id,
          status,
          previousStatus,
        ),
      ),
    uploadJobPhotoRecord: (input) =>
      withMutationFailure(() => uploadJobPhotoRecord(input, client)),
    uploadJobSignatureRecord: (input) =>
      withMutationFailure(() => uploadJobSignatureRecord(input, client)),
  };
}
