import {
  archiveCustomerRecord,
  createCustomerRecord,
  listCustomerRecords,
  updateCustomerRecord,
} from "@pest-patrol/api-client";
import type { Customer, CustomerInput, CustomerLocationInput } from "@pest-patrol/types";

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function normalizeLocation(
  location: CustomerLocationInput,
): CustomerLocationInput {
  return {
    id: location.id,
    address: requireNonEmpty(location.address, "Location address"),
    nickname: normalizeOptional(location.nickname),
    service_notes: normalizeOptional(location.service_notes),
    is_primary: location.is_primary ?? false,
  };
}

export function normalizeCustomerInput(input: CustomerInput): CustomerInput {
  const name = requireNonEmpty(input.name, "Customer name");
  const normalizedLocations = input.locations.map(normalizeLocation);
  const primaryIndex = normalizedLocations.findIndex((location) => location.is_primary);

  return {
    name,
    phone: normalizeOptional(input.phone),
    email: normalizeOptional(input.email),
    property_type: input.property_type,
    service_notes: normalizeOptional(input.service_notes),
    locations: normalizedLocations.map((location, index) => ({
      ...location,
      is_primary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
    })),
  };
}

export function validateCustomerInput(input: CustomerInput) {
  if (input.locations.length === 0) {
    throw new Error("At least one location is required");
  }

  return normalizeCustomerInput(input);
}

export function filterCustomers(
  customers: Customer[],
  search: string,
  status: Customer["status"],
) {
  const query = search.trim().toLowerCase();

  return customers.filter((customer) => {
    if (customer.status !== status) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchable = [
      customer.name,
      customer.phone,
      customer.email,
      customer.property_type,
      ...(customer.locations ?? []).map((location) => location.address),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

export async function listCustomers() {
  return listCustomerRecords();
}

export async function createCustomer(input: CustomerInput) {
  return createCustomerRecord(validateCustomerInput(input));
}

export async function updateCustomer(id: string, input: CustomerInput) {
  return updateCustomerRecord(id, validateCustomerInput(input));
}

export async function archiveCustomer(id: string) {
  return archiveCustomerRecord(id);
}
