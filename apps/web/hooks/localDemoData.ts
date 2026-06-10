"use client";

import {
  buildDemoWorkflowFixtures,
  shouldUseLocalDemoFixtures,
  validateChemicalInventoryInput,
  validateChemicalLogInput,
  validateCustomerInput,
  validateCustomerPortalAccessInput,
  validateCustomerPortalAccessTokenId,
  validateCustomerPortalSendInput,
  validateCustomerPortalUpgradeIntentInput,
  buildCustomerPortalUpgradeGeneratedKey,
  buildWorkOrderInputFromEstimate,
  getEstimateConversionReadiness,
  getExistingWorkOrderForEstimate,
  validateInvoiceInput,
  validateJobInput,
  validateTechnicianLicenseInput,
  validateTechnicianInviteInput,
} from "@pest-patrol/domain";
import type {
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  ChemicalLog,
  ChemicalLogInput,
  CloseoutCaptureSummary,
  Customer,
  CustomerInput,
  CustomerPortalAccessGrant,
  CustomerPortalAccessInput,
  CustomerPortalAccessTokenEventSummary,
  CustomerPortalAccessTokenSummary,
  CustomerPortalSendInput,
  CustomerPortalSendResult,
  CustomerPortalUpgradeIntentInput,
  CustomerPortalUpgradeIntentResult,
  EstimateConversionInput,
  EstimateConversionResult,
  Invoice,
  InvoiceInput,
  InvoiceLineItem,
  InvoicePaymentLinkResult,
  Job,
  JobInput,
  JobStatus,
  PaymentRecord,
  TechnicianLicense,
  TechnicianLicenseInput,
  TechnicianInviteInput,
  TechnicianInviteResult,
  TechnicianProfile,
} from "@pest-patrol/types";

function stableFixtureNow() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

let localDemoFixtures = buildDemoWorkflowFixtures({ now: stableFixtureNow() });
let localDemoIdCounter = 0;
let localDemoFixtureSessionActive = false;
let localDemoTechnicianLicenses: TechnicianLicense[] = [];
let localDemoPortalUpgradeIntentKeys = new Set<string>();
const localDemoFixtureSessionKey = "pest-patrol-demo-fixture-session";

function nowIso() {
  return new Date().toISOString();
}

