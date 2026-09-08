import {
  archiveCustomerRecord,
  createCustomerRecord,
  listCustomerRecords,
  updateCustomerRecord,
} from "@pest-patrol/api-client";
import type { CustomerInput } from "@pest-patrol/types";
import { validateCustomerInput } from "@pest-patrol/domain";

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
