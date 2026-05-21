import type {
  CustomerStatus,
  DemoSeedRuntimeStatus as SharedDemoSeedRuntimeStatus,
  DemoSeedSummary as SharedDemoSeedSummary,
  InventoryUnit,
  InvoiceStatus,
  JobStatus,
  JobMediaType,
  PropertyType,
  UserRole,
} from "@pest-patrol/types";

export const DEMO_SEED_CONFIRMATION = "seed-demo-data";
export const DEMO_SEED_ADMIN_EMAIL = "demo@email.com";
export const DEMO_SEED_ADMIN_PASSWORD = "password";
export const DEMO_SEED_MARKER = "[pest-patrol-demo-seed-v1]";

export type DemoSeedTarget = "local" | "preview";
export type DemoSeedTable =
  | "adminUsers"
  | "technicians"
  | "customers"
  | "locations"
  | "inventory"
  | "jobs"
  | "chemicalLogs"
  | "formSubmissions"
  | "media"
  | "invoices"
  | "invoiceLineItems"
  | "payments";

export interface DemoSeedGuardrailInput {
  confirm?: string;
  serviceRoleKey?: string;
  supabaseUrl?: string;
  target?: string;
  vercelEnv?: string;
}

export type DemoSeedGuardrailResult =
  | { ok: true; target: DemoSeedTarget }
  | { ok: false; message: string };

export interface DemoSeedAdminUser {
  display_name: string;
  email: string;
  key: string;
  password: string;
  role: Extract<UserRole, "admin" | "dispatcher">;
}

export interface DemoSeedTechnician {
  display_name: string;
  email: string;
  key: string;
  password?: string;
}

export interface DemoSeedCustomer {
  email: string;
  id: string;
  key: string;
  locations: DemoSeedLocation[];
  name: string;
  phone: string;
  property_type: PropertyType;
  service_notes: string;
  status: CustomerStatus;
}

export interface DemoSeedLocation {
  address: string;
  customer_id: string;
  id: string;
  is_primary: boolean;
  nickname: string;
  service_notes: string;
  status: CustomerStatus;
}

export interface DemoSeedInventoryItem {
  current_stock: number;
  epa_number: string;
  id: string;
  key: string;
  name: string;
  reorder_level: number;
  unit: InventoryUnit;
}

export interface DemoSeedJob {
  assigned_technician_key: string;
  customer_id: string;
  id: string;
  inventory_key?: string;
  key: string;
  location_id: string;
  scheduled_end: string;
  scheduled_start: string;
  service_notes: string;
  status: JobStatus;
}

export interface DemoSeedChemicalLog {
  amount_used: number;
  chemical_key: string;
  job_id: string;
  notes: string;
}

export interface DemoSeedFormSubmission {
  form_data: Record<string, unknown>;
  job_id: string;
  template_id: string;
}

export interface DemoSeedMediaItem {
  captured_at: string;
  content: string;
  content_type: "image/svg+xml";
  description: string;
  id: string;
  job_id: string;
  media_type: JobMediaType;
  storage_bucket: "job-media";
  storage_path: string;
}

export interface DemoSeedInvoice {
  customer_id: string;
  due_date: string;
  id: string;
  job_id: string;
  line_items: DemoSeedInvoiceLineItem[];
  notes: string;
  payment?: DemoSeedPayment;
  payment_url: string | null;
  status: InvoiceStatus;
  stripe_payment_link_id: string | null;
  subtotal_cents: number;
  total_cents: number;
}

export interface DemoSeedInvoiceLineItem {
  description: string;
  invoice_id: string;
  quantity: number;
  total_cents: number;
  unit_amount_cents: number;
}

export interface DemoSeedPayment {
  amount_cents: number;
  currency: string;
  invoice_id: string;
  paid_at: string;
  provider: "stripe";
  provider_payment_id: string;
  status: "succeeded";
}