function nextLocalId(kind: string) {
  localDemoIdCounter += 1;

  return `local-demo-${kind}-${String(localDemoIdCounter).padStart(4, "0")}`;
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readLocalDemoFixtureSession() {
  const storage = getBrowserStorage();

  if (!storage) {
    return localDemoFixtureSessionActive;
  }

  localDemoFixtureSessionActive =
    storage.getItem(localDemoFixtureSessionKey) === "active";

  return localDemoFixtureSessionActive;
}

function writeLocalDemoFixtureSession(active: boolean) {
  localDemoFixtureSessionActive = active;

  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  if (active) {
    storage.setItem(localDemoFixtureSessionKey, "active");
    return;
  }

  storage.removeItem(localDemoFixtureSessionKey);
}

function sortTechnicians(technicians: TechnicianProfile[]) {
  return [...technicians].sort((left, right) =>
    (left.display_name ?? left.email ?? left.id).localeCompare(
      right.display_name ?? right.email ?? right.id,
    ),
  );
}

function getLocationMap(customers: Customer[]) {
  return new Map(
    customers.flatMap((customer) =>
      (customer.locations ?? []).map(
        (location) => [location.id, location] as const,
      ),
    ),
  );
}

function getJobMap(jobs: Job[]) {
  return new Map(jobs.map((job) => [job.id, job] as const));
}

function rebuildDerivedFixtureRelations() {
  const customersById = new Map(
    localDemoFixtures.customers.map(
      (customer) => [customer.id, customer] as const,
    ),
  );
  const locationsById = getLocationMap(localDemoFixtures.customers);
  const techniciansById = new Map(
    localDemoFixtures.technicians.map(
      (technician) => [technician.id, technician] as const,
    ),
  );
  const inventoryById = new Map(
    localDemoFixtures.inventory.map((item) => [item.id, item] as const),
  );

  localDemoFixtures.jobs = localDemoFixtures.jobs.map((job) => ({
    ...job,
    customer: customersById.get(job.customer_id),
    location: locationsById.get(job.location_id),
    assigned_technician: job.assigned_tech_id
      ? (techniciansById.get(job.assigned_tech_id) ?? null)
      : null,
  }));

  const jobsById = getJobMap(localDemoFixtures.jobs);

  localDemoFixtures.chemicalLogs = localDemoFixtures.chemicalLogs.map(
    (log) => ({
      ...log,
      chemical: inventoryById.get(log.chemical_id),
      job: jobsById.get(log.job_id),
    }),
  );

  localDemoFixtures.invoices = localDemoFixtures.invoices.map((invoice) => ({
    ...invoice,
    customer: customersById.get(invoice.customer_id),
    job: jobsById.get(invoice.job_id),
    line_items: invoice.line_items?.map((lineItem) => ({ ...lineItem })),
    payments: invoice.payments?.map((payment) => ({ ...payment })),
  }));

  localDemoFixtures.closeoutSummaries = localDemoFixtures.jobs.map(
    (job): CloseoutCaptureSummary => ({
      jobId: job.id,
      forms: localDemoFixtures.formSubmissions.filter(
        (submission) => submission.job_id === job.id,
      ).length,
      chemicalLogs: localDemoFixtures.chemicalLogs.filter(
        (log) => log.job_id === job.id,
      ).length,
      photos: localDemoFixtures.media.filter(
        (item) => item.job_id === job.id && item.media_type === "photo",
      ).length,
      signatures: localDemoFixtures.media.filter(
        (item) => item.job_id === job.id && item.media_type === "signature",
      ).length,
    }),
  );
}

function requireLocalDemoFixtures() {
  const fixtures = getLocalDemoFixtures();

  if (!fixtures) {
    throw new Error(
      "Local demo fixtures are not available in this environment.",
    );
  }

  return fixtures;
}

function requireCustomer(fixtures: typeof localDemoFixtures, id: string) {
  const customer = fixtures.customers.find((item) => item.id === id);

  if (!customer) {
    throw new Error("Customer was not found in the local demo.");
  }

  return customer;
}

function requireJob(fixtures: typeof localDemoFixtures, id: string) {
  const job = fixtures.jobs.find((item) => item.id === id);

  if (!job) {
    throw new Error("Job was not found in the local demo.");
  }

  return job;
}

function requireInventoryItem(fixtures: typeof localDemoFixtures, id: string) {
  const item = fixtures.inventory.find((current) => current.id === id);

  if (!item) {
    throw new Error("Inventory item was not found in the local demo.");
  }

  return item;
}

function requireTechnician(fixtures: typeof localDemoFixtures, id: string) {
  const technician = fixtures.technicians.find((item) => item.id === id);

  if (!technician) {
    throw new Error("Technician was not found in the local demo.");
  }

  return technician;
}

function requireInvoice(fixtures: typeof localDemoFixtures, id: string) {
  const invoice = fixtures.invoices.find((item) => item.id === id);

  if (!invoice) {
    throw new Error("Invoice was not found in the local demo.");
  }

  return invoice;
}

function updateLocalJob(id: string, updater: (job: Job) => Job) {
  const fixtures = requireLocalDemoFixtures();
  let updated: Job | null = null;

  fixtures.jobs = fixtures.jobs.map((job) => {
    if (job.id !== id) {
      return job;
    }

    updated = updater(job);
    return updated;
  });

  if (!updated) {
    throw new Error("Job was not found in the local demo.");
  }

  rebuildDerivedFixtureRelations();

  return requireJob(fixtures, id);
}

export function isLocalDemoFixtureMode() {
  return (
    shouldUseLocalDemoFixtures({
      nodeEnv: process.env.NODE_ENV,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }) || readLocalDemoFixtureSession()
  );
}

export function activateLocalDemoFixtureSession({
  reset = false,
}: {
  reset?: boolean;
} = {}) {
  writeLocalDemoFixtureSession(true);

  if (reset) {
    resetLocalDemoFixtures();
  }

  return localDemoFixtures;
}

export function deactivateLocalDemoFixtureSession() {
  writeLocalDemoFixtureSession(false);
}

export function resetLocalDemoFixtures() {
  localDemoFixtures = buildDemoWorkflowFixtures({ now: stableFixtureNow() });
  localDemoIdCounter = 0;
  localDemoTechnicianLicenses = [];
  localDemoPortalUpgradeIntentKeys = new Set<string>();

  return localDemoFixtures;
}

export function getLocalDemoFixtures() {
  return isLocalDemoFixtureMode() ? localDemoFixtures : null;
}

export function createLocalDemoCustomer(input: CustomerInput): Customer {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateCustomerInput(input);
  const id = nextLocalId("customer");
  const createdAt = nowIso();
  const customer: Customer = {
    id,
    name: normalized.name,
    phone: normalized.phone ?? null,
    email: normalized.email ?? null,
    property_type: normalized.property_type,
    service_notes: normalized.service_notes ?? null,
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
    locations: normalized.locations.map((location) => ({
      id: location.id ?? nextLocalId("location"),
      customer_id: id,
      address: location.address,
      nickname: location.nickname ?? null,
      service_notes: location.service_notes ?? null,
      is_primary: location.is_primary ?? false,
      status: "active",
      created_at: createdAt,
      updated_at: createdAt,
    })),
  };

  fixtures.customers = [customer, ...fixtures.customers];
  rebuildDerivedFixtureRelations();

  return customer;
}

export function updateLocalDemoCustomer(
  id: string,
  input: CustomerInput,
): Customer {
  const fixtures = requireLocalDemoFixtures();
  const existing = requireCustomer(fixtures, id);
  const normalized = validateCustomerInput(input);
  const updatedAt = nowIso();
  const locations = normalized.locations.map((location, index) => {
    const previous =
      (existing.locations ?? []).find((item) => item.id === location.id) ??
      existing.locations?.[index];

    return {
      id: location.id ?? previous?.id ?? nextLocalId("location"),
      customer_id: id,
      address: location.address,
      nickname: location.nickname ?? null,
      service_notes: location.service_notes ?? null,
      is_primary: location.is_primary ?? false,
      status: previous?.status ?? "active",
      created_at: previous?.created_at ?? updatedAt,
      updated_at: updatedAt,
    };
  });
  const customer: Customer = {
    ...existing,
    name: normalized.name,
    phone: normalized.phone ?? null,
    email: normalized.email ?? null,
    property_type: normalized.property_type,
    service_notes: normalized.service_notes ?? null,
    updated_at: updatedAt,
    locations,
  };

  fixtures.customers = fixtures.customers.map((item) =>
    item.id === id ? customer : item,
  );
  rebuildDerivedFixtureRelations();

  return customer;
}

export function archiveLocalDemoCustomer(id: string): Customer {
  const fixtures = requireLocalDemoFixtures();
  const updatedAt = nowIso();
  let archived: Customer | null = null;

  fixtures.customers = fixtures.customers.map((customer) => {
    if (customer.id !== id) {
      return customer;
    }

    archived = {
      ...customer,
      status: "archived",
      updated_at: updatedAt,
      locations: customer.locations?.map((location) => ({
        ...location,
        is_primary: false,
        status: "archived",
        updated_at: updatedAt,
      })),
    };
    return archived;
  });

  if (!archived) {
    throw new Error("Customer was not found in the local demo.");
  }

  rebuildDerivedFixtureRelations();

  return archived;
}

export function inviteLocalDemoTechnician(
  input: TechnicianInviteInput,
): TechnicianInviteResult {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateTechnicianInviteInput(input);
  const createdAt = nowIso();
  const technician: TechnicianProfile = {
    id: nextLocalId("technician"),
    role: "technician",
    email: normalized.email,
    display_name: normalized.display_name ?? normalized.email,
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
  };

  fixtures.technicians = sortTechnicians([...fixtures.technicians, technician]);
  rebuildDerivedFixtureRelations();

  return { technician };
}

export function listLocalDemoTechnicianLicenses(
  technicianId?: string,
): TechnicianLicense[] {
  return localDemoTechnicianLicenses
    .filter((license) => !license.archived_at)
    .filter((license) =>
      technicianId ? license.technician_id === technicianId : true,
    )
    .sort((left, right) => {
      const leftDate = left.expires_at ?? "9999-12-31";
      const rightDate = right.expires_at ?? "9999-12-31";
      const dateDelta = leftDate.localeCompare(rightDate);

      if (dateDelta !== 0) return dateDelta;

      return left.license_number.localeCompare(right.license_number);
    })
    .map((license) => ({ ...license }));
}

export function createLocalDemoTechnicianLicense(
  input: TechnicianLicenseInput,
): TechnicianLicense {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateTechnicianLicenseInput(input);
  requireTechnician(fixtures, normalized.technician_id);

  const createdAt = nowIso();
  const license: TechnicianLicense = {
    ...normalized,
    archived_at: null,
    created_at: createdAt,
    id: nextLocalId("technician-license"),
    updated_at: createdAt,
  };

  localDemoTechnicianLicenses = [...localDemoTechnicianLicenses, license];

  return { ...license };
}

export function updateLocalDemoTechnicianLicense(
  id: string,
  input: TechnicianLicenseInput,
): TechnicianLicense {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateTechnicianLicenseInput(input);
  requireTechnician(fixtures, normalized.technician_id);

  const updatedAt = nowIso();
  let updated: TechnicianLicense | null = null;

  localDemoTechnicianLicenses = localDemoTechnicianLicenses.map((license) => {
    if (license.id !== id) {
      return license;
    }

    const nextLicense: TechnicianLicense = {
      ...license,
      ...normalized,
      updated_at: updatedAt,
    };
    updated = nextLicense;
    return nextLicense;
  });

  const saved = updated;

  if (!saved) {
    throw new Error("Technician credential was not found in the local demo.");
  }

  return saved;
}

export function archiveLocalDemoTechnicianLicense(
  id: string,
): TechnicianLicense {
  const updatedAt = nowIso();
  let archived: TechnicianLicense | null = null;

  localDemoTechnicianLicenses = localDemoTechnicianLicenses.map((license) => {
    if (license.id !== id) {
      return license;
    }

    const nextLicense: TechnicianLicense = {
      ...license,
      archived_at: updatedAt,
      updated_at: updatedAt,
    };
    archived = nextLicense;
    return nextLicense;
  });

  const saved = archived;

  if (!saved) {
    throw new Error("Technician credential was not found in the local demo.");
  }

  return saved;
}

export function createLocalDemoJob(input: JobInput): Job {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateJobInput(input);
  const createdAt = nowIso();
  const job: Job = {
    id: nextLocalId("job"),
    customer_id: normalized.customer_id,
    location_id: normalized.location_id,
    assigned_tech_id: normalized.assigned_tech_id ?? null,
    status: normalized.status ?? "scheduled",
    scheduled_start: normalized.scheduled_start,
    scheduled_end: normalized.scheduled_end ?? null,
    service_notes: normalized.service_notes ?? null,
    job_purpose: normalized.job_purpose,
    service_offering_id: normalized.service_offering_id,
    service_family: normalized.service_family,
    billing_disposition: normalized.billing_disposition,
    service_cadence: normalized.service_cadence,
    estimate_status: normalized.estimate_status,
    parent_job_id: normalized.parent_job_id,
    created_at: createdAt,
    updated_at: createdAt,
  };

  fixtures.jobs = [job, ...fixtures.jobs];
  rebuildDerivedFixtureRelations();

  return requireJob(fixtures, job.id);
}

export function convertLocalDemoEstimateToWorkOrder(
  input: EstimateConversionInput,
): EstimateConversionResult {
  const fixtures = requireLocalDemoFixtures();
  const estimateJob = requireJob(fixtures, input.estimate_job_id);
  const existingWorkOrder = getExistingWorkOrderForEstimate(
    estimateJob,
    fixtures.jobs,
  );
  const readiness = getEstimateConversionReadiness(
    estimateJob,
    existingWorkOrder,
  );

  if (existingWorkOrder) {
    return {
      estimate_job: estimateJob,
      reused_existing_work_order: true,
      work_order_job: existingWorkOrder,
    };
  }

  if (!readiness.can_convert) {
    throw new Error(readiness.reasons[0] ?? readiness.summary);
  }

  const workOrder = createLocalDemoJob(
    buildWorkOrderInputFromEstimate(estimateJob, input),
  );
  const acceptedEstimate = updateLocalJob(estimateJob.id, (job) => ({
    ...job,
    estimate_status: "accepted",
    updated_at: nowIso(),
  }));

  return {
    estimate_job: acceptedEstimate,
    reused_existing_work_order: false,
    warning: null,
    work_order_job: workOrder,
  };
}

export function updateLocalDemoJob(id: string, input: JobInput): Job {
  const normalized = validateJobInput(input);

  return updateLocalJob(id, (job) => ({
    ...job,
    customer_id: normalized.customer_id,
    location_id: normalized.location_id,
    assigned_tech_id: normalized.assigned_tech_id ?? null,
    status: normalized.status ?? "scheduled",
    scheduled_start: normalized.scheduled_start,
    scheduled_end: normalized.scheduled_end ?? null,
    service_notes: normalized.service_notes ?? null,
    job_purpose: normalized.job_purpose,
    service_offering_id: normalized.service_offering_id,
    service_family: normalized.service_family,
    billing_disposition: normalized.billing_disposition,
    service_cadence: normalized.service_cadence,
    estimate_status: normalized.estimate_status,
    parent_job_id: normalized.parent_job_id,
    updated_at: nowIso(),
  }));
}

export function cancelLocalDemoJob(id: string): Job {
  return updateLocalJob(id, (job) => ({
    ...job,
    status: "canceled",
    updated_at: nowIso(),
  }));
}

export function updateLocalDemoJobStatus(job: Job, status: JobStatus): Job {
  return updateLocalJob(job.id, (currentJob) => ({
    ...currentJob,
    status,
    updated_at: nowIso(),
  }));
}

export function assignLocalDemoJobTechnician(
  job: Job,
  technicianId?: string | null,
): Job {
  const fixtures = requireLocalDemoFixtures();

  if (
    technicianId &&
    !fixtures.technicians.some((technician) => technician.id === technicianId)
  ) {
    throw new Error("Technician was not found in the local demo.");
  }

  return updateLocalJob(job.id, (currentJob) => ({
    ...currentJob,
    assigned_tech_id: technicianId ?? null,
    updated_at: nowIso(),
  }));
}

export function createLocalDemoInventoryItem(
  input: ChemicalInventoryInput,
): ChemicalInventoryItem {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateChemicalInventoryInput(input);
  const createdAt = nowIso();
  const item: ChemicalInventoryItem = {
    id: nextLocalId("inventory"),
    name: normalized.name,
    epa_number: normalized.epa_number ?? null,
    current_stock: normalized.current_stock,
    unit: normalized.unit,
    reorder_level: normalized.reorder_level ?? null,
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
  };

  fixtures.inventory = [item, ...fixtures.inventory];
  rebuildDerivedFixtureRelations();

  return item;
}

export function updateLocalDemoInventoryItem(
  id: string,
  input: ChemicalInventoryInput,
): ChemicalInventoryItem {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateChemicalInventoryInput(input);
  const existing = requireInventoryItem(fixtures, id);
  const item: ChemicalInventoryItem = {
    ...existing,
    name: normalized.name,
    epa_number: normalized.epa_number ?? null,
    current_stock: normalized.current_stock,
    unit: normalized.unit,
    reorder_level: normalized.reorder_level ?? null,
    updated_at: nowIso(),
  };

  fixtures.inventory = fixtures.inventory.map((current) =>
    current.id === id ? item : current,
  );
  rebuildDerivedFixtureRelations();

  return item;
}

export function archiveLocalDemoInventoryItem(
  id: string,
): ChemicalInventoryItem {
  const fixtures = requireLocalDemoFixtures();
  const existing = requireInventoryItem(fixtures, id);
  const item: ChemicalInventoryItem = {
    ...existing,
    status: "archived",
    updated_at: nowIso(),
  };

  fixtures.inventory = fixtures.inventory.map((current) =>
    current.id === id ? item : current,
  );
  rebuildDerivedFixtureRelations();

  return item;
}

export function createLocalDemoChemicalLog(
  input: ChemicalLogInput,
): ChemicalLog {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateChemicalLogInput(input);
  const chemical = requireInventoryItem(fixtures, normalized.chemical_id);
  const job = requireJob(fixtures, normalized.job_id);
  const createdAt = nowIso();
  const log: ChemicalLog = {
    id: nextLocalId("chemical-log"),
    job_id: normalized.job_id,
    chemical_id: normalized.chemical_id,
    amount_used: normalized.amount_used,
    notes: normalized.notes ?? null,
    created_at: createdAt,
    chemical: {
      ...chemical,
      current_stock: chemical.current_stock - normalized.amount_used,
      updated_at: createdAt,
    },
    job,
  };

  fixtures.inventory = fixtures.inventory.map((item) =>
    item.id === chemical.id
      ? {
          ...item,
          current_stock: item.current_stock - normalized.amount_used,
          updated_at: createdAt,
        }
      : item,
  );
  fixtures.chemicalLogs = [log, ...fixtures.chemicalLogs];
  rebuildDerivedFixtureRelations();

  return fixtures.chemicalLogs.find((item) => item.id === log.id) ?? log;
}

export function createLocalDemoInvoice(input: InvoiceInput): Invoice {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateInvoiceInput(input);
  const job = requireJob(fixtures, normalized.job_id);
  const customer = requireCustomer(fixtures, normalized.customer_id);
  const createdAt = nowIso();
  const invoiceId = nextLocalId("invoice");
  const lineItems: InvoiceLineItem[] = normalized.line_items.map(
    (lineItem) => ({
      id: nextLocalId("invoice-line"),
      invoice_id: invoiceId,
      description: lineItem.description,
      quantity: lineItem.quantity,
      unit_amount_cents: lineItem.unit_amount_cents,
      total_cents: Math.round(lineItem.quantity * lineItem.unit_amount_cents),
      created_at: createdAt,
    }),
  );
  const totalCents = lineItems.reduce(
    (total, item) => total + item.total_cents,
    0,
  );
  const invoice: Invoice = {
    id: invoiceId,
    job_id: normalized.job_id,
    customer_id: normalized.customer_id,
    status: "draft",
    currency: normalized.currency ?? "usd",
    subtotal_cents: totalCents,
    total_cents: totalCents,
    due_date: normalized.due_date ?? null,
    notes: normalized.notes ?? null,
    payment_url: null,
    stripe_payment_link_id: null,
    created_at: createdAt,
    updated_at: createdAt,
    job,
    customer,
    line_items: lineItems,
    payments: [],
  };

  fixtures.invoices = [invoice, ...fixtures.invoices];
  rebuildDerivedFixtureRelations();

  return requireInvoice(fixtures, invoiceId);
}

export function createLocalDemoInvoicePaymentLink(
  invoice: Invoice,
): InvoicePaymentLinkResult {
  const fixtures = requireLocalDemoFixtures();
  const existing = requireInvoice(fixtures, invoice.id);
  const updatedAt = nowIso();
  const providerPaymentLinkId = `local-demo-payment-link-${invoice.id}`;
  const paymentUrl = `https://pay.example.test/local-demo/${invoice.id}`;

  fixtures.invoices = fixtures.invoices.map((current) =>
    current.id === existing.id
      ? {
          ...current,
          status: "sent",
          payment_url: paymentUrl,
          stripe_payment_link_id: providerPaymentLinkId,
          updated_at: updatedAt,
        }
      : current,
  );
  rebuildDerivedFixtureRelations();

  return {
    provider: "stripe",
    provider_payment_link_id: providerPaymentLinkId,
    payment_url: paymentUrl,
  };
}

export function markLocalDemoInvoicePaid(id: string): Invoice {
  const fixtures = requireLocalDemoFixtures();
  const invoice = requireInvoice(fixtures, id);
  const updatedAt = nowIso();
  const successfulPayment: PaymentRecord = {
    id: nextLocalId("payment"),
    invoice_id: invoice.id,
    provider: "stripe",
    provider_payment_id: `local-demo-payment-${invoice.id}`,
    status: "succeeded",
    amount_cents: invoice.total_cents,
    currency: invoice.currency,
    paid_at: updatedAt,
    created_at: updatedAt,
    updated_at: updatedAt,
  };

  fixtures.invoices = fixtures.invoices.map((current) =>
    current.id === id
      ? {
          ...current,
          status: "paid",
          updated_at: updatedAt,
          payments: current.payments?.some(
            (payment) => payment.status === "succeeded",
          )
            ? current.payments
            : [...(current.payments ?? []), successfulPayment],
        }
      : current,
  );
  rebuildDerivedFixtureRelations();

  return requireInvoice(fixtures, id);
}

export function voidLocalDemoInvoice(id: string): Invoice {
  const fixtures = requireLocalDemoFixtures();
  requireInvoice(fixtures, id);

  fixtures.invoices = fixtures.invoices.map((invoice) =>
    invoice.id === id
      ? {
          ...invoice,
          status: "void",
          updated_at: nowIso(),
        }
      : invoice,
  );
  rebuildDerivedFixtureRelations();

  return requireInvoice(fixtures, id);
}

export function createLocalDemoPortalAccessToken(
  input: CustomerPortalAccessInput,
): CustomerPortalAccessGrant {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateCustomerPortalAccessInput(input);
  requireCustomer(fixtures, normalized.customer_id);

  const createdAt = nowIso();
  const tokenId = nextLocalId("portal-token");
  const accessToken = `local-demo-token-${tokenId}`;
  const portalUrl = `/portal/${encodeURIComponent(
    normalized.customer_id,
  )}?grant=${encodeURIComponent(accessToken)}`;
  const tokenSummary: CustomerPortalAccessTokenSummary = {
    id: tokenId,
    customer_id: normalized.customer_id,
    status: "active",
    expires_at: normalized.expires_at,
    last_used_at: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
  const event: CustomerPortalAccessTokenEventSummary = {
    id: nextLocalId("portal-token-event"),
    token_id: tokenId,
    customer_id: normalized.customer_id,
    kind: "generated",
    occurred_at: createdAt,
  };

  fixtures.portalAccessTokensByCustomerId = {
    ...fixtures.portalAccessTokensByCustomerId,
    [normalized.customer_id]: [
      ...(fixtures.portalAccessTokensByCustomerId[normalized.customer_id] ??
        []),
      tokenSummary,
    ],
  };
  fixtures.portalAccessTokenEventsByTokenId = {
    ...fixtures.portalAccessTokenEventsByTokenId,
    [tokenId]: [event],
  };

  return {
    customer_id: normalized.customer_id,
    access_token: accessToken,
    expires_at: normalized.expires_at,
    portal_url: portalUrl,
    token_id: tokenId,
  };
}

export function revokeLocalDemoPortalAccessToken(
  id: string,
): CustomerPortalAccessTokenSummary {
  const fixtures = requireLocalDemoFixtures();
  const tokenId = validateCustomerPortalAccessTokenId(id);
  const updatedAt = nowIso();
  const existingToken = Object.values(fixtures.portalAccessTokensByCustomerId)
    .flat()
    .find((token) => token.id === tokenId);

  if (!existingToken) {
    throw new Error("Portal access token was not found in the local demo.");
  }

  const updatedToken: CustomerPortalAccessTokenSummary = {
    ...existingToken,
    status: "revoked",
    updated_at: updatedAt,
  };

  fixtures.portalAccessTokensByCustomerId = Object.fromEntries(
    Object.entries(fixtures.portalAccessTokensByCustomerId).map(
      ([customerId, tokens]) => [
        customerId,
        tokens.map((token) => (token.id === tokenId ? updatedToken : token)),
      ],
    ),
  );

  const event: CustomerPortalAccessTokenEventSummary = {
    id: nextLocalId("portal-token-event"),
    token_id: tokenId,
    customer_id: updatedToken.customer_id,
    kind: "revoked",
    occurred_at: updatedAt,
  };

  fixtures.portalAccessTokenEventsByTokenId = {
    ...fixtures.portalAccessTokenEventsByTokenId,
    [tokenId]: [
      ...(fixtures.portalAccessTokenEventsByTokenId[tokenId] ?? []),
      event,
    ],
  };

  return updatedToken;
}

export function sendLocalDemoPortalAccessToken(
  input: CustomerPortalSendInput,
): CustomerPortalSendResult {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateCustomerPortalSendInput(input);
  const token = fixtures.portalAccessTokensByCustomerId[
    normalized.customer_id
  ]?.find((summary) => summary.id === normalized.token_id);

  if (!token) {
    throw new Error("Portal access token was not found in the local demo.");
  }

  const event: CustomerPortalAccessTokenEventSummary = {
    id: nextLocalId("portal-token-event"),
    token_id: normalized.token_id,
    customer_id: normalized.customer_id,
    kind: "send_requested",
    occurred_at: nowIso(),
  };

  fixtures.portalAccessTokenEventsByTokenId = {
    ...fixtures.portalAccessTokenEventsByTokenId,
    [normalized.token_id]: [
      ...(fixtures.portalAccessTokenEventsByTokenId[normalized.token_id] ?? []),
      event,
    ],
  };

  return { provider: "webhook", status: "requested" };
}

export function requestLocalDemoPortalUpgradeIntent(
  customerId: string,
  input: CustomerPortalUpgradeIntentInput,
): CustomerPortalUpgradeIntentResult {
  const fixtures = requireLocalDemoFixtures();
  const normalized = validateCustomerPortalUpgradeIntentInput(input);
  const customer = requireCustomer(fixtures, customerId);
  const generatedKey = buildCustomerPortalUpgradeGeneratedKey(
    customer.id,
    normalized.plan_id,
  );
  const alreadyRequested = localDemoPortalUpgradeIntentKeys.has(generatedKey);

  if (!alreadyRequested) {
    localDemoPortalUpgradeIntentKeys.add(generatedKey);
  }

  return {
    notification_id: alreadyRequested
      ? null
      : nextLocalId("portal-upgrade-notification"),
    plan_id: normalized.plan_id,
    status: alreadyRequested ? "already_requested" : "requested",
  };
}
