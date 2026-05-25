import {
  validateDemoSeedGuardrails,
  type DemoSeedAdminUser,
  type DemoSeedInventoryItem,
  type DemoSeedInvoice,
  type DemoSeedJob,
  type DemoSeedMediaItem,
  type DemoSeedPlan,
  type DemoSeedTechnician,
  type DemoSeedGuardrailInput,
} from "@pest-patrol/domain";
import type {
  DemoSeedActionInput,
  DemoSeedActionResponse,
  DemoSeedStatusResponse,
} from "@pest-patrol/types";

import { supabase } from "./supabase";

interface SupabaseQuery {
  delete(): SupabaseQuery;
  eq(column: string, value: unknown): SupabaseQuery;
  ilike(column: string, pattern: string): SupabaseQuery;
  in(column: string, values: unknown[]): SupabaseQuery;
  insert(values: unknown): SupabaseQuery;
  like(column: string, pattern: string): SupabaseQuery;
  or(filters: string): SupabaseQuery;
  select(columns?: string): SupabaseQuery;
  single(): Promise<{ data: unknown; error: Error | null }>;
  then<TResult1 = { data: unknown; error: Error | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: Error | null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
  upsert(values: unknown, options?: unknown): SupabaseQuery;
}

export interface DemoSeedSupabaseClient {
  auth: {
    admin: {
      createUser(input: {
        email: string;
        email_confirm: boolean;
        password?: string;
        user_metadata: Record<string, unknown>;
      }): Promise<{
        data: { user: { id: string; email?: string } | null };
        error: Error | null;
      }>;
      deleteUser(id: string): Promise<{ data: unknown; error: Error | null }>;
      listUsers(): Promise<{
        data: { users: Array<{ id: string; email?: string | null }> };
        error: Error | null;
      }>;
    };
  };
  from(table: string): SupabaseQuery;
  storage: {
    from(bucket: string): {
      remove(paths: string[]): Promise<{ data: unknown; error: Error | null }>;
      upload(
        path: string,
        body: Blob,
        options: { contentType: string; upsert: boolean },
      ): Promise<{ data: unknown; error: Error | null }>;
    };
  };
}

interface DemoSeedAuthClient {
  auth: {
    getSession(): Promise<{
      data: { session: { access_token?: string } | null };
      error: Error | null;
    }>;
  };
}

export interface DemoSeedSummary {
  adminUsers: number;
  chemicalLogs: number;
  customers: number;
  formSubmissions: number;
  inventory: number;
  invoices: number;
  jobs: number;
  media: number;
  payments: number;
  technicians: number;
}

interface DemoSeedContext {
  inventoryIdsByKey: Map<string, string>;
  technicianIdsByKey: Map<string, string>;
}

interface DemoSeedExecutionOptions {
  adminUserId?: string;
  preserveAdminUserId?: string;
}

function assertNoError(error: Error | null, action: string) {
  if (error) {
    throw new Error(`${action}: ${error.message}`);
  }
}

async function runQuery(query: SupabaseQuery, action: string) {
  const { error } = (await query) as { data: unknown; error: Error | null };
  assertNoError(error, action);
}

async function runSingle<T>(query: SupabaseQuery, action: string) {
  const { data, error } = (await query.single()) as {
    data: T | null;
    error: Error | null;
  };
  assertNoError(error, action);

  if (!data) {
    throw new Error(`${action}: no record returned`);
  }

  return data;
}

function technicianProfileRow(technician: DemoSeedTechnician, userId: string) {
  return {
    display_name: technician.display_name,
    email: technician.email,
    id: userId,
    role: "technician",
    status: "active",
  };
}

function adminProfileRow(adminUser: DemoSeedAdminUser, userId: string) {
  return {
    display_name: adminUser.display_name,
    email: adminUser.email,
    id: userId,
    role: adminUser.role,
    status: "active",
  };
}

function jobRow(job: DemoSeedJob, context: DemoSeedContext) {
  const technicianId = job.assigned_technician_key
    ? context.technicianIdsByKey.get(job.assigned_technician_key)
    : null;

  if (job.assigned_technician_key && !technicianId) {
    throw new Error(`Missing demo technician ${job.assigned_technician_key}`);
  }

  return {
    assigned_tech_id: technicianId ?? null,
    customer_id: job.customer_id,
    id: job.id,
    location_id: job.location_id,
    scheduled_end: job.scheduled_end,
    scheduled_start: job.scheduled_start,
    service_notes: job.service_notes,
    status: job.status,
  };
}

function inventoryRow(item: DemoSeedInventoryItem) {
  return {
    current_stock: item.current_stock,
    epa_number: item.epa_number,
    id: item.id,
    name: item.name,
    reorder_level: item.reorder_level,
    status: "active",
    unit: item.unit,
  };
}

function invoiceRow(invoice: DemoSeedInvoice) {
  return {
    currency: "usd",
    customer_id: invoice.customer_id,
    due_date: invoice.due_date,
    id: invoice.id,
    job_id: invoice.job_id,
    notes: invoice.notes,
    payment_url: invoice.payment_url,
    status: invoice.status,
    stripe_payment_link_id: invoice.stripe_payment_link_id,
    subtotal_cents: invoice.subtotal_cents,
    total_cents: invoice.total_cents,
  };
}

function mediaRow(media: DemoSeedMediaItem) {
  return {
    captured_at: media.captured_at,
    description: media.description,
    id: media.id,
    job_id: media.job_id,
    media_type: media.media_type,
    storage_bucket: media.storage_bucket,
    storage_path: media.storage_path,
    uploaded_by: null,
  };
}

function emptySummary(): DemoSeedSummary {
  return {
    adminUsers: 0,
    chemicalLogs: 0,
    customers: 0,
    formSubmissions: 0,
    inventory: 0,
    invoices: 0,
    jobs: 0,
    media: 0,
    payments: 0,
    technicians: 0,
  };
}

async function uploadDemoMedia(
  client: DemoSeedSupabaseClient,
  media: DemoSeedMediaItem,
) {
  const { error } = await client.storage
    .from(media.storage_bucket)
    .upload(
      media.storage_path,
      new Blob([media.content], { type: media.content_type }),
      {
        contentType: media.content_type,
        upsert: true,
      },
    );

  assertNoError(error, `Upload demo media ${media.storage_path}`);
}

async function removeDemoMedia(
  client: DemoSeedSupabaseClient,
  media: DemoSeedMediaItem[],
) {
  const byBucket = new Map<string, string[]>();

  media.forEach((item) => {
    byBucket.set(item.storage_bucket, [
      ...(byBucket.get(item.storage_bucket) ?? []),
      item.storage_path,
    ]);
  });

  for (const [bucket, paths] of byBucket) {
    const { error } = await client.storage.from(bucket).remove(paths);
    assertNoError(error, `Reset demo media bucket ${bucket}`);
  }
}

export function validateDemoSeedExecution(
  _client: DemoSeedSupabaseClient,
  input: DemoSeedGuardrailInput,
) {
  const result = validateDemoSeedGuardrails(input);

  if (!result.ok) {
    throw new Error(result.message);
  }

  return result;
}

export async function seedDemoRecords(
  client: DemoSeedSupabaseClient,
  plan: DemoSeedPlan,
  options: Pick<DemoSeedExecutionOptions, "adminUserId"> = {},
) {
  const summary = emptySummary();
  const context: DemoSeedContext = {
    inventoryIdsByKey: new Map(
      plan.inventory.map((item) => [item.key, item.id]),
    ),
    technicianIdsByKey: new Map(),
  };

  for (const adminUser of plan.adminUsers) {
    if (options.adminUserId) {
      await runSingle(
        client
          .from("profiles")
          .upsert(adminProfileRow(adminUser, options.adminUserId), {
            onConflict: "id",
          })
          .select("*"),
        `Upsert demo admin profile ${adminUser.email}`,
      );
      summary.adminUsers += 1;
      continue;
    }

    const { data, error } = await client.auth.admin.createUser({
      email: adminUser.email,
      email_confirm: true,
      password: adminUser.password,
      user_metadata: {
        display_name: adminUser.display_name,
        role: adminUser.role,
      },
    });
    assertNoError(error, `Create demo admin ${adminUser.email}`);

    if (!data.user) {
      throw new Error(`Create demo admin ${adminUser.email}: no user returned`);
    }

    await runSingle(
      client
        .from("profiles")
        .upsert(adminProfileRow(adminUser, data.user.id), { onConflict: "id" })
        .select("*"),
      `Upsert demo admin profile ${adminUser.email}`,
    );
    summary.adminUsers += 1;
  }

  for (const technician of plan.technicians) {
    const createInput = {
      email: technician.email,
      email_confirm: true,
      password: technician.password,
      user_metadata: {
        display_name: technician.display_name,
        role: "technician",
      },
    };
    const { data, error } = await client.auth.admin.createUser(createInput);
    assertNoError(error, `Create demo technician ${technician.email}`);

    if (!data.user) {
      throw new Error(
        `Create demo technician ${technician.email}: no user returned`,
      );
    }

    context.technicianIdsByKey.set(technician.key, data.user.id);
    await runSingle(
      client
        .from("profiles")
        .upsert(technicianProfileRow(technician, data.user.id), {
          onConflict: "id",
        })
        .select("*"),
      `Upsert demo technician profile ${technician.email}`,
    );
    summary.technicians += 1;
  }

  for (const customer of plan.customers) {
    await runQuery(
      client.from("customers").insert({
        email: customer.email,
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        property_type: customer.property_type,
        service_notes: customer.service_notes,
        status: customer.status,
      }),
      `Insert demo customer ${customer.name}`,
    );
    await runQuery(
      client.from("locations").insert(customer.locations),
      `Insert demo locations for ${customer.name}`,
    );
    summary.customers += 1;
  }

  await runQuery(
    client.from("chemical_inventory").insert(plan.inventory.map(inventoryRow)),
    "Insert demo inventory",
  );
  summary.inventory = plan.inventory.length;

  await runQuery(
    client.from("jobs").insert(plan.jobs.map((job) => jobRow(job, context))),
    "Insert demo jobs",
  );
  summary.jobs = plan.jobs.length;

  await runQuery(
    client.from("chemical_logs").insert(
      plan.chemicalLogs.map((log) => {
        const chemicalId = context.inventoryIdsByKey.get(log.chemical_key);

        if (!chemicalId) {
          throw new Error(`Missing demo chemical ${log.chemical_key}`);
        }

        return {
          amount_used: log.amount_used,
          chemical_id: chemicalId,
          job_id: log.job_id,
          notes: log.notes,
        };
      }),
    ),
    "Insert demo chemical logs",
  );
  summary.chemicalLogs = plan.chemicalLogs.length;

  await runQuery(
    client.from("job_form_submissions").insert(plan.formSubmissions),
    "Insert demo form submissions",
  );
  summary.formSubmissions = plan.formSubmissions.length;

  for (const media of plan.media) {
    await uploadDemoMedia(client, media);
  }

  await runQuery(
    client.from("job_media").insert(plan.media.map(mediaRow)),
    "Insert demo media",
  );
  summary.media = plan.media.length;

  await runQuery(
    client.from("invoices").insert(plan.invoices.map(invoiceRow)),
    "Insert demo invoices",
  );
  await runQuery(
    client
      .from("invoice_line_items")
      .insert(plan.invoices.flatMap((invoice) => invoice.line_items)),
    "Insert demo invoice line items",
  );
  summary.invoices = plan.invoices.length;

  const payments = plan.invoices
    .map((invoice) => invoice.payment)
    .filter((payment): payment is NonNullable<typeof payment> =>
      Boolean(payment),
    );

  await runQuery(
    client.from("payments").insert(payments),
    "Insert demo payments",
  );
  summary.payments = payments.length;

  return summary;
}

export async function replaceDemoSeedRecords(
  client: DemoSeedSupabaseClient,
  plan: DemoSeedPlan,
) {
  const reset = await resetDemoSeedRecords(client, plan);
  const seed = await seedDemoRecords(client, plan);

  return { reset, seed };
}

export async function refreshDemoLoginSeedRecords(
  client: DemoSeedSupabaseClient,
  plan: DemoSeedPlan,
  adminUserId: string,
) {
  const reset = await resetDemoSeedRecords(client, plan, {
    preserveAdminUserId: adminUserId,
  });
  const seed = await seedDemoRecords(client, plan, { adminUserId });

  return { reset, seed };
}

function planCustomerIds(plan: DemoSeedPlan) {
  return plan.customers.map((customer) => customer.id);
}

function planJobIds(plan: DemoSeedPlan) {
  return plan.jobs.map((job) => job.id);
}

function planInvoiceIds(plan: DemoSeedPlan) {
  return plan.invoices.map((invoice) => invoice.id);
}

function planInventoryIds(plan: DemoSeedPlan) {
  return plan.inventory.map((item) => item.id);
}

async function deleteByIds(
  client: DemoSeedSupabaseClient,
  table: string,
  column: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return;
  }