export interface DemoSeedPlan {
  adminUsers: DemoSeedAdminUser[];
  chemicalLogs: DemoSeedChemicalLog[];
  customers: DemoSeedCustomer[];
  formSubmissions: DemoSeedFormSubmission[];
  inventory: DemoSeedInventoryItem[];
  invoices: DemoSeedInvoice[];
  jobs: DemoSeedJob[];
  marker: typeof DEMO_SEED_MARKER;
  media: DemoSeedMediaItem[];
  resetFilters: {
    adminEmail: typeof DEMO_SEED_ADMIN_EMAIL;
    customerEmailPrefix: string;
    customerNamePrefix: string;
    marker: typeof DEMO_SEED_MARKER;
    technicianEmailPrefix: string;
  };
  resetOrder: DemoSeedTable[];
  seedOrder: DemoSeedTable[];
  technicians: DemoSeedTechnician[];
}

export interface DemoSeedRuntimeStatusInput {
  serviceRoleConfigured: boolean;
  supabaseUrl?: string;
  target: DemoSeedTarget;
  vercelEnv?: string;
}

interface DemoSeedPlanInput {
  now?: Date;
  technicianPassword?: string;
}

const treatmentTemplateId = "00000000-0000-4000-8000-000000000101";

function demoId(kind: "c" | "l" | "j" | "i", index: number) {
  const hexKind = {
    c: "c",
    i: "f",
    j: "e",
    l: "d",
  }[kind];

  return `00000000-0000-4000-8000-00000000${hexKind}${String(index).padStart(3, "0")}`;
}

function pacificDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Los_Angeles",
    year: "numeric",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "01";

  return {
    day: Number(value("day")),
    month: Number(value("month")),
    year: Number(value("year")),
  };
}

function addPacificDays(now: Date, days: number) {
  const parts = pacificDateParts(now);
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );

  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function wallClockIso(
  now: Date,
  dayOffset: number,
  hour: number,
  minute: number,
) {
  const parts = addPacificDays(now, dayOffset);

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(
    minute,
  ).padStart(2, "0")}:00.000Z`;
}

function markerNote(note: string) {
  return `${note} ${DEMO_SEED_MARKER}`;
}

const riveraCafeDryStorageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="Synthetic dry storage pest control service photo">
  <rect width="1200" height="800" fill="#eef2f7"/>
  <rect x="70" y="90" width="1060" height="610" rx="18" fill="#f8fafc" stroke="#94a3b8" stroke-width="6"/>
  <rect x="120" y="160" width="420" height="390" fill="#d9e2ec" stroke="#64748b" stroke-width="5"/>
  <rect x="155" y="205" width="350" height="48" fill="#94a3b8"/>
  <rect x="155" y="315" width="350" height="48" fill="#94a3b8"/>
  <rect x="155" y="425" width="350" height="48" fill="#94a3b8"/>
  <rect x="610" y="170" width="430" height="360" rx="12" fill="#fff7ed" stroke="#c2410c" stroke-width="5"/>
  <rect x="665" y="225" width="135" height="110" rx="10" fill="#fde68a" stroke="#92400e" stroke-width="4"/>
  <rect x="835" y="225" width="135" height="110" rx="10" fill="#fde68a" stroke="#92400e" stroke-width="4"/>
  <rect x="665" y="370" width="305" height="85" rx="10" fill="#fed7aa" stroke="#92400e" stroke-width="4"/>
  <circle cx="642" cy="505" r="22" fill="#0f766e"/>
  <path d="M628 505h28M642 491v28" stroke="#ecfeff" stroke-width="7" stroke-linecap="round"/>
  <rect x="130" y="590" width="940" height="52" rx="10" fill="#0f172a"/>
  <text x="160" y="625" fill="#f8fafc" font-family="Arial, sans-serif" font-size="28" font-weight="700">Demo service photo - dry storage monitor check</text>
</svg>`;

const riveraCafeRearEntrySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="Synthetic rear entry pest control service photo">
  <rect width="1200" height="800" fill="#e2e8f0"/>
  <rect x="90" y="110" width="1020" height="560" rx="16" fill="#f8fafc" stroke="#64748b" stroke-width="6"/>
  <rect x="170" y="170" width="310" height="430" fill="#cbd5e1" stroke="#475569" stroke-width="5"/>
  <rect x="520" y="170" width="510" height="430" fill="#dbeafe" stroke="#2563eb" stroke-width="5"/>
  <path d="M520 600h510" stroke="#1e293b" stroke-width="9"/>
  <path d="M565 540c80-55 190-52 265-5 55 34 120 37 170 18" fill="none" stroke="#16a34a" stroke-width="14" stroke-linecap="round"/>
  <rect x="720" y="455" width="96" height="55" rx="8" fill="#0f766e" stroke="#134e4a" stroke-width="4"/>
  <circle cx="750" cy="483" r="7" fill="#ccfbf1"/>
  <circle cx="787" cy="483" r="7" fill="#ccfbf1"/>
  <rect x="150" y="620" width="900" height="52" rx="10" fill="#0f172a"/>
  <text x="180" y="655" fill="#f8fafc" font-family="Arial, sans-serif" font-size="28" font-weight="700">Demo service photo - rear entry exclusion check</text>
</svg>`;

const riveraCafeSignatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 1200 520" role="img" aria-label="Synthetic customer signature">
  <rect width="1200" height="520" fill="#f8fafc"/>
  <rect x="70" y="70" width="1060" height="360" rx="18" fill="#ffffff" stroke="#94a3b8" stroke-width="5"/>
  <text x="110" y="135" fill="#334155" font-family="Arial, sans-serif" font-size="30" font-weight="700">Customer acknowledgement</text>
  <path d="M145 290c65-85 112 55 170-20 32-42 58-64 82-42 27 24-8 92 44 78 38-10 77-83 115-62 31 17 8 78 53 74 67-6 84-98 130-70 37 22-10 92 57 80 55-10 78-66 123-54" fill="none" stroke="#0f172a" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="125" y1="350" x2="965" y2="350" stroke="#cbd5e1" stroke-width="4"/>
  <text x="125" y="395" fill="#475569" font-family="Arial, sans-serif" font-size="24">Jamie Rivera - sample signature for demo only</text>
</svg>`;

export function validateDemoSeedGuardrails(
  input: DemoSeedGuardrailInput,
): DemoSeedGuardrailResult {
  if (input.target !== "local" && input.target !== "preview") {
    return { ok: false, message: "Demo seed target must be local or preview." };
  }

  if (input.confirm !== DEMO_SEED_CONFIRMATION) {
    return {
      ok: false,
      message: `Pass --confirm ${DEMO_SEED_CONFIRMATION} to write demo data.`,
    };
  }

  if (!input.supabaseUrl) {
    return { ok: false, message: "NEXT_PUBLIC_SUPABASE_URL is required." };
  }

  if (!input.serviceRoleKey) {
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY is required." };
  }

  if (input.vercelEnv === "production") {
    return {
      ok: false,
      message: "Demo seed is disabled on production deployments.",
    };
  }

  if (input.target === "local" && !isLocalSupabaseUrl(input.supabaseUrl)) {
    return {
      ok: false,
      message: "Local demo seed requires a local Supabase URL.",
    };
  }

  return { ok: true, target: input.target };
}

function isLocalSupabaseUrl(supabaseUrl?: string) {
  return Boolean(
    supabaseUrl?.startsWith("http://localhost") ||
    supabaseUrl?.startsWith("http://127.0.0.1"),
  );
}

