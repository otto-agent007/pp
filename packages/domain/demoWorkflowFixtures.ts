import type {
  ChemicalInventoryItem,
  ChemicalLog,
  CloseoutCaptureSummary,
  Customer,
  CustomerPortalAccessTokenEventSummary,
  CustomerPortalAccessTokenSummary,
  CustomerPortalProviderStatus,
  FormValue,
  Invoice,
  InvoiceLineItem,
  Job,
  JobGeofenceEvent,
  JobFormSubmission,
  JobMedia,
  PaymentRecord,
  TechnicianProfile,
  UserProfile,
} from "@pest-patrol/types";

import { buildDemoSeedPlan } from "./demoSeedData";
import { defaultTreatmentFormTemplate } from "./forms";
import { JOB_MEDIA_BUCKET } from "./media";

export interface DemoWorkflowFixtureEnv {
  nodeEnv?: string;
  supabaseAnonKey?: string;
  supabaseUrl?: string;
}

export interface DemoWorkflowFixtures {
  adminProfile: UserProfile;
  chemicalLogs: ChemicalLog[];
  closeoutSummaries: CloseoutCaptureSummary[];
  customers: Customer[];
  formSubmissions: JobFormSubmission[];
  geofenceEvents: JobGeofenceEvent[];
  inventory: ChemicalInventoryItem[];
  invoices: Invoice[];
  jobs: Job[];
  media: JobMedia[];
  portalAccessTokenEventsByTokenId: Record<
    string,
    CustomerPortalAccessTokenEventSummary[]
  >;
  portalAccessTokensByCustomerId: Record<
    string,
    CustomerPortalAccessTokenSummary[]
  >;
  portalProviderStatus: CustomerPortalProviderStatus;
  technicians: TechnicianProfile[];
}

interface DemoWorkflowFixtureInput {
  now?: Date;
}

const adminProfileId = "00000000-0000-4000-8000-000000000001";
const technicianIdsByKey = new Map([
  ["maya", "00000000-0000-4000-8000-00000000b001"],
  ["eli", "00000000-0000-4000-8000-00000000b002"],
  ["sol", "00000000-0000-4000-8000-00000000b003"],
]);
const demoGpsSignalsByJobKey: ReadonlyMap<
  string,
  { latitude: number; longitude: number }
> = new Map([
  ["harbor-today", { latitude: 32.7422, longitude: -117.1772 }],
  ["rivera-completed", { latitude: 32.7157, longitude: -117.1611 }],
  ["nguyen-today", { latitude: 32.9595, longitude: -117.1172 }],
  ["mesa-tomorrow", { latitude: 32.9023, longitude: -117.2022 }],
]);

function timestamp(now: Date) {
  return now.toISOString();
}

function fixtureId(kind: string, index: number) {
  return `00000000-0000-4000-8000-0000000${kind}${String(index).padStart(
    4,
    "0",
  )}`;
}

function sanitizeFormData(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
        ? (value as FormValue)
        : null,
    ]),
  );
}

function demoMediaUrl(storagePath: string) {
  const parts = storagePath.split("/");
  return `/demo-media/${parts[parts.length - 1] ?? storagePath}`;
}

function cloneJob(job: Job): Job {
  return {
    ...job,
    assigned_technician: job.assigned_technician
      ? { ...job.assigned_technician }
      : null,
    customer: job.customer
      ? {
          ...job.customer,
          locations: job.customer.locations?.map((location) => ({
            ...location,
          })),
        }
      : undefined,
    location: job.location ? { ...job.location } : undefined,
  };
}

export function shouldUseLocalDemoFixtures(env: DemoWorkflowFixtureEnv) {
  if (env.nodeEnv === "production") {
    return false;
  }

  return !env.supabaseUrl || !env.supabaseAnonKey;
}

