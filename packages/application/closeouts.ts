import type { CloseoutsPort } from "./ports";
import type {
  CustomerPortalAccessInput,
  CustomerPortalSendInput,
  CustomerPortalUpgradeIntentInput,
  CustomerPortalUpgradeIntentResult,
} from "@pest-patrol/types";

import {
  validateCustomerPortalAccessInput,
  validateCustomerPortalAccessTokenId,
  validateCustomerPortalCustomerId,
  validateCustomerPortalSendInput,
  validateCustomerPortalUpgradeIntentInput,
} from "@pest-patrol/domain";

export async function getCustomerPortalProviderStatus(port: CloseoutsPort) {
  return port.getCustomerPortalProviderStatusRecord();
}

export async function listCustomerPortalCloseouts(
  port: CloseoutsPort, customerId: string,
) {
  return port.listCustomerPortalCloseoutRecords(
    validateCustomerPortalCustomerId(customerId),
  );
}

export async function listCloseoutCaptureSummaries(port: CloseoutsPort, jobIds: string[]) {
  return port.listCloseoutCaptureSummaryRecords(jobIds);
}

export async function listCustomerPortalBilling(
  port: CloseoutsPort, customerId: string,
) {
  return port.listCustomerPortalBillingRecords(
    validateCustomerPortalCustomerId(customerId),
  );
}

export async function requestCustomerPortalUpgradeIntent(
  port: CloseoutsPort, customerId: string,
  input: CustomerPortalUpgradeIntentInput,
): Promise<CustomerPortalUpgradeIntentResult> {
  return port.requestCustomerPortalUpgradeIntentRecord(
    validateCustomerPortalCustomerId(customerId),
    validateCustomerPortalUpgradeIntentInput(input),
  );
}

export async function listCustomerPortalAccessTokens(port: CloseoutsPort, customerId: string) {
  return port.listCustomerPortalAccessTokenRecords(
    validateCustomerPortalCustomerId(customerId),
  );
}

export async function listCustomerPortalAccessTokenEvents(port: CloseoutsPort, id: string) {
  return port.listCustomerPortalAccessTokenEventRecords(
    validateCustomerPortalAccessTokenId(id),
  );
}

export async function createCustomerPortalAccessToken(
  port: CloseoutsPort, input: CustomerPortalAccessInput,
) {
  return port.createCustomerPortalAccessTokenRecord(
    validateCustomerPortalAccessInput(input),
  );
}

export async function revokeCustomerPortalAccessToken(port: CloseoutsPort, id: string) {
  return port.revokeCustomerPortalAccessTokenRecord(
    validateCustomerPortalAccessTokenId(id),
  );
}

export async function sendCustomerPortalAccessToken(
  port: CloseoutsPort, input: CustomerPortalSendInput,
) {
  return port.sendCustomerPortalAccessTokenRecord(
    validateCustomerPortalSendInput(input),
  );
}
