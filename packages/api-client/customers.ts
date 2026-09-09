import type { Customer, CustomerInput, CustomerLocationInput } from "@pest-patrol/types";

import type { SupabaseProviderClient } from "./supabase";

type CustomersClient = SupabaseProviderClient;

type CustomerRow = Omit<Customer, "locations"> & {
  locations?: Customer["locations"];
};

function normalizeLocationInput(
  customerId: string,
  location: CustomerLocationInput,
  index: number,
) {
  return {
    customer_id: customerId,
    address: location.address,
    nickname: location.nickname ?? null,
    service_notes: location.service_notes ?? null,
    is_primary: location.is_primary ?? index === 0,
    status: "active",
  };
}

export async function listCustomerRecords(client: CustomersClient) {
  const { data, error } = await client
    .from("customers")
    .select("*, locations(*)")
    .order("name", { ascending: true })
    .order("is_primary", {
      ascending: false,
      referencedTable: "locations",
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as Customer[];
}

export async function createCustomerRecord(
  input: CustomerInput,
  client: CustomersClient,
) {
  const { locations, ...customerInput } = input;
  const { data: customer, error: customerError } = await client
    .from("customers")
    .insert({
      ...customerInput,
      phone: customerInput.phone ?? null,
      email: customerInput.email ?? null,
      service_notes: customerInput.service_notes ?? null,
      status: "active",
    })
    .select("*")
    .single<CustomerRow>();

  if (customerError) {
    throw customerError;
  }

  const locationRows = locations.map((location, index) =>
    normalizeLocationInput(customer.id, location, index),
  );
  const { data: savedLocations, error: locationError } = await client
    .from("locations")
    .insert(locationRows)
    .select("*");

  if (locationError) {
    throw locationError;
  }

  return {
    ...customer,
    locations: (savedLocations ?? []) as Customer["locations"],
  } satisfies Customer;
}

export async function updateCustomerRecord(
  id: string,
  input: CustomerInput,
  client: CustomersClient,
) {
  const { locations, ...customerInput } = input;
  const { data: customer, error: customerError } = await client
    .from("customers")
    .update({
      ...customerInput,
      phone: customerInput.phone ?? null,
      email: customerInput.email ?? null,
      service_notes: customerInput.service_notes ?? null,
    })
    .eq("id", id)
    .select("*")
    .single<CustomerRow>();

  if (customerError) {
    throw customerError;
  }

  const existingLocationIds = locations
    .map((location) => location.id)
    .filter((locationId): locationId is string => Boolean(locationId));

  let archiveQuery = client
    .from("locations")
    .update({ status: "archived", is_primary: false })
    .eq("customer_id", id);

  if (existingLocationIds.length > 0) {
    archiveQuery = archiveQuery.not("id", "in", `(${existingLocationIds.join(",")})`);
  }

  const { error: archiveError } = await archiveQuery;

  if (archiveError) {
    throw archiveError;
  }

  const locationRows = locations.map((location, index) => ({
    ...normalizeLocationInput(id, location, index),
    id: location.id,
  }));
  const { data: savedLocations, error: locationError } = await client
    .from("locations")
    .upsert(locationRows)
    .select("*");

  if (locationError) {
    throw locationError;
  }

  return {
    ...customer,
    locations: (savedLocations ?? []) as Customer["locations"],
  } satisfies Customer;
}

export async function archiveCustomerRecord(
  id: string,
  client: CustomersClient,
) {
  const { error: locationError } = await client
    .from("locations")
    .update({ status: "archived", is_primary: false })
    .eq("customer_id", id);

  if (locationError) {
    throw locationError;
  }

  const { data, error } = await client
    .from("customers")
    .update({ status: "archived" })
    .eq("id", id)
    .select("*, locations(*)")
    .single<CustomerRow>();

  if (error) {
    throw error;
  }

  return data as Customer;
}
