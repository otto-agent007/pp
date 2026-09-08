import type { CustomersPort } from "./ports";
import type { CustomerInput } from "@pest-patrol/types";
import { validateCustomerInput } from "@pest-patrol/domain";

export async function listCustomers(port: CustomersPort) {
  return port.listCustomerRecords();
}

export async function createCustomer(
  port: CustomersPort,
  input: CustomerInput,
) {
  return port.createCustomerRecord(validateCustomerInput(input));
}

export async function updateCustomer(
  port: CustomersPort,
  id: string,
  input: CustomerInput,
) {
  return port.updateCustomerRecord(id, validateCustomerInput(input));
}

export async function archiveCustomer(port: CustomersPort, id: string) {
  return port.archiveCustomerRecord(id);
}
