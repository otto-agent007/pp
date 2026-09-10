import type {
  CustomerStatus,
  DemoSeedRuntimeStatus as SharedDemoSeedRuntimeStatus,
  DemoSeedSummary as SharedDemoSeedSummary,
  InventoryStatus,
  InventoryUnit,
  JobBillingDisposition,
  JobEstimateStatus,
  JobPurpose,
  JobServiceCadence,
  InvoiceStatus,
  JobStatus,
  JobMediaType,
  PaymentStatus,
  PropertyType,
  ServiceBillingFamily,
  ServiceBillingOfferingId,
  UserRole,
} from "@pest-patrol/types";

export const DEMO_SEED_CONFIRMATION = "seed-demo-data";
export const DEMO_SEED_ADMIN_EMAIL = "demo@email.com";
// The demo admin password is deliberately NOT a shipped constant: it used to be
// a literal here, which meant every browser that loaded the sign-in page
// received it in the client bundle and the value was also printed in the public
// README. It now comes from DEMO_SEED_ADMIN_PASSWORD, which is read server-side
// at seed time only. The local-development fallback keeps `pnpm demo:seed`
// one-command on a throwaway local database.
export const DEMO_SEED_ADMIN_PASSWORD_ENV = "DEMO_SEED_ADMIN_PASSWORD";

const LOCAL_DEV_DEMO_ADMIN_PASSWORD = "password";

export function resolveDemoSeedAdminPassword(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env[DEMO_SEED_ADMIN_PASSWORD_ENV]?.trim();

  if (configured) {
    return configured;
  }

  // NODE_ENV is "production" for every built deployment, previews included, and
  // previews share the live Supabase project — so refuse rather than fall back.
  if (env.NODE_ENV === "production") {
    throw new Error(
      `${DEMO_SEED_ADMIN_PASSWORD_ENV} must be set before seeding demo data outside local development.`,
    );
  }

  return LOCAL_DEV_DEMO_ADMIN_PASSWORD;
}
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
  previewSecretConfigured?: boolean;
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
  latitude?: number;
  longitude?: number;
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
  status?: InventoryStatus;
  unit: InventoryUnit;
}

export interface DemoSeedJob {
  assigned_technician_key?: string | null;
  billing_disposition?: JobBillingDisposition;
  customer_id: string;
  estimate_status?: JobEstimateStatus;
  id: string;
  inventory_key?: string;
  job_purpose?: JobPurpose;
  key: string;
  location_id: string;
  parent_job_id?: string | null;
  scheduled_end: string;
  scheduled_start: string;
  service_cadence?: JobServiceCadence;
  service_family?: ServiceBillingFamily | null;
  service_notes: string;
  service_offering_id?: ServiceBillingOfferingId | null;
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
  paid_at: string | null;
  provider: "stripe";
  provider_payment_id: string;
  status: PaymentStatus;
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
  previewSecretConfigured?: boolean;
  serviceRoleConfigured: boolean;
  supabaseUrl?: string;
  target: DemoSeedTarget;
  vercelEnv?: string;
}