  await runQuery(
    client.from(table).delete().in(column, ids),
    `Reset demo ${table}`,
  );
}

export async function resetDemoSeedRecords(
  client: DemoSeedSupabaseClient,
  plan: DemoSeedPlan,
  options: Pick<DemoSeedExecutionOptions, "preserveAdminUserId"> = {},
) {
  const customerIds = planCustomerIds(plan);
  const jobIds = planJobIds(plan);
  const invoiceIds = planInvoiceIds(plan);

  await runQuery(
    client
      .from("customers")
      .select("id")
      .or(
        `name.like.${plan.resetFilters.customerNamePrefix}%,email.like.${plan.resetFilters.customerEmailPrefix}%,service_notes.ilike.%${plan.resetFilters.marker}%`,
      ),
    "Find demo customers",
  );
  await runQuery(
    client.from("jobs").select("id").in("customer_id", customerIds),
    "Find demo jobs",
  );
  await runQuery(
    client.from("invoices").select("id").in("customer_id", customerIds),
    "Find demo invoices",
  );

  await deleteByIds(client, "payments", "invoice_id", invoiceIds);
  await deleteByIds(client, "invoice_line_items", "invoice_id", invoiceIds);
  await deleteByIds(client, "invoices", "id", invoiceIds);
  await deleteByIds(client, "job_form_submissions", "job_id", jobIds);
  await deleteByIds(client, "chemical_logs", "job_id", jobIds);
  await deleteByIds(client, "job_media", "job_id", jobIds);
  await removeDemoMedia(client, plan.media);
  await deleteByIds(client, "jobs", "id", jobIds);
  await deleteByIds(client, "chemical_inventory", "id", planInventoryIds(plan));
  await deleteByIds(client, "locations", "customer_id", customerIds);
  await deleteByIds(client, "customers", "id", customerIds);

  if (!options.preserveAdminUserId) {
    await runQuery(
      client
        .from("profiles")
        .delete()
        .eq("email", plan.resetFilters.adminEmail),
      "Reset demo admin profile",
    );
  }

  await runQuery(
    client
      .from("profiles")
      .delete()
      .like("email", `${plan.resetFilters.technicianEmailPrefix}%`),
    "Reset demo technician profiles",
  );

  const { data, error } = await client.auth.admin.listUsers();
  assertNoError(error, "List demo auth users");

  const demoUsers = data.users.filter(
    (user) =>
      (user.email === plan.resetFilters.adminEmail &&
        user.id !== options.preserveAdminUserId) ||
      user.email?.startsWith(plan.resetFilters.technicianEmailPrefix),
  );

  for (const user of demoUsers) {
    const result = await client.auth.admin.deleteUser(user.id);
    assertNoError(result.error, `Delete demo auth user ${user.id}`);
  }

  return {
    adminUsers: demoUsers.filter(
      (user) => user.email === plan.resetFilters.adminEmail,
    ).length,
    customers: customerIds.length,
    inventory: plan.inventory.length,
    invoices: invoiceIds.length,
    jobs: jobIds.length,
    media: plan.media.length,
    technicians: demoUsers.filter((user) =>
      user.email?.startsWith(plan.resetFilters.technicianEmailPrefix),
    ).length,
  };
}

