import type {
  CustomerPortalAccessInput,
  CustomerPortalSendInput,
  CustomerPortalUpgradeIntentInput,
  CustomerPortalUpgradeIntentResult,
} from "@pest-patrol/types";
import {
  createCustomerPortalAccessTokenRecord,
  getCustomerPortalProviderStatusRecord,
  listCloseoutCaptureSummaryRecords,
  listCustomerPortalAccessTokenEventRecords,
  listCustomerPortalAccessTokenRecords,
  listCustomerPortalBillingRecords,
  listCustomerPortalCloseoutRecords,
  requestCustomerPortalUpgradeIntentRecord,
  revokeCustomerPortalAccessTokenRecord,
  sendCustomerPortalAccessTokenRecord,
} from "@pest-patrol/api-client";
import {
  validateCustomerPortalAccessInput,
  validateCustomerPortalAccessTokenId,
  validateCustomerPortalCustomerId,
  validateCustomerPortalSendInput,
  validateCustomerPortalUpgradeIntentInput,
} from "@pest-patrol/domain";

export async function getCustomerPortalProviderStatus() {
  return getCustomerPortalProviderStatusRecord();
}

export async function listCustomerPortalCloseouts(
  customerId: string,
) {
  return listCustomerPortalCloseoutRecords(
    validateCustomerPortalCustomerId(customerId),
  );
}

export async function listCloseoutCaptureSummaries(jobIds: string[]) {
  return listCloseoutCaptureSummaryRecords(jobIds);
}

export async function listCustomerPortalBilling(
  customerId: string,
) {
  return listCustomerPortalBillingRecords(
    validateCustomerPortalCustomerId(customerId),
  );
}

export async function requestCustomerPortalUpgradeIntent(
  customerId: string,
  input: CustomerPortalUpgradeIntentInput,
): Promise<CustomerPortalUpgradeIntentResult> {
  return requestCustomerPortalUpgradeIntentRecord(
    validateCustomerPortalCustomerId(customerId),
    validateCustomerPortalUpgradeIntentInput(input),
  );
}

export async function listCustomerPortalAccessTokens(customerId: string) {
  return listCustomerPortalAccessTokenRecords(
    validateCustomerPortalCustomerId(customerId),
  );
}

export async function listCustomerPortalAccessTokenEvents(id: string) {
  return listCustomerPortalAccessTokenEventRecords(
    validateCustomerPortalAccessTokenId(id),
  );
}

export async function createCustomerPortalAccessToken(
  input: CustomerPortalAccessInput,
) {
  return createCustomerPortalAccessTokenRecord(
    validateCustomerPortalAccessInput(input),
  );
}

export async function revokeCustomerPortalAccessToken(id: string) {
  return revokeCustomerPortalAccessTokenRecord(
    validateCustomerPortalAccessTokenId(id),
  );
}

export async function sendCustomerPortalAccessToken(
  input: CustomerPortalSendInput,
) {
  return sendCustomerPortalAccessTokenRecord(
    validateCustomerPortalSendInput(input),
  );
}
