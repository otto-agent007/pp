import type { Customer } from "./customers";
import type { Job } from "./jobs";
import type {
  StripeKeyMode,
  StripePaymentProviderReadinessState,
} from "./providerReadiness";

export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export type PaymentStatus = "pending" | "succeeded" | "failed";

export type PaymentProvider = "stripe";

export type PaymentWebhookReconciliationStatus = "processed" | "ignored";

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

export interface InvoicePaymentLinkInput {
  invoice_id: string;
}

export interface InvoicePaymentLinkResult {
  provider: PaymentProvider;
  provider_payment_link_id: string;
  payment_url: string;
  reused?: boolean;
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

export interface StripePaymentProviderStatus {
  live_mode_approved: boolean;
  manual_fallback: boolean;
  provider: PaymentProvider;
  readiness_state: StripePaymentProviderReadinessState;
  secret_configured: boolean;
  stripe_key_mode: StripeKeyMode;
  webhook_secret_configured: boolean;
}