async function getAccessToken(client: DemoSeedAuthClient = supabase) {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
}

function authHeaders(
  token: string | null,
  contentType?: "json",
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (contentType === "json") {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function jsonError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return body?.error ?? fallback;
}

export async function getDemoSeedStatusRecord(
  client: DemoSeedAuthClient = supabase,
) {
  const token = await getAccessToken(client);
  const response = await fetch("/api/demo-seed", {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(
      await jsonError(response, "Unable to load demo seed status"),
    );
  }

  return (await response.json()) as DemoSeedStatusResponse;
}

export async function prepareLocalDemoLoginRecord() {
  const response = await fetch("/api/demo-seed/local-login", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await jsonError(response, "Unable to prepare demo login"));
  }

  return (await response.json()) as DemoSeedActionResponse;
}

export async function refreshDemoLoginSeedRecord(
  client: DemoSeedAuthClient = supabase,
) {
  const token = await getAccessToken(client);
  const response = await fetch("/api/demo-seed/login-refresh", {
    headers: authHeaders(token),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await jsonError(response, "Unable to refresh demo login data"),
    );
  }

  return (await response.json()) as DemoSeedActionResponse;
}

export async function runDemoSeedActionRecord(
  input: DemoSeedActionInput,
): Promise<DemoSeedActionResponse>;
export async function runDemoSeedActionRecord(
  client: DemoSeedAuthClient,
  input: DemoSeedActionInput,
): Promise<DemoSeedActionResponse>;
export async function runDemoSeedActionRecord(
  clientOrInput: DemoSeedAuthClient | DemoSeedActionInput,
  maybeInput?: DemoSeedActionInput,
) {
  const client = maybeInput ? (clientOrInput as DemoSeedAuthClient) : supabase;
  const input = maybeInput ?? (clientOrInput as DemoSeedActionInput);
  const token = await getAccessToken(client);
  const response = await fetch("/api/demo-seed", {
    body: JSON.stringify(input),
    headers: authHeaders(token, "json"),
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await jsonError(response, "Unable to run demo seed action"),
    );
  }

  return (await response.json()) as DemoSeedActionResponse;
}