interface DemoSeedPlanInput {
  adminPassword?: string;
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

function dispatchWeekStartParts(now: Date) {
  const parts = pacificDateParts(now);
  const current = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  current.setUTCDate(current.getUTCDate() - current.getUTCDay());

  return {
    day: current.getUTCDate(),
    month: current.getUTCMonth() + 1,
    year: current.getUTCFullYear(),
  };
}

function dispatchWeekWallClockIso(
  now: Date,
  weekday: number,
  hour: number,
  minute: number,
) {
  const start = dispatchWeekStartParts(now);
  const date = new Date(
    Date.UTC(start.year, start.month - 1, start.day + weekday),
  );

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}T${String(hour).padStart(
    2,
    "0",
  )}:${String(minute).padStart(2, "0")}:00.000Z`;
}

function currentWeekRelativeWallClockIso(
  now: Date,
  dayOffset: number,
  hour: number,
  minute: number,
) {
  const parts = pacificDateParts(now);
  const current = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();
  const weekday = Math.max(0, Math.min(6, current + dayOffset));

  return dispatchWeekWallClockIso(now, weekday, hour, minute);
}

const generatedCustomerAreas = [
  "Adams Avenue",
  "Balboa Park",
  "Bay Ho",
  "Bird Rock",
  "Carmel Valley",
  "Clairemont",
  "College Area",
  "Cortez Hill",
  "Del Cerro",
  "Eastlake",
  "El Cajon",
  "Encanto",
  "Golden Hill",
  "Grantville",
  "Imperial Beach",
  "Kensington",
  "La Mesa",
  "Linda Vista",
  "Little Italy",
  "Mission Hills",
  "Mira Mesa",
  "Normal Heights",
  "Ocean Beach",
  "Old Town",
  "Pacific Beach",
  "Rancho Bernardo",
  "Rancho Penasquitos",
  "Santee",
  "Serra Mesa",
  "South Park",
  "Tierrasanta",
  "University City",
];

const generatedCustomerTypes: PropertyType[] = [
  "commercial",
  "residential",
  "commercial",
  "other",
];

const sanDiegoDemoCoordinates: Array<{ latitude: number; longitude: number }> =
  [
    { latitude: 32.7422, longitude: -117.1772 },
    { latitude: 32.7446, longitude: -117.1846 },
    { latitude: 32.7157, longitude: -117.1611 },
    { latitude: 32.9595, longitude: -117.1172 },
    { latitude: 32.9023, longitude: -117.2022 },
    { latitude: 32.7924, longitude: -117.2531 },
    { latitude: 32.7912, longitude: -117.2508 },
    { latitude: 32.8283, longitude: -117.1516 },
    { latitude: 32.7496, longitude: -117.1299 },
    { latitude: 32.7519, longitude: -117.1324 },
    { latitude: 32.8899, longitude: -117.2325 },
    { latitude: 32.6401, longitude: -117.0842 },
    { latitude: 32.6418, longitude: -117.0861 },
    { latitude: 32.8429, longitude: -117.2721 },
    { latitude: 32.7839, longitude: -117.1048 },
    { latitude: 32.7852, longitude: -117.1064 },
    { latitude: 32.5558, longitude: -116.9382 },
    { latitude: 32.7506, longitude: -117.1664 },
    { latitude: 32.7512, longitude: -117.1689 },
    { latitude: 32.7218, longitude: -117.2309 },
    { latitude: 32.7294, longitude: -117.1605 },
    { latitude: 32.7317, longitude: -117.1629 },
    { latitude: 32.9599, longitude: -117.2653 },
    { latitude: 32.9627, longitude: -117.0382 },
    { latitude: 32.9644, longitude: -117.0415 },
    { latitude: 32.7116, longitude: -117.1538 },
  ];

function demoCoordinateForLocation(index: number) {
  const base = sanDiegoDemoCoordinates[index % sanDiegoDemoCoordinates.length];
  const routeRing = Math.floor(index / sanDiegoDemoCoordinates.length);

  return {
    latitude: Number((base.latitude + routeRing * 0.0013).toFixed(4)),
    longitude: Number((base.longitude + routeRing * 0.0012).toFixed(4)),
  };
}

function withDemoLocationCoordinates(
  customers: DemoSeedCustomer[],
): DemoSeedCustomer[] {
  let locationIndex = 0;

  return customers.map((customer) => ({
    ...customer,
    locations: customer.locations.map((location) => ({
      ...location,
      ...demoCoordinateForLocation(locationIndex++),
    })),
  }));
}

function buildGeneratedCustomers(
  startIndex: number,
  targetCount: number,
): DemoSeedCustomer[] {
  return Array.from(
    { length: Math.max(targetCount - startIndex + 1, 0) },
    (_, offset) => {
      const index = startIndex + offset;
      const area =
        generatedCustomerAreas[offset % generatedCustomerAreas.length];
      const propertyType =
        generatedCustomerTypes[offset % generatedCustomerTypes.length];
      const nameSuffix =
        propertyType === "residential"
          ? "Residence"
          : propertyType === "other"
            ? "Community"
            : offset % 3 === 0
              ? "Market"
              : offset % 3 === 1
                ? "Office"
                : "Plaza";

      return {
        email: `demo+customer-${String(index).padStart(3, "0")}@example.test`,
        id: demoId("c", index),
        key: `generated-${String(index).padStart(3, "0")}`,
        locations: [
          {
            address: `${100 + index} Demo ${area} Rd, San Diego, CA 921${String(
              index % 90,
            ).padStart(2, "0")}`,
            customer_id: demoId("c", index),
            id: demoId("l", 26 + offset + 1),
            is_primary: true,
            nickname: "Primary service site",
            service_notes: markerNote(
              `Generated San Diego demo stop for ${area}.`,
            ),
            status: "active",
          },
        ],
        name: `Demo - ${area} ${nameSuffix} ${String(index).padStart(3, "0")}`,
        phone: `555-${String(1000 + index).slice(-4)}`,
        property_type: propertyType,
        service_notes: markerNote(
          `Generated large-demo account for ${area} route density.`,
        ),
        status: "active",
      };
    },
  );
}

function buildDemoTechnicians(
  technicianPassword?: string,
): DemoSeedTechnician[] {
  return [
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
    {
      display_name: "Demo - Priya Shah",
      email: "demo+tech-priya@example.test",
      key: "priya",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Dante Miller",
      email: "demo+tech-dante@example.test",
      key: "dante",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Iris Santos",
      email: "demo+tech-iris@example.test",
      key: "iris",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Noa Patel",
      email: "demo+tech-noa@example.test",
      key: "noa",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Leo Watkins",
      email: "demo+tech-leo@example.test",
      key: "leo",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Zara Kim",
      email: "demo+tech-zara@example.test",
      key: "zara",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Omar Castillo",
      email: "demo+tech-omar@example.test",
      key: "omar",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Nina Alvarez",
      email: "demo+tech-nina@example.test",
      key: "nina",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Gabe Foster",
      email: "demo+tech-gabe@example.test",
      key: "gabe",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Mira Vaughn",
      email: "demo+tech-mira@example.test",
      key: "mira",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Reece Turner",
      email: "demo+tech-reece@example.test",
      key: "reece",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Talia Morgan",
      email: "demo+tech-talia@example.test",
      key: "talia",
      password: technicianPassword,
    },
    {
      display_name: "Demo - Wes Ito",
      email: "demo+tech-wes@example.test",
      key: "wes",
      password: technicianPassword,
    },
  ];
}

const generatedJobStatuses: JobStatus[] = [
  "scheduled",
  "scheduled",
  "en_route",
  "in_progress",
  "completed",
  "scheduled",
  "canceled",
];

function buildGeneratedJobs({
  customers,
  existingCount,
  inventory,
  now,
  targetCount,
  technicians,
}: {
  customers: DemoSeedCustomer[];
  existingCount: number;
  inventory: DemoSeedInventoryItem[];
  now: Date;
  targetCount: number;
  technicians: DemoSeedTechnician[];
}): DemoSeedJob[] {
  const technicianKeys = technicians.map((technician) => technician.key);

  return Array.from(
    { length: Math.max(targetCount - existingCount, 0) },
    (_, offset) => {
      const index = existingCount + offset + 1;
      const customer = customers[(index - 1) % customers.length];
      const location =
        customer.locations[(index - 1) % customer.locations.length];
      const assigned_technician_key =
        index % 15 === 0
          ? null
          : technicianKeys[(index - 1) % technicianKeys.length];
      const hour = 7 + ((index - 1) % 10);
      const minute = [0, 15, 30, 45][(index - 1) % 4];

      return {
        assigned_technician_key,
        customer_id: customer.id,
        id: demoId("j", index),
        inventory_key: inventory[(index - 1) % inventory.length]?.key,
        key: `generated-weekly-${String(index).padStart(3, "0")}`,
        location_id: location.id,
        scheduled_end: dispatchWeekWallClockIso(
          now,
          (index - 1) % 7,
          hour + 1,
          minute,
        ),
        scheduled_start: dispatchWeekWallClockIso(
          now,
          (index - 1) % 7,
          hour,
          minute,
        ),
        service_notes: markerNote(
          `Generated weekly route stop ${index} for the large editable demo.`,
        ),
        status: generatedJobStatuses[index % generatedJobStatuses.length],
      };
    },
  );
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

const intentionalFieldCaptureGapJobKeys = new Set([
  "mission-brewery-completed",
  "del-mar-completed",
  "generated-weekly-039",
]);
const baseChemicalLogJobIds = new Set([
  demoId("j", 1),
  demoId("j", 2),
  demoId("j", 8),
  demoId("j", 10),
  demoId("j", 12),
  demoId("j", 20),
  demoId("j", 25),
  demoId("j", 29),
]);
const baseFormSubmissionJobIds = new Set([
  demoId("j", 1),
  demoId("j", 2),
  demoId("j", 8),
  demoId("j", 10),
  demoId("j", 12),
  demoId("j", 20),
  demoId("j", 25),
]);
const basePhotoJobIds = new Set([
  demoId("j", 2),
  demoId("j", 20),
  demoId("j", 25),
]);
const baseSignatureJobIds = new Set([demoId("j", 2), demoId("j", 29)]);

function isProductionReadyCloseoutJob(job: DemoSeedJob) {
  return (
    job.status === "completed" &&
    !intentionalFieldCaptureGapJobKeys.has(job.key)
  );
}

function buildSupplementalDemoChemicalLogs(
  jobs: DemoSeedJob[],
): DemoSeedChemicalLog[] {
  return jobs
    .filter(isProductionReadyCloseoutJob)
    .filter((job) => !baseChemicalLogJobIds.has(job.id))
    .map((job, index) => ({
      amount_used: 1 + (index % 4) * 0.5,
      chemical_key: job.inventory_key ?? "perimeter",
      job_id: job.id,
      notes: markerNote(
        `Production demo chemical usage captured for ${job.key}.`,
      ),
    }));
}

function buildSupplementalDemoFormSubmissions(
  jobs: DemoSeedJob[],
): DemoSeedFormSubmission[] {
  return jobs
    .filter(isProductionReadyCloseoutJob)
    .filter((job) => !baseFormSubmissionJobIds.has(job.id))
    .map((job, index) => ({
      form_data: {
        areas_treated: "Primary service area, entry points, and activity zones",
        application_method:
          "Inspection, targeted placement, sanitation review, and customer walkthrough.",
        customer_instructions:
          "Review portal proof, keep access points clear, and report renewed activity.",
        epa_label_reviewed: true,
        follow_up_required: index % 5 === 0,
        materials_applied: `Demo material: ${job.inventory_key ?? "perimeter"}`,
        service_branch: "San Diego production demo route",
        target_pests: "Ants, rodents, and occasional seasonal activity",
        weather_conditions:
          "Clear field conditions recorded with GPS evidence.",
      },
      job_id: job.id,
      template_id: treatmentTemplateId,
    }));
}

function supplementalMediaId(sequence: number) {
  return `00000000-0000-4000-8000-${String(9200 + sequence).padStart(12, "0")}`;
}

function buildSupplementalDemoMedia(jobs: DemoSeedJob[]): DemoSeedMediaItem[] {
  const media: DemoSeedMediaItem[] = [];
  const photoAssets = [
    {
      content: riveraCafeDryStorageSvg,
      description: "Production demo service photo - monitor proof",
      filename: "demo-rivera-cafe-dry-storage.svg",
    },
    {
      content: riveraCafeRearEntrySvg,
      description: "Production demo service photo - exclusion proof",
      filename: "demo-rivera-cafe-rear-entry.svg",
    },
  ];
  let sequence = 0;

  for (const [index, job] of jobs
    .filter(isProductionReadyCloseoutJob)
    .entries()) {
    const photoAsset = photoAssets[index % photoAssets.length];

    if (!basePhotoJobIds.has(job.id)) {
      media.push({
        captured_at: job.scheduled_end,
        content: photoAsset.content,
        content_type: "image/svg+xml",
        description: photoAsset.description,
        id: supplementalMediaId(sequence++),
        job_id: job.id,
        media_type: "photo",
        storage_bucket: "job-media",
        storage_path: `${job.id}/${photoAsset.filename}`,
      });
    }

    if (!baseSignatureJobIds.has(job.id)) {
      media.push({
        captured_at: job.scheduled_end,
        content: riveraCafeSignatureSvg,
        content_type: "image/svg+xml",
        description: "Production demo customer signature",
        id: supplementalMediaId(sequence++),
        job_id: job.id,
        media_type: "signature",
        storage_bucket: "job-media",
        storage_path: `${job.id}/demo-rivera-cafe-signature.svg`,
      });
    }
  }

  return media;
}

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

  if (input.target === "preview" && !input.previewSecretConfigured) {
    return {
      ok: false,
      message:
        "Preview demo seed requires DEMO_SEED_PREVIEW_SECRET to be configured on this deployment.",
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

  if (input.target === "preview" && !input.previewSecretConfigured) {
    return {
      available: false,
      environment_label: "Protected preview demo",
      reason:
        "Preview demo seed requires DEMO_SEED_PREVIEW_SECRET to be configured on this deployment.",
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
  // Left empty for status/summary callers (including client components, which
  // must never receive a password); seeding callers pass the resolved value and
  // replaceDemoSeedRecords refuses to create an account without one.
  const adminPassword = input.adminPassword ?? "";
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
    {
      email: "demo+seabreeze-apartments@example.test",
      id: demoId("c", 5),
      key: "seabreeze",
      locations: [
        {
          address: "310 Demo Seabreeze Ct, San Diego, CA 92109",
          customer_id: demoId("c", 5),
          id: demoId("l", 6),
          is_primary: true,
          nickname: "Building A",
          service_notes: markerNote(
            "Multi-unit exterior and trash room route.",
          ),
          status: "active",
        },
        {
          address: "318 Demo Seabreeze Ct, San Diego, CA 92109",
          customer_id: demoId("c", 5),
          id: demoId("l", 7),
          is_primary: false,
          nickname: "Laundry and pool house",
          service_notes: markerNote("Check monitors behind machines."),
          status: "active",
        },
      ],
      name: "Demo - Seabreeze Apartments",
      phone: "555-0105",
      property_type: "commercial",
      service_notes: markerNote("Apartment community recurring route."),
      status: "active",
    },
    {
      email: "demo+kearny-medical@example.test",
      id: demoId("c", 6),
      key: "kearny-medical",
      locations: [
        {
          address: "980 Demo Convoy Ct, San Diego, CA 92111",
          customer_id: demoId("c", 6),
          id: demoId("l", 8),
          is_primary: true,
          nickname: "Medical office",
          service_notes: markerNote("Quiet service before patient check-in."),
          status: "active",
        },
      ],
      name: "Demo - Kearny Mesa Medical Office",
      phone: "555-0106",
      property_type: "commercial",
      service_notes: markerNote(
        "Healthcare-adjacent sensitive service account.",
      ),
      status: "active",
    },
    {
      email: "demo+north-park-bakery@example.test",
      id: demoId("c", 7),
      key: "north-park-bakery",
      locations: [
        {
          address: "405 Demo 30th St, San Diego, CA 92104",
          customer_id: demoId("c", 7),
          id: demoId("l", 9),
          is_primary: true,
          nickname: "Bakery",
          service_notes: markerNote("Food-service inspection before prep."),
          status: "active",
        },
        {
          address: "411 Demo 30th St, San Diego, CA 92104",
          customer_id: demoId("c", 7),
          id: demoId("l", 10),
          is_primary: false,
          nickname: "Shared storage",
          service_notes: markerNote(
            "Coordinate with bakery manager for access.",
          ),
          status: "active",
        },
      ],
      name: "Demo - North Park Bakery",
      phone: "555-0107",
      property_type: "commercial",
      service_notes: markerNote("Recurring food-service prevention plan."),
      status: "active",
    },
    {
      email: "demo+torrey-lab@example.test",
      id: demoId("c", 8),
      key: "torrey-lab",
      locations: [
        {
          address: "1200 Demo Science Park Rd, San Diego, CA 92121",
          customer_id: demoId("c", 8),
          id: demoId("l", 11),
          is_primary: true,
          nickname: "Research lab",
          service_notes: markerNote("Escort required for lab wing."),
          status: "active",
        },
      ],
      name: "Demo - Torrey Pines Lab",
      phone: "555-0108",
      property_type: "commercial",
      service_notes: markerNote("Sensitive research facility demo account."),
      status: "active",
    },
    {
      email: "demo+chula-senior@example.test",
      id: demoId("c", 9),
      key: "chula-senior",
      locations: [
        {
          address: "640 Demo Telegraph Canyon Rd, Chula Vista, CA 91910",
          customer_id: demoId("c", 9),
          id: demoId("l", 12),
          is_primary: true,
          nickname: "Main residence wing",
          service_notes: markerNote("Check in with front desk before service."),
          status: "active",
        },
        {
          address: "650 Demo Telegraph Canyon Rd, Chula Vista, CA 91910",
          customer_id: demoId("c", 9),
          id: demoId("l", 13),
          is_primary: false,
          nickname: "Dining hall",
          service_notes: markerNote("Dining access after breakfast service."),
          status: "active",
        },
      ],
      name: "Demo - Chula Vista Senior Living",
      phone: "555-0109",
      property_type: "commercial",
      service_notes: markerNote(
        "Assisted-living facility with service windows.",
      ),
      status: "active",
    },
    {
      email: "demo+la-jolla-townhome@example.test",
      id: demoId("c", 10),
      key: "la-jolla-townhome",
      locations: [
        {
          address: "88 Demo Coast Walk, La Jolla, CA 92037",
          customer_id: demoId("c", 10),
          id: demoId("l", 14),
          is_primary: true,
          nickname: "Townhome",
          service_notes: markerNote("Customer prefers text before arrival."),
          status: "active",
        },
      ],
      name: "Demo - La Jolla Townhome",
      phone: "555-0110",
      property_type: "residential",
      service_notes: markerNote("Coastal residential quarterly plan."),
      status: "active",
    },
    {
      email: "demo+mission-brewery@example.test",
      id: demoId("c", 11),
      key: "mission-brewery",
      locations: [
        {
          address: "700 Demo Camino Del Rio, San Diego, CA 92108",
          customer_id: demoId("c", 11),
          id: demoId("l", 15),
          is_primary: true,
          nickname: "Taproom",
          service_notes: markerNote("Service before public opening."),
          status: "active",
        },
        {
          address: "710 Demo Camino Del Rio, San Diego, CA 92108",
          customer_id: demoId("c", 11),
          id: demoId("l", 16),
          is_primary: false,
          nickname: "Brewhouse",
          service_notes: markerNote("Inspect drains and grain storage."),
          status: "active",
        },
      ],
      name: "Demo - Mission Valley Brewery",
      phone: "555-0111",
      property_type: "commercial",
      service_notes: markerNote(
        "Brewery recurring route with sanitation notes.",
      ),
      status: "active",
    },
    {
      email: "demo+otay-logistics@example.test",
      id: demoId("c", 12),
      key: "otay-logistics",
      locations: [
        {
          address: "150 Demo Otay Mesa Rd, San Diego, CA 92154",
          customer_id: demoId("c", 12),
          id: demoId("l", 17),
          is_primary: true,
          nickname: "Logistics hub",
          service_notes: markerNote("Dock plates and break room inspection."),
          status: "active",
        },
      ],
      name: "Demo - Otay Logistics Hub",
      phone: "555-0112",
      property_type: "commercial",
      service_notes: markerNote("Warehouse and shipping account."),
      status: "active",
    },
    {
      email: "demo+hillcrest-clinic@example.test",
      id: demoId("c", 13),
      key: "hillcrest-clinic",
      locations: [
        {
          address: "390 Demo University Ave, San Diego, CA 92103",
          customer_id: demoId("c", 13),
          id: demoId("l", 18),
          is_primary: true,
          nickname: "Clinic",
          service_notes: markerNote("Use low-disruption inspection path."),
          status: "active",
        },
        {
          address: "396 Demo University Ave, San Diego, CA 92103",
          customer_id: demoId("c", 13),
          id: demoId("l", 19),
          is_primary: false,
          nickname: "Records storage",
          service_notes: markerNote("Manager key required for storage access."),
          status: "active",
        },
      ],
      name: "Demo - Hillcrest Clinic",
      phone: "555-0113",
      property_type: "commercial",
      service_notes: markerNote("Clinic account with sensitive area notes."),
      status: "active",
    },
    {
      email: "demo+point-loma-marina@example.test",
      id: demoId("c", 14),
      key: "point-loma-marina",
      locations: [
        {
          address: "44 Demo Marina Way, San Diego, CA 92106",
          customer_id: demoId("c", 14),
          id: demoId("l", 20),
          is_primary: true,
          nickname: "Marina office",
          service_notes: markerNote("Inspect bait stations near dock office."),
          status: "active",
        },
      ],
      name: "Demo - Point Loma Marina",
      phone: "555-0114",
      property_type: "commercial",
      service_notes: markerNote("Harbor-side account with exterior monitors."),
      status: "active",
    },
    {
      email: "demo+bankers-restaurant@example.test",
      id: demoId("c", 15),
      key: "bankers-restaurant",
      locations: [
        {
          address: "515 Demo 5th Ave, San Diego, CA 92101",
          customer_id: demoId("c", 15),
          id: demoId("l", 21),
          is_primary: true,
          nickname: "Dining room",
          service_notes: markerNote("Coordinate with opening manager."),
          status: "active",
        },
        {
          address: "519 Demo 5th Ave, San Diego, CA 92101",
          customer_id: demoId("c", 15),
          id: demoId("l", 22),
          is_primary: false,
          nickname: "Basement storage",
          service_notes: markerNote("Basement key in lockbox DEMO-515."),
          status: "active",
        },
      ],
      name: "Demo - Bankers Hill Restaurant",
      phone: "555-0115",
      property_type: "commercial",
      service_notes: markerNote(
        "Restaurant service with closeout proof needs.",
      ),
      status: "active",
    },
    {
      email: "demo+del-mar-residence@example.test",
      id: demoId("c", 16),
      key: "del-mar-residence",
      locations: [
        {
          address: "19 Demo Crest Rd, Del Mar, CA 92014",
          customer_id: demoId("c", 16),
          id: demoId("l", 23),
          is_primary: true,
          nickname: "Residence",
          service_notes: markerNote("Side gate code DEMO-019."),
          status: "active",
        },
      ],
      name: "Demo - Del Mar Residence",
      phone: "555-0116",
      property_type: "residential",
      service_notes: markerNote("High-touch residential plan."),
      status: "active",
    },
    {
      email: "demo+poway-school@example.test",
      id: demoId("c", 17),
      key: "poway-school",
      locations: [
        {
          address: "222 Demo Midland Rd, Poway, CA 92064",
          customer_id: demoId("c", 17),
          id: demoId("l", 24),
          is_primary: true,
          nickname: "Admin building",
          service_notes: markerNote("Check in at school office."),
          status: "active",
        },
        {
          address: "230 Demo Midland Rd, Poway, CA 92064",
          customer_id: demoId("c", 17),
          id: demoId("l", 25),
          is_primary: false,
          nickname: "Cafeteria",
          service_notes: markerNote("Cafeteria service after lunch."),
          status: "active",
        },
      ],
      name: "Demo - Poway Learning Center",
      phone: "555-0117",
      property_type: "commercial",
      service_notes: markerNote("School demo account with restricted windows."),
      status: "active",
    },
    {
      email: "demo+east-village-gym@example.test",
      id: demoId("c", 18),
      key: "east-village-gym",
      locations: [
        {
          address: "901 Demo Market St, San Diego, CA 92101",
          customer_id: demoId("c", 18),
          id: demoId("l", 26),
          is_primary: true,
          nickname: "Gym",
          service_notes: markerNote(
            "Service locker rooms before evening rush.",
          ),
          status: "active",
        },
      ],
      name: "Demo - East Village Gym",
      phone: "555-0118",
      property_type: "commercial",
      service_notes: markerNote("Fitness facility recurring prevention plan."),
      status: "active",
    },
  ];
  customers.push(...buildGeneratedCustomers(customers.length + 1, 100));
  const customersWithCoordinates = withDemoLocationCoordinates(customers);
  const technicians = buildDemoTechnicians(technicianPassword);
  const inventory: DemoSeedInventoryItem[] = [
    {
      current_stock: 128,
      epa_number: "DEMO-432-1529",
      id: "00000000-0000-4000-8000-00000000a001",
      key: "perimeter",
      name: "Demo - Non-Repellent Perimeter SC",
      reorder_level: 32,
      unit: "oz",
    },
    {
      current_stock: 8,
      epa_number: "DEMO-499-548",
      id: "00000000-0000-4000-8000-00000000a002",
      key: "bait",
      name: "Demo - Ant Gel Bait Rotation A",
      reorder_level: 12,
      unit: "each",
    },
    {
      current_stock: 72,
      epa_number: "DEMO-100-1659",
      id: "00000000-0000-4000-8000-00000000a003",
      key: "rodent",
      name: "Demo - Rodent Monitoring Blocks",
      reorder_level: 18,
      unit: "each",
    },
    {
      current_stock: 4,
      epa_number: "DEMO-352-888",
      id: "00000000-0000-4000-8000-00000000a004",
      key: "dust",
      name: "Demo - Crack and Crevice Dust",
      reorder_level: 6,
      unit: "oz",
    },
    {
      current_stock: 84,
      epa_number: "N/A",
      id: "00000000-0000-4000-8000-00000000a005",
      key: "glueboard",
      name: "Demo - Glueboard Monitor 72 Pack",
      reorder_level: 24,
      unit: "each",
    },
    {
      current_stock: 5,
      epa_number: "DEMO-432-1544",
      id: "00000000-0000-4000-8000-00000000a006",
      key: "aerosol",
      name: "Demo - Wasp Knockdown Aerosol",
      reorder_level: 6,
      unit: "each",
    },
    {
      current_stock: 18,
      epa_number: "DEMO-2724-351",
      id: "00000000-0000-4000-8000-00000000a007",
      key: "igr",
      name: "Demo - Insect Growth Regulator Concentrate",
      reorder_level: 5,
      unit: "oz",
    },
    {
      current_stock: 48,
      epa_number: "DEMO-6218-47",
      id: "00000000-0000-4000-8000-00000000a008",
      key: "larvicide",
      name: "Demo - Mosquito Larvicide Dunks",
      reorder_level: 10,
      unit: "each",
    },
    {
      current_stock: 36,
      epa_number: "N/A",
      id: "00000000-0000-4000-8000-00000000a009",
      key: "fly-light-board",
      name: "Demo - Food Plant Fly Light Boards",
      reorder_level: 12,
      unit: "each",
    },
    {
      current_stock: 62,
      epa_number: "N/A",
      id: "00000000-0000-4000-8000-00000000a010",
      key: "bait-station",
      name: "Demo - Tamper-Resistant Bait Stations",
      reorder_level: 15,
      unit: "each",
    },
    {
      current_stock: 9,
      epa_number: "DEMO-53883-401",
      id: "00000000-0000-4000-8000-00000000a011",
      key: "foam",
      name: "Demo - Foaming Crack Treatment",
      reorder_level: 3,
      unit: "gal",
    },
    {
      current_stock: 11,
      epa_number: "N/A",
      id: "00000000-0000-4000-8000-00000000a012",
      key: "drain-foam",
      name: "Demo - Drain Line Bio Foam",
      reorder_level: 3,
      status: "archived",
      unit: "gal",
    },
    {
      current_stock: 40,
      epa_number: "N/A",
      id: "00000000-0000-4000-8000-00000000a013",
      key: "snap-trap",
      name: "Demo - Snap Trap Service Kit",
      reorder_level: 10,
      unit: "each",
    },
    {
      current_stock: 22,
      epa_number: "N/A",
      id: "00000000-0000-4000-8000-00000000a014",
      key: "ppe-kit",
      name: "Demo - PPE Service Restock Kit",
      reorder_level: 8,
      unit: "each",
    },
  ];
  const jobs: DemoSeedJob[] = [
    {
      assigned_technician_key: "maya",
      billing_disposition: "billable",
      customer_id: demoId("c", 1),
      id: demoId("j", 1),
      inventory_key: "perimeter",
      key: "harbor-today",
      location_id: demoId("l", 1),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 10, 38),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 9, 38),
      service_notes: markerNote(
        "Exterior perimeter, clubhouse kitchen, and pool room.",
      ),
      service_cadence: "one_time",
      service_family: "general_pest",
      service_offering_id: "general_pest_initial",
      status: "scheduled",
    },
    {
      assigned_technician_key: "eli",
      customer_id: demoId("c", 2),
      id: demoId("j", 2),
      inventory_key: "bait",
      key: "rivera-completed",
      location_id: demoId("l", 3),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 8, 45),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 7, 45),
      service_notes: markerNote(
        "Completed cafe service with customer-safe closeout.",
      ),
      status: "completed",
    },
    {
      assigned_technician_key: "maya",
      billing_disposition: "included_in_recurring",
      customer_id: demoId("c", 3),
      id: demoId("j", 3),
      key: "nguyen-today",
      location_id: demoId("l", 4),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 12, 15),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 11, 15),
      service_notes: markerNote("Quarterly residential service."),
      service_cadence: "quarterly",
      service_family: "recurring_general_pest",
      service_offering_id: "general_pest_quarterly",
      status: "en_route",
    },
    {
      assigned_technician_key: "sol",
      billing_disposition: "estimate_only",
      customer_id: demoId("c", 4),
      estimate_status: "presented",
      id: demoId("j", 4),
      inventory_key: "rodent",
      job_purpose: "estimate",
      key: "mesa-tomorrow",
      location_id: demoId("l", 5),
      scheduled_end: currentWeekRelativeWallClockIso(now, 1, 10, 30),
      scheduled_start: currentWeekRelativeWallClockIso(now, 1, 9, 0),
      service_notes: markerNote("Rodent exclusion estimate for warehouse dock doors."),
      service_cadence: "one_time",
      service_family: "rodent_attic",
      service_offering_id: "rodent_inspection",
      status: "scheduled",
    },
    {
      assigned_technician_key: "eli",
      billing_disposition: "billable",
      customer_id: demoId("c", 1),
      id: demoId("j", 5),
      inventory_key: "dust",
      key: "harbor-followup",
      location_id: demoId("l", 2),
      scheduled_end: currentWeekRelativeWallClockIso(now, 1, 14, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 1, 13, 0),
      service_notes: markerNote("Pool equipment room follow-up."),
      job_purpose: "follow_up",
      service_cadence: "one_time",
      service_family: "general_pest",
      service_offering_id: "general_pest_initial",
      status: "scheduled",
    },
    {
      assigned_technician_key: "priya",
      customer_id: demoId("c", 5),
      id: demoId("j", 6),
      inventory_key: "glueboard",
      key: "seabreeze-building-a",
      location_id: demoId("l", 6),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 14, 30),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 13, 30),
      service_notes: markerNote("Apartment trash room and exterior stations."),
      status: "scheduled",
    },
    {
      assigned_technician_key: "dante",
      customer_id: demoId("c", 6),
      id: demoId("j", 7),
      inventory_key: "perimeter",
      key: "kearny-in-progress",
      location_id: demoId("l", 8),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 11, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 10, 0),
      service_notes: markerNote("Medical office perimeter and utility closet."),
      status: "in_progress",
    },
    {
      assigned_technician_key: "iris",
      customer_id: demoId("c", 7),
      id: demoId("j", 8),
      inventory_key: "bait",
      key: "north-park-bakery",
      location_id: demoId("l", 9),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 15, 15),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 14, 15),
      service_notes: markerNote(
        "Bakery prep, drains, and shared storage check.",
      ),
      status: "scheduled",
    },
    {
      assigned_technician_key: "noa",
      customer_id: demoId("c", 8),
      id: demoId("j", 9),
      inventory_key: "dust",
      key: "torrey-canceled",
      location_id: demoId("l", 11),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 16, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 15, 0),
      service_notes: markerNote("Lab escort unavailable; reschedule required."),
      status: "canceled",
    },
    {
      assigned_technician_key: "leo",
      customer_id: demoId("c", 9),
      id: demoId("j", 10),
      inventory_key: "rodent",
      key: "chula-dining",
      location_id: demoId("l", 12),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 17, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 16, 0),
      service_notes: markerNote("Senior living dining hall monitor review."),
      status: "scheduled",
    },
    {
      assigned_technician_key: "zara",
      customer_id: demoId("c", 10),
      id: demoId("j", 11),
      inventory_key: "perimeter",
      key: "la-jolla-en-route",
      location_id: demoId("l", 14),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 9, 30),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 8, 30),
      service_notes: markerNote("Coastal townhome quarterly exterior."),
      status: "en_route",
    },
    {
      assigned_technician_key: "omar",
      billing_disposition: "billable",
      customer_id: demoId("c", 11),
      id: demoId("j", 12),
      inventory_key: "glueboard",
      job_purpose: "inspection",
      key: "mission-brewery-completed",
      location_id: demoId("l", 15),
      scheduled_end: currentWeekRelativeWallClockIso(now, -1, 11, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, -1, 10, 0),
      service_notes: markerNote("Completed WDO / escrow inspection."),
      service_cadence: "one_time",
      service_family: "termite_wdo",
      service_offering_id: "wdo_escrow_inspection",
      status: "completed",
    },
    {
      assigned_technician_key: "nina",
      billing_disposition: "billable",
      customer_id: demoId("c", 12),
      id: demoId("j", 13),
      inventory_key: "rodent",
      job_purpose: "project_phase",
      key: "otay-tomorrow",
      location_id: demoId("l", 17),
      scheduled_end: currentWeekRelativeWallClockIso(now, 1, 12, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 1, 10, 30),
      service_notes: markerNote("Rodent exclusion project phase for dock doors."),
      service_cadence: "project",
      service_family: "rodent_attic",
      service_offering_id: "rodent_exclusion",
      status: "scheduled",
    },
    {
      assigned_technician_key: "gabe",
      billing_disposition: "warranty_callback",
      customer_id: demoId("c", 13),
      id: demoId("j", 14),
      inventory_key: "bait",
      job_purpose: "callback",
      key: "hillcrest-late",
      location_id: demoId("l", 18),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 8, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 7, 0),
      service_notes: markerNote(
        "Warranty callback review needs dispatch triage.",
      ),
      service_cadence: "one_time",
      service_family: "general_pest",
      service_offering_id: "general_pest_initial",
      status: "scheduled",
    },
    {
      assigned_technician_key: "gabe",
      customer_id: demoId("c", 14),
      id: demoId("j", 15),
      inventory_key: "rodent",
      key: "point-loma-in-progress",
      location_id: demoId("l", 20),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 13, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 12, 0),
      service_notes: markerNote("Marina office dock monitor service."),
      status: "in_progress",
    },
    {
      assigned_technician_key: null,
      customer_id: demoId("c", 15),
      id: demoId("j", 16),
      inventory_key: "aerosol",
      key: "bankers-unassigned",
      location_id: demoId("l", 21),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 18, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 17, 0),
      service_notes: markerNote(
        "Restaurant service waiting on technician assignment.",
      ),
      status: "scheduled",
    },
    {
      assigned_technician_key: "maya",
      customer_id: demoId("c", 16),
      id: demoId("j", 17),
      inventory_key: "perimeter",
      key: "del-mar-completed",
      location_id: demoId("l", 23),
      scheduled_end: currentWeekRelativeWallClockIso(now, -1, 15, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, -1, 14, 0),
      service_notes: markerNote(
        "Completed residential exterior and garage sweep.",
      ),
      status: "completed",
    },
    {
      assigned_technician_key: "eli",
      customer_id: demoId("c", 17),
      id: demoId("j", 18),
      inventory_key: "glueboard",
      key: "poway-tomorrow",
      location_id: demoId("l", 24),
      scheduled_end: currentWeekRelativeWallClockIso(now, 1, 15, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 1, 14, 0),
      service_notes: markerNote("School admin building and cafeteria route."),
      status: "scheduled",
    },
    {
      assigned_technician_key: "sol",
      customer_id: demoId("c", 18),
      id: demoId("j", 19),
      inventory_key: "perimeter",
      key: "east-village-future",
      location_id: demoId("l", 26),
      scheduled_end: currentWeekRelativeWallClockIso(now, 2, 11, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 2, 10, 0),
      service_notes: markerNote("Gym locker room and perimeter service."),
      status: "scheduled",
    },
    {
      assigned_technician_key: "priya",
      customer_id: demoId("c", 5),
      id: demoId("j", 20),
      inventory_key: "glueboard",
      key: "seabreeze-laundry-completed",
      location_id: demoId("l", 7),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 8, 30),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 7, 30),
      service_notes: markerNote("Completed laundry room monitor service."),
      status: "completed",
    },
    {
      assigned_technician_key: "dante",
      customer_id: demoId("c", 7),
      id: demoId("j", 21),
      inventory_key: "bait",
      key: "north-park-storage-tomorrow",
      location_id: demoId("l", 10),
      scheduled_end: currentWeekRelativeWallClockIso(now, 1, 11, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 1, 10, 0),
      service_notes: markerNote("Shared storage follow-up for bakery account."),
      status: "scheduled",
    },
    {
      assigned_technician_key: "iris",
      customer_id: demoId("c", 9),
      id: demoId("j", 22),
      inventory_key: "rodent",
      key: "chula-dining-en-route",
      location_id: demoId("l", 13),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 12, 30),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 11, 30),
      service_notes: markerNote("Dining hall service after breakfast."),
      status: "en_route",
    },
    {
      assigned_technician_key: "noa",
      customer_id: demoId("c", 11),
      id: demoId("j", 23),
      inventory_key: "dust",
      key: "mission-brewhouse-canceled",
      location_id: demoId("l", 16),
      scheduled_end: currentWeekRelativeWallClockIso(now, 1, 16, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 1, 15, 0),
      service_notes: markerNote(
        "Brewhouse service canceled for maintenance closure.",
      ),
      status: "canceled",
    },
    {
      assigned_technician_key: "leo",
      customer_id: demoId("c", 13),
      id: demoId("j", 24),
      inventory_key: "bait",
      key: "hillcrest-storage-future",
      location_id: demoId("l", 19),
      scheduled_end: currentWeekRelativeWallClockIso(now, 2, 10, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 2, 9, 0),
      service_notes: markerNote("Records storage inspection and monitor swap."),
      status: "scheduled",
    },
    {
      assigned_technician_key: "zara",
      customer_id: demoId("c", 15),
      id: demoId("j", 25),
      inventory_key: "bait",
      key: "bankers-basement-completed",
      location_id: demoId("l", 22),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 10, 15),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 9, 15),
      service_notes: markerNote("Completed restaurant basement proof handoff."),
      status: "completed",
    },
    {
      assigned_technician_key: null,
      customer_id: demoId("c", 17),
      id: demoId("j", 26),
      inventory_key: "glueboard",
      key: "poway-cafeteria-unassigned",
      location_id: demoId("l", 25),
      scheduled_end: currentWeekRelativeWallClockIso(now, 1, 13, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 1, 12, 0),
      service_notes: markerNote(
        "Cafeteria service needs dispatcher assignment.",
      ),
      status: "scheduled",
    },
    {
      assigned_technician_key: "omar",
      customer_id: demoId("c", 6),
      id: demoId("j", 27),
      inventory_key: "perimeter",
      key: "kearny-overdue",
      location_id: demoId("l", 8),
      scheduled_end: currentWeekRelativeWallClockIso(now, -1, 16, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, -1, 15, 0),
      service_notes: markerNote(
        "Overdue medical office follow-up still scheduled.",
      ),
      status: "scheduled",
    },
    {
      assigned_technician_key: "nina",
      customer_id: demoId("c", 10),
      id: demoId("j", 28),
      inventory_key: "perimeter",
      key: "la-jolla-future",
      location_id: demoId("l", 14),
      scheduled_end: currentWeekRelativeWallClockIso(now, 2, 15, 30),
      scheduled_start: currentWeekRelativeWallClockIso(now, 2, 14, 30),
      service_notes: markerNote("Future townhome quarterly service."),
      status: "scheduled",
    },
    {
      assigned_technician_key: "gabe",
      customer_id: demoId("c", 12),
      id: demoId("j", 29),
      inventory_key: "rodent",
      key: "otay-completed",
      location_id: demoId("l", 17),
      scheduled_end: currentWeekRelativeWallClockIso(now, 0, 7, 45),
      scheduled_start: currentWeekRelativeWallClockIso(now, 0, 6, 45),
      service_notes: markerNote(
        "Completed logistics hub dock-door inspection.",
      ),
      status: "completed",
    },
    {
      assigned_technician_key: null,
      customer_id: demoId("c", 18),
      id: demoId("j", 30),
      inventory_key: "aerosol",
      key: "east-village-unassigned-future",
      location_id: demoId("l", 26),
      scheduled_end: currentWeekRelativeWallClockIso(now, 2, 12, 0),
      scheduled_start: currentWeekRelativeWallClockIso(now, 2, 11, 0),
      service_notes: markerNote("Future gym service waiting for assignment."),
      status: "scheduled",
    },
  ];
  jobs.push(
    ...buildGeneratedJobs({
      customers: customersWithCoordinates,
      existingCount: jobs.length,
      inventory,
      now,
      targetCount: 180,
      technicians,
    }),
  );
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
    {
      customer_id: demoId("c", 15),
      due_date: wallClockIso(now, 10, 17, 0),
      id: demoId("i", 3),
      job_id: demoId("j", 25),
      line_items: [
        {
          description: "Demo restaurant basement proof service",
          invoice_id: demoId("i", 3),
          quantity: 1,
          total_cents: 21000,
          unit_amount_cents: 21000,
        },
      ],
      notes: markerNote("Synthetic draft invoice awaiting review."),
      payment_url: null,
      status: "draft",
      stripe_payment_link_id: null,
      subtotal_cents: 21000,
      total_cents: 21000,
    },
    {
      customer_id: demoId("c", 5),
      due_date: wallClockIso(now, 5, 17, 0),
      id: demoId("i", 4),
      job_id: demoId("j", 20),
      line_items: [
        {
          description: "Demo apartment monitor service",
          invoice_id: demoId("i", 4),
          quantity: 1,
          total_cents: 32500,
          unit_amount_cents: 32500,
        },
      ],
      notes: markerNote("Synthetic sent invoice with pending mock payment."),
      payment: {
        amount_cents: 32500,
        currency: "usd",
        invoice_id: demoId("i", 4),
        paid_at: null,
        provider: "stripe",
        provider_payment_id: "demo_pi_seabreeze_pending",
        status: "pending",
      },
      payment_url: "https://pay.example.test/demo-seabreeze-invoice",
      status: "sent",
      stripe_payment_link_id: "demo_plink_seabreeze_sent",
      subtotal_cents: 32500,
      total_cents: 32500,
    },
    {
      customer_id: demoId("c", 12),
      due_date: wallClockIso(now, 2, 17, 0),
      id: demoId("i", 5),
      job_id: demoId("j", 29),
      line_items: [
        {
          description: "Demo logistics dock-door service",
          invoice_id: demoId("i", 5),
          quantity: 1,
          total_cents: 47500,
          unit_amount_cents: 47500,
        },
      ],
      notes: markerNote(
        "Synthetic void invoice preserving a failed payment example for demo reconciliation.",
      ),
      payment: {
        amount_cents: 47500,
        currency: "usd",
        invoice_id: demoId("i", 5),
        paid_at: null,
        provider: "stripe",
        provider_payment_id: "demo_pi_otay_failed",
        status: "failed",
      },
      payment_url: null,
      status: "void",
      stripe_payment_link_id: "demo_plink_otay_void",
      subtotal_cents: 47500,
      total_cents: 47500,
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
    {
      captured_at: wallClockIso(now, 0, 7, 58),
      content: riveraCafeDryStorageSvg,
      content_type: "image/svg+xml",
      description: "Laundry room monitor replacement proof",
      id: "00000000-0000-4000-8000-000000009004",
      job_id: demoId("j", 20),
      media_type: "photo",
      storage_bucket: "job-media",
      storage_path: `${demoId("j", 20)}/demo-rivera-cafe-dry-storage.svg`,
    },
    {
      captured_at: wallClockIso(now, 0, 8, 12),
      content: riveraCafeRearEntrySvg,
      content_type: "image/svg+xml",
      description: "Pool house exterior exclusion proof",
      id: "00000000-0000-4000-8000-000000009005",
      job_id: demoId("j", 20),
      media_type: "photo",
      storage_bucket: "job-media",
      storage_path: `${demoId("j", 20)}/demo-rivera-cafe-rear-entry.svg`,
    },
    {
      captured_at: wallClockIso(now, 0, 10, 2),
      content: riveraCafeDryStorageSvg,
      content_type: "image/svg+xml",
      description: "Restaurant basement storage closeout photo",
      id: "00000000-0000-4000-8000-000000009006",
      job_id: demoId("j", 25),
      media_type: "photo",
      storage_bucket: "job-media",
      storage_path: `${demoId("j", 25)}/demo-rivera-cafe-dry-storage.svg`,
    },
    {
      captured_at: wallClockIso(now, 0, 7, 36),
      content: riveraCafeSignatureSvg,
      content_type: "image/svg+xml",
      description: "Dock manager signature",
      id: "00000000-0000-4000-8000-000000009007",
      job_id: demoId("j", 29),
      media_type: "signature",
      storage_bucket: "job-media",
      storage_path: `${demoId("j", 29)}/demo-rivera-cafe-signature.svg`,
    },
    ...buildSupplementalDemoMedia(jobs),
  ];

  return {
    adminUsers: [
      {
        display_name: "Demo - Admin",
        email: DEMO_SEED_ADMIN_EMAIL,
        key: "demo-admin",
        password: adminPassword,
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
      {
        amount_used: 3,
        chemical_key: "glueboard",
        job_id: demoId("j", 20),
        notes: markerNote(
          "Replaced apartment laundry room monitors and recorded unit hallway activity.",
        ),
      },
      {
        amount_used: 2.5,
        chemical_key: "bait",
        job_id: demoId("j", 25),
        notes: markerNote(
          "Placed demo bait in basement storage away from food-prep surfaces.",
        ),
      },
      {
        amount_used: 5,
        chemical_key: "rodent",
        job_id: demoId("j", 29),
        notes: markerNote(
          "Refreshed dock-door rodent monitors and checked break room corners.",
        ),
      },
      {
        amount_used: 6,
        chemical_key: "perimeter",
        job_id: demoId("j", 1),
        notes: markerNote(
          "Recorded clubhouse exterior perimeter application with GPS-backed arrival proof.",
        ),
      },
      {
        amount_used: 1.25,
        chemical_key: "dust",
        job_id: demoId("j", 8),
        notes: markerNote(
          "Demo crack-and-crevice dust entry for bakery storage voids.",
        ),
      },
      {
        amount_used: 1,
        chemical_key: "aerosol",
        job_id: demoId("j", 10),
        notes: markerNote(
          "Spot knockdown entry for dining hall exterior soffit activity.",
        ),
      },
      {
        amount_used: 0.75,
        chemical_key: "igr",
        job_id: demoId("j", 12),
        notes: markerNote(
          "Brewhouse drain-area growth regulator note for compliance demo.",
        ),
      },
      ...buildSupplementalDemoChemicalLogs(jobs),
    ],
    customers: customersWithCoordinates,
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
      {
        form_data: {
          areas_treated: "Laundry room, pool house, trash enclosure",
          application_method:
            "Inspection and monitor replacement with resident-safe placement.",
          customer_instructions:
            "Keep laundry lint bins closed and report activity near pool storage.",
          epa_label_reviewed: true,
          follow_up_required: true,
          materials_applied: "Demo glueboard monitors",
          service_branch: "San Diego multi-unit route",
          target_pests: "Occasional ants and rodents",
          weather_conditions: "Dry exterior service window.",
        },
        job_id: demoId("j", 20),
        template_id: treatmentTemplateId,
      },
      {
        form_data: {
          areas_treated: "Basement storage, service corridor, rear entry",
          application_method:
            "Targeted bait placement and sanitation review for storage area.",
          customer_instructions:
            "Keep dry goods elevated and schedule a manager walkthrough.",
          epa_label_reviewed: true,
          follow_up_required: false,
          materials_applied: "Demo bait placements",
          service_branch: "San Diego restaurant route",
          target_pests: "Ants and stored-product pest indicators",
          weather_conditions: "Interior service before opening.",
        },
        job_id: demoId("j", 25),
        template_id: treatmentTemplateId,
      },
      {
        form_data: {
          areas_treated: "Clubhouse exterior, kitchen threshold, pool room",
          application_method:
            "Perimeter inspection, targeted exterior treatment, and bait station check.",
          customer_instructions:
            "Keep pool-room door sweep clear and approve follow-up photos in portal.",
          epa_label_reviewed: true,
          follow_up_required: true,
          materials_applied: "Demo perimeter treatment",
          service_branch: "San Diego HOA route",
          target_pests: "Ants and occasional rodents",
          weather_conditions:
            "Clear coastal morning; exterior service completed.",
        },
        job_id: demoId("j", 1),
        template_id: treatmentTemplateId,
      },
      {
        form_data: {
          areas_treated: "Prep room, shared storage, rear trash corral",
          application_method:
            "Inspection, crack-and-crevice dust placement, and sanitation coaching.",
          customer_instructions:
            "Sweep flour accumulation daily and keep back door closed between deliveries.",
          epa_label_reviewed: true,
          follow_up_required: false,
          materials_applied: "Demo crack and crevice dust",
          service_branch: "San Diego food-service route",
          target_pests: "Stored-product pests and ants",
          weather_conditions: "Interior service; rear corral dry.",
        },
        job_id: demoId("j", 8),
        template_id: treatmentTemplateId,
      },
      {
        form_data: {
          areas_treated: "Dining hall exterior, receiving door, refuse pad",
          application_method:
            "Monitor inspection, limited exterior spot treatment, and sanitation notes.",
          customer_instructions:
            "Keep receiving door closed after deliveries and report wasp activity.",
          epa_label_reviewed: true,
          follow_up_required: false,
          materials_applied: "Demo aerosol spot treatment",
          service_branch: "San Diego senior-living route",
          target_pests: "Occasional ants and flying insects",
          weather_conditions: "Clear afternoon service window.",
        },
        job_id: demoId("j", 10),
        template_id: treatmentTemplateId,
      },
      {
        form_data: {
          areas_treated: "Taproom drains, brewhouse threshold, keg storage",
          application_method:
            "Drain review, monitor replacement, and growth-regulator note.",
          customer_instructions:
            "Maintain nightly drain brushing and review portal photos.",
          epa_label_reviewed: true,
          follow_up_required: true,
          materials_applied: "Demo IGR concentrate and glueboard monitors",
          service_branch: "San Diego brewery route",
          target_pests: "Small flies and occasional rodents",
          weather_conditions: "Interior service after production cleanup.",
        },
        job_id: demoId("j", 12),
        template_id: treatmentTemplateId,
      },
      ...buildSupplementalDemoFormSubmissions(jobs),
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
    technicians,
  };
}
