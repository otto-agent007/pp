import type { FormTemplate, JobFormData } from "./forms";
import type { JobMediaType } from "./media";
import type { NotificationProviderReadinessState } from "./providerReadiness";

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

export interface CustomerPortalProviderStatus {
  manual_fallback?: boolean;
  provider: CustomerPortalDeliveryProvider;
  readiness_state?: NotificationProviderReadinessState;
  webhook_configured: boolean;
  webhook_secret_configured: boolean;
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
  manual_fallback?: boolean;
  provider: CustomerPortalDeliveryProvider;
  status: "requested";
}

export interface CustomerPortalUpgradeIntentInput {
  plan_id: CustomerPortalUpgradePlanId;
}

export type CustomerPortalUpgradeIntentRequest = CustomerPortalUpgradeIntentInput;

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
