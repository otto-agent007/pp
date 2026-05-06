"use client";

import {
  listCustomerPortalBilling,
  listCustomerPortalCloseouts,
  validateCustomerPortalAccessToken,
  validateCustomerPortalCustomerId,
} from "@pest-patrol/domain";
import { useQuery } from "@tanstack/react-query";

export const customerPortalCloseoutsQueryKey = (
  customerId: string,
  accessToken: string,
) => ["customer-portal-closeouts", customerId, accessToken] as const;

export const customerPortalBillingQueryKey = (
  customerId: string,
  accessToken: string,
) => ["customer-portal-billing", customerId, accessToken] as const;

export function useCustomerPortalCloseouts(
  customerId: string,
  accessToken: string,
) {
  const validCustomerId = validateCustomerPortalCustomerId(customerId);
  const validAccessToken = accessToken.trim()
    ? validateCustomerPortalAccessToken(accessToken)
    : "";
  const closeoutsQuery = useQuery({
    enabled: Boolean(validAccessToken),
    queryKey: customerPortalCloseoutsQueryKey(validCustomerId, validAccessToken),
    queryFn: () => listCustomerPortalCloseouts(validCustomerId, validAccessToken),
  });

  return {
    closeouts: closeoutsQuery.data ?? [],
    error:
      closeoutsQuery.error ??
      (validAccessToken ? null : new Error("Portal access token is required")),
    isLoading: closeoutsQuery.isLoading,
  };
}

export function useCustomerPortalBilling(
  customerId: string,
  accessToken: string,
) {
  const validCustomerId = validateCustomerPortalCustomerId(customerId);
  const validAccessToken = accessToken.trim()
    ? validateCustomerPortalAccessToken(accessToken)
    : "";
  const billingQuery = useQuery({
    enabled: Boolean(validAccessToken),
    queryKey: customerPortalBillingQueryKey(validCustomerId, validAccessToken),
    queryFn: () => listCustomerPortalBilling(validCustomerId, validAccessToken),
  });

  return {
    error:
      billingQuery.error ??
      (validAccessToken ? null : new Error("Portal access token is required")),
    invoices: billingQuery.data ?? [],
    isLoading: billingQuery.isLoading,
  };
}