export function buildDemoSeedRuntimeStatus(
  input: DemoSeedRuntimeStatusInput,
): SharedDemoSeedRuntimeStatus {
  if (input.vercelEnv === "production") {
    return {
      available: false,
      environment_label: "Production",
      reason: "Demo seed is disabled on production deployments.",
      target: input.target,
    };
  }

  if (!input.supabaseUrl) {
    return {
      available: false,
      environment_label:
        input.target === "preview" ? "Protected preview demo" : "Local demo",
      reason: "NEXT_PUBLIC_SUPABASE_URL is required.",
      target: input.target,
    };
  }

  if (!input.serviceRoleConfigured) {
    return {
      available: false,
      environment_label:
        input.target === "preview" ? "Protected preview demo" : "Local demo",
      reason: "SUPABASE_SERVICE_ROLE_KEY is required.",
      target: input.target,
    };
  }

  if (input.target === "local" && !isLocalSupabaseUrl(input.supabaseUrl)) {
    return {
      available: false,
      environment_label: "Local demo",
      reason: "Local demo seed requires a local Supabase URL.",
      target: input.target,
    };
  }

  if (input.target === "preview" && input.vercelEnv !== "preview") {
    return {
      available: false,
      environment_label: "Protected preview demo",
      reason: "Preview demo seed must run from a Vercel preview deployment.",
      target: input.target,
    };
  }

  return {
    available: true,
    environment_label:
      input.target === "preview" ? "Protected preview demo" : "Local demo",
    reason: null,
    target: input.target,
  };
}

export function getDemoSeedPlanSummary(
  plan: DemoSeedPlan,
): SharedDemoSeedSummary {
  return {
    admin_users: plan.adminUsers.length,
    chemical_logs: plan.chemicalLogs.length,
    customers: plan.customers.length,
    form_submissions: plan.formSubmissions.length,
    inventory_items: plan.inventory.length,
    invoices: plan.invoices.length,
    jobs: plan.jobs.length,
    locations: plan.customers.reduce(
      (total, customer) => total + customer.locations.length,
      0,
    ),
    media_items: plan.media.length,
    payments: plan.invoices.filter((invoice) => invoice.payment).length,
    technicians: plan.technicians.length,
  };
}