export function buildDemoWorkflowFixtures(
  input: DemoWorkflowFixtureInput = {},
): DemoWorkflowFixtures {
  const now = input.now ?? new Date();
  const createdAt = timestamp(now);
  const plan = buildDemoSeedPlan({ now });
  const adminUser = plan.adminUsers[0];
  const adminProfile: UserProfile = {
    id: adminProfileId,
    role: adminUser.role,
    email: adminUser.email,
    display_name: adminUser.display_name,
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
  };
  const technicians = plan.technicians.map((technician): TechnicianProfile => {
    const id = technicianIdsByKey.get(technician.key);

    if (!id) {
      throw new Error(`Missing demo technician ${technician.key}`);
    }

    return {
      id,
      role: "technician",
      email: technician.email,
      display_name: technician.display_name,
      status: "active",
      created_at: createdAt,
      updated_at: createdAt,
    };
  });
  const techniciansByKey = new Map(
    plan.technicians.map((technician, index) => [
      technician.key,
      technicians[index],
    ]),
  );
  const customers: Customer[] = plan.customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    property_type: customer.property_type,
    service_notes: customer.service_notes,
    status: customer.status,
    created_at: createdAt,
    updated_at: createdAt,
    locations: customer.locations.map((location) => ({
      id: location.id,
      customer_id: location.customer_id,
      address: location.address,
      nickname: location.nickname,
      service_notes: location.service_notes,
      is_primary: location.is_primary,
      status: location.status,
      created_at: createdAt,
      updated_at: createdAt,
    })),
  }));
  const customersById = new Map(
    customers.map((customer) => [customer.id, customer]),
  );
  const locationsById = new Map(
    customers.flatMap((customer) =>
      (customer.locations ?? []).map(
        (location) => [location.id, location] as const,
      ),
    ),
  );
  const inventory: ChemicalInventoryItem[] = plan.inventory.map((item) => ({
    id: item.id,
    name: item.name,
    epa_number: item.epa_number,
    current_stock: item.current_stock,
    unit: item.unit,
    reorder_level: item.reorder_level,
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
  }));
  const inventoryByKey = new Map(
    plan.inventory.map((item) => [item.key, item.id]),
  );
  const inventoryById = new Map(inventory.map((item) => [item.id, item]));
  const jobs: Job[] = plan.jobs.map((job) => {
    const assignedTechnician = techniciansByKey.get(
      job.assigned_technician_key,
    );

    return {
      id: job.id,
      customer_id: job.customer_id,
      location_id: job.location_id,
      assigned_tech_id: assignedTechnician?.id ?? null,
      status: job.status,
      scheduled_start: job.scheduled_start,
      scheduled_end: job.scheduled_end,
      service_notes: job.service_notes,
      created_at: createdAt,
      updated_at: createdAt,
      customer: customersById.get(job.customer_id),
      location: locationsById.get(job.location_id),
      assigned_technician: assignedTechnician ?? null,
    };
  });
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const geofenceEvents = plan.jobs.reduce<JobGeofenceEvent[]>(
    (events, job, index) => {
      const coordinates = demoGpsSignalsByJobKey.get(job.key);
      const assignedTechnician = techniciansByKey.get(
        job.assigned_technician_key,
      );

      if (!coordinates || !assignedTechnician) {
        return events;
      }

      events.push({
        id: fixtureId("8", index + 1),
        job_id: job.id,
        event_type: "departure",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy_m: 18 + index,
        distance_m: null,
        within_radius: null,
        recorded_by: assignedTechnician.id,
        client_event_id: fixtureId("9", index + 1),
        captured_at: job.scheduled_start,
        created_at: job.scheduled_start,
        job: jobsById.get(job.id),
      });

      return events;
    },
    [],
  );
  const chemicalLogs: ChemicalLog[] = plan.chemicalLogs.map((log, index) => {
    const chemicalId = inventoryByKey.get(log.chemical_key);

    if (!chemicalId) {
      throw new Error(`Missing demo chemical ${log.chemical_key}`);
    }

    return {
      id: fixtureId("1", index + 1),
      job_id: log.job_id,
      chemical_id: chemicalId,
      amount_used: log.amount_used,
      notes: log.notes,
      created_at: createdAt,
      chemical: inventoryById.get(chemicalId),
      job: jobsById.get(log.job_id),
    };
  });
  const formSubmissions: JobFormSubmission[] = plan.formSubmissions.map(
    (submission, index) => ({
      id: fixtureId("2", index + 1),
      job_id: submission.job_id,
      template_id: submission.template_id,
      form_data: sanitizeFormData(submission.form_data),
      submitted_by: jobsById.get(submission.job_id)?.assigned_tech_id ?? null,
      submitted_at: createdAt,
      created_at: createdAt,
      updated_at: createdAt,
      template: defaultTreatmentFormTemplate,
      job: jobsById.get(submission.job_id),
    }),
  );
  const media: JobMedia[] = plan.media.map((item) => {
    const job = jobsById.get(item.job_id);

    if (!job) {
      throw new Error(`Missing demo media job ${item.job_id}`);
    }

    return {
      id: item.id,
      job_id: item.job_id,
      media_type: item.media_type,
      storage_bucket: JOB_MEDIA_BUCKET,
      storage_path: item.storage_path,
      signed_url: demoMediaUrl(item.storage_path),
      description: item.description,
      uploaded_by: job.assigned_tech_id,
      captured_at: item.captured_at,
      created_at: createdAt,
      updated_at: createdAt,
      job,
    };
  });
  const invoices: Invoice[] = plan.invoices.map((invoice, invoiceIndex) => {
    const lineItems: InvoiceLineItem[] = invoice.line_items.map(
      (item, lineItemIndex) => ({
        id: fixtureId("4", invoiceIndex * 10 + lineItemIndex + 1),
        invoice_id: item.invoice_id,
        description: item.description,
        quantity: item.quantity,
        unit_amount_cents: item.unit_amount_cents,
        total_cents: item.total_cents,
        created_at: createdAt,
      }),
    );
    const payments: PaymentRecord[] = invoice.payment
      ? [
          {
            id: fixtureId("5", invoiceIndex + 1),
            invoice_id: invoice.payment.invoice_id,
            provider: invoice.payment.provider,
            provider_payment_id: invoice.payment.provider_payment_id,
            status: invoice.payment.status,
            amount_cents: invoice.payment.amount_cents,
            currency: invoice.payment.currency,
            paid_at: invoice.payment.paid_at,
            created_at: createdAt,
            updated_at: createdAt,
          },
        ]
      : [];

    return {
      id: invoice.id,
      job_id: invoice.job_id,
      customer_id: invoice.customer_id,
      status: invoice.status,
      currency: "usd",
      subtotal_cents: invoice.subtotal_cents,
      total_cents: invoice.total_cents,
      due_date: invoice.due_date,
      notes: invoice.notes,
      payment_url: invoice.payment_url,
      stripe_payment_link_id: invoice.stripe_payment_link_id,
      created_at: createdAt,
      updated_at: createdAt,
      job: jobsById.get(invoice.job_id),
      customer: customersById.get(invoice.customer_id),
      line_items: lineItems,
      payments,
    };
  });
  const closeoutSummaries = jobs.map(
    (job): CloseoutCaptureSummary => ({
      jobId: job.id,
      forms: formSubmissions.filter(
        (submission) => submission.job_id === job.id,
      ).length,
      chemicalLogs: chemicalLogs.filter((log) => log.job_id === job.id).length,
      photos: media.filter(
        (item) => item.job_id === job.id && item.media_type === "photo",
      ).length,
      signatures: media.filter(
        (item) => item.job_id === job.id && item.media_type === "signature",
      ).length,
    }),
  );
  const portalTokenId = fixtureId("6", 1);
  const portalAccessTokensByCustomerId: Record<
    string,
    CustomerPortalAccessTokenSummary[]
  > = {
    [plan.customers[1].id]: [
      {
        id: portalTokenId,
        customer_id: plan.customers[1].id,
        status: "active",
        expires_at: null,
        last_used_at: createdAt,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
  };
  const portalAccessTokenEventsByTokenId: Record<
    string,
    CustomerPortalAccessTokenEventSummary[]
  > = {
    [portalTokenId]: [
      {
        id: fixtureId("7", 1),
        token_id: portalTokenId,
        customer_id: plan.customers[1].id,
        kind: "generated",
        occurred_at: createdAt,
      },
      {
        id: fixtureId("7", 2),
        token_id: portalTokenId,
        customer_id: plan.customers[1].id,
        kind: "opened",
        occurred_at: createdAt,
      },
    ],
  };

  return {
    adminProfile,
    chemicalLogs,
    closeoutSummaries,
    customers,
    formSubmissions,
    geofenceEvents,
    inventory,
    invoices,
    jobs: jobs.map(cloneJob),
    media,
    portalAccessTokenEventsByTokenId,
    portalAccessTokensByCustomerId,
    portalProviderStatus: {
      provider: "manual",
      webhook_configured: false,
      webhook_secret_configured: false,
    },
    technicians,
  };
}