export function buildDemoSeedPlan(input: DemoSeedPlanInput = {}): DemoSeedPlan {
  const now = input.now ?? new Date();
  const technicianPassword = input.technicianPassword;
  const customers: DemoSeedCustomer[] = [
    {
      email: "demo+harbor-hoa@example.test",
      id: demoId("c", 1),
      key: "harbor",
      locations: [
        {
          address: "101 Demo Harbor View Dr, San Diego, CA 92106",
          customer_id: demoId("c", 1),
          id: demoId("l", 1),
          is_primary: true,
          nickname: "Clubhouse",
          service_notes: markerNote(
            "Gate code DEMO-101; exterior service first.",
          ),
          status: "active",
        },
        {
          address: "125 Demo Harbor View Dr, San Diego, CA 92106",
          customer_id: demoId("c", 1),
          id: demoId("l", 2),
          is_primary: false,
          nickname: "Pool equipment room",
          service_notes: markerNote("Check ant activity near pump room."),
          status: "active",
        },
      ],
      name: "Demo - Harbor Heights HOA",
      phone: "555-0101",
      property_type: "commercial",
      service_notes: markerNote("Monthly HOA service with portal follow-up."),
      status: "active",
    },
    {
      email: "demo+rivera-cafe@example.test",
      id: demoId("c", 2),
      key: "rivera",
      locations: [
        {
          address: "220 Demo India St, San Diego, CA 92101",
          customer_id: demoId("c", 2),
          id: demoId("l", 3),
          is_primary: true,
          nickname: "Cafe",
          service_notes: markerNote(
            "Commercial kitchen inspection after lunch rush.",
          ),
          status: "active",
        },
      ],
      name: "Demo - Rivera Cafe",
      phone: "555-0102",
      property_type: "commercial",
      service_notes: markerNote(
        "Food-service customer; keep notes customer-safe.",
      ),
      status: "active",
    },
    {
      email: "demo+nguyen-home@example.test",
      id: demoId("c", 3),
      key: "nguyen",
      locations: [
        {
          address: "48 Demo Cedar Ln, San Diego, CA 92129",
          customer_id: demoId("c", 3),
          id: demoId("l", 4),
          is_primary: true,
          nickname: "Residence",
          service_notes: markerNote("Customer requested morning window."),
          status: "active",
        },
      ],
      name: "Demo - Nguyen Residence",
      phone: "555-0103",
      property_type: "residential",
      service_notes: markerNote("Residential quarterly plan."),
      status: "active",
    },
    {
      email: "demo+mesa-warehouse@example.test",
      id: demoId("c", 4),
      key: "mesa",
      locations: [
        {
          address: "770 Demo Mesa Rd, San Diego, CA 92121",
          customer_id: demoId("c", 4),
          id: demoId("l", 5),
          is_primary: true,
          nickname: "Warehouse",
          service_notes: markerNote(
            "Dock doors and break room are priority areas.",
          ),
          status: "active",
        },
      ],
      name: "Demo - Mesa Warehouse",
      phone: "555-0104",
      property_type: "commercial",
      service_notes: markerNote("Warehouse recurring service account."),
      status: "active",
    },
  ];
  const inventory: DemoSeedInventoryItem[] = [
    {
      current_stock: 96,
      epa_number: "432-1529",
      id: "00000000-0000-4000-8000-00000000a001",
      key: "perimeter",
      name: "Demo - Perimeter Insecticide",
      reorder_level: 24,
      unit: "oz",
    },
    {
      current_stock: 18,
      epa_number: "499-548",
      id: "00000000-0000-4000-8000-00000000a002",
      key: "bait",
      name: "Demo - Ant Bait Stations",
      reorder_level: 6,
      unit: "each",
    },
    {
      current_stock: 42,
      epa_number: "100-1659",
      id: "00000000-0000-4000-8000-00000000a003",
      key: "rodent",
      name: "Demo - Rodent Monitoring Blocks",
      reorder_level: 12,
      unit: "each",
    },
    {
      current_stock: 12,
      epa_number: "352-888",
      id: "00000000-0000-4000-8000-00000000a004",
      key: "dust",
      name: "Demo - Crack and Crevice Dust",
      reorder_level: 4,
      unit: "oz",
    },
    {
      current_stock: 6,
      epa_number: "N/A",
      id: "00000000-0000-4000-8000-00000000a005",
      key: "glueboard",
      name: "Demo - Glueboard Monitors",
      reorder_level: 12,
      unit: "each",
    },
    {
      current_stock: 3,
      epa_number: "432-1544",
      id: "00000000-0000-4000-8000-00000000a006",
      key: "aerosol",
      name: "Demo - Wasp Knockdown Aerosol",
      reorder_level: 5,
      unit: "each",
    },
  ];
  const jobs: DemoSeedJob[] = [
    {
      assigned_technician_key: "maya",
      customer_id: demoId("c", 1),
      id: demoId("j", 1),
      inventory_key: "perimeter",
      key: "harbor-today",
      location_id: demoId("l", 1),
      scheduled_end: wallClockIso(now, 0, 10, 38),
      scheduled_start: wallClockIso(now, 0, 9, 38),
      service_notes: markerNote(
        "Exterior perimeter, clubhouse kitchen, and pool room.",
      ),
      status: "scheduled",
    },
    {
      assigned_technician_key: "eli",
      customer_id: demoId("c", 2),
      id: demoId("j", 2),
      inventory_key: "bait",
      key: "rivera-completed",
      location_id: demoId("l", 3),
      scheduled_end: wallClockIso(now, 0, 8, 45),
      scheduled_start: wallClockIso(now, 0, 7, 45),
      service_notes: markerNote(
        "Completed cafe service with customer-safe closeout.",
      ),
      status: "completed",
    },
    {
      assigned_technician_key: "maya",
      customer_id: demoId("c", 3),
      id: demoId("j", 3),
      key: "nguyen-today",
      location_id: demoId("l", 4),
      scheduled_end: wallClockIso(now, 0, 12, 15),
      scheduled_start: wallClockIso(now, 0, 11, 15),
      service_notes: markerNote("Quarterly residential service."),
      status: "en_route",
    },
    {
      assigned_technician_key: "sol",
      customer_id: demoId("c", 4),
      id: demoId("j", 4),
      inventory_key: "rodent",
      key: "mesa-tomorrow",
      location_id: demoId("l", 5),
      scheduled_end: wallClockIso(now, 1, 10, 30),
      scheduled_start: wallClockIso(now, 1, 9, 0),
      service_notes: markerNote("Warehouse dock-door inspection."),
      status: "scheduled",
    },
    {
      assigned_technician_key: "eli",
      customer_id: demoId("c", 1),
      id: demoId("j", 5),
      inventory_key: "dust",
      key: "harbor-followup",
      location_id: demoId("l", 2),
      scheduled_end: wallClockIso(now, 1, 14, 0),
      scheduled_start: wallClockIso(now, 1, 13, 0),
      service_notes: markerNote("Pool equipment room follow-up."),
      status: "scheduled",
    },
  ];
  const invoices: DemoSeedInvoice[] = [
    {
      customer_id: demoId("c", 1),
      due_date: wallClockIso(now, 14, 17, 0),
      id: demoId("i", 1),
      job_id: demoId("j", 1),
      line_items: [
        {
          description: "Demo HOA monthly service",
          invoice_id: demoId("i", 1),
          quantity: 1,
          total_cents: 28500,
          unit_amount_cents: 28500,
        },
      ],
      notes: markerNote("Synthetic sent invoice with fake payment link."),
      payment_url: "https://pay.example.test/demo-harbor-invoice",
      status: "sent",
      stripe_payment_link_id: "demo_plink_harbor_sent",
      subtotal_cents: 28500,
      total_cents: 28500,
    },
    {
      customer_id: demoId("c", 2),
      due_date: wallClockIso(now, 7, 17, 0),
      id: demoId("i", 2),
      job_id: demoId("j", 2),
      line_items: [
        {
          description: "Demo cafe pest service",
          invoice_id: demoId("i", 2),
          quantity: 1,
          total_cents: 14500,
          unit_amount_cents: 14500,
        },
      ],
      notes: markerNote(
        "Synthetic paid invoice for demo ledger and portal billing.",
      ),
      payment: {
        amount_cents: 14500,
        currency: "usd",
        invoice_id: demoId("i", 2),
        paid_at: wallClockIso(now, 0, 9, 10),
        provider: "stripe",
        provider_payment_id: "demo_pi_rivera_paid",
        status: "succeeded",
      },
      payment_url: null,
      status: "paid",
      stripe_payment_link_id: "demo_plink_rivera_paid",
      subtotal_cents: 14500,
      total_cents: 14500,
    },
  ];
  const media: DemoSeedMediaItem[] = [
    {
      captured_at: wallClockIso(now, 0, 8, 24),
      content: riveraCafeDryStorageSvg,
      content_type: "image/svg+xml",
      description: "Dry storage monitor check",
      id: "00000000-0000-4000-8000-000000009001",
      job_id: demoId("j", 2),
      media_type: "photo",
      storage_bucket: "job-media",
      storage_path: `${demoId("j", 2)}/demo-rivera-cafe-dry-storage.svg`,
    },
    {
      captured_at: wallClockIso(now, 0, 8, 32),
      content: riveraCafeRearEntrySvg,
      content_type: "image/svg+xml",
      description: "Rear entry exclusion check",
      id: "00000000-0000-4000-8000-000000009002",
      job_id: demoId("j", 2),
      media_type: "photo",
      storage_bucket: "job-media",
      storage_path: `${demoId("j", 2)}/demo-rivera-cafe-rear-entry.svg`,
    },
    {
      captured_at: wallClockIso(now, 0, 8, 42),
      content: riveraCafeSignatureSvg,
      content_type: "image/svg+xml",
      description: "Signed by Jamie Rivera",
      id: "00000000-0000-4000-8000-000000009003",
      job_id: demoId("j", 2),
      media_type: "signature",
      storage_bucket: "job-media",
      storage_path: `${demoId("j", 2)}/demo-rivera-cafe-signature.svg`,
    },
  ];

  return {
    adminUsers: [
      {
        display_name: "Demo - Admin",
        email: DEMO_SEED_ADMIN_EMAIL,
        key: "demo-admin",
        password: DEMO_SEED_ADMIN_PASSWORD,
        role: "admin",
      },
    ],
    chemicalLogs: [
      {
        amount_used: 2,
        chemical_key: "bait",
        job_id: demoId("j", 2),
        notes: markerNote(
          "Placed demo bait stations under prep sink and dry storage on the San Diego cafe route.",
        ),
      },
      {
        amount_used: 1.5,
        chemical_key: "perimeter",
        job_id: demoId("j", 2),
        notes: markerNote(
          "Spot-treated rear entry threshold per demo label directions.",
        ),
      },
      {
        amount_used: 4,
        chemical_key: "glueboard",
        job_id: demoId("j", 2),
        notes: markerNote(
          "Placed numbered monitors in dry storage and rear entry corners.",
        ),
      },
    ],
    customers,
    formSubmissions: [
      {
        form_data: {
          areas_treated: "Kitchen, dry storage, rear entry",
          application_method:
            "Locked bait placements, rear-entry spot treatment, and monitor placement.",
          customer_instructions:
            "Keep floor drains clear and call if activity returns.",
          epa_label_reviewed: true,
          follow_up_required: false,
          materials_applied: "Demo bait stations",
          service_branch: "San Diego commercial route",
          target_pests: "Ants",
          weather_conditions: "Interior service with dry rear-entry threshold.",
        },
        job_id: demoId("j", 2),
        template_id: treatmentTemplateId,
      },
      {
        form_data: {
          areas_treated:
            "Rear entry, dry storage shelving, refuse corral threshold",
          application_method:
            "Inspection, exclusion check, and numbered monitor placement.",
          customer_instructions:
            "Keep rear door sweep clear and report activity near dry goods.",
          epa_label_reviewed: true,
          follow_up_required: true,
          materials_applied:
            "Demo glueboard monitors and sanitation recommendations",
          service_branch: "San Diego commercial route",
          target_pests: "Rodent activity indicators and occasional ants",
          weather_conditions: "No rain; access completed before opening rush.",
        },
        job_id: demoId("j", 2),
        template_id: treatmentTemplateId,
      },
    ],
    inventory,
    invoices,
    jobs,
    marker: DEMO_SEED_MARKER,
    media,
    resetFilters: {
      adminEmail: DEMO_SEED_ADMIN_EMAIL,
      customerEmailPrefix: "demo+",
      customerNamePrefix: "Demo - ",
      marker: DEMO_SEED_MARKER,
      technicianEmailPrefix: "demo+tech-",
    },
    resetOrder: [
      "payments",
      "invoiceLineItems",
      "invoices",
      "formSubmissions",
      "chemicalLogs",
      "media",
      "jobs",
      "inventory",
      "locations",
      "customers",
      "technicians",
      "adminUsers",
    ],
    seedOrder: [
      "adminUsers",
      "technicians",
      "customers",
      "inventory",
      "jobs",
      "chemicalLogs",
      "formSubmissions",
      "media",
      "invoices",
      "payments",
    ],
    technicians: [
      {
        display_name: "Demo - Maya Chen",
        email: "demo+tech-maya@example.test",
        key: "maya",
        password: technicianPassword,
      },
      {
        display_name: "Demo - Eli Brooks",
        email: "demo+tech-eli@example.test",
        key: "eli",
        password: technicianPassword,
      },
      {
        display_name: "Demo - Sol Ramirez",
        email: "demo+tech-sol@example.test",
        key: "sol",
        password: technicianPassword,
      },
    ],
  };
}
