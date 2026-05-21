"use client";

import {
  buildCustomerPortalCloseouts,
  buildCustomerPortalInvoices,
  listCustomerPortalBilling,
  listCustomerPortalCloseouts,
  validateCustomerPortalAccessToken,
  validateCustomerPortalCustomerId,
} from "@pest-patrol/domain";
import { useQuery } from "@tanstack/react-query";
import { getLocalDemoFixtures } from "./localDemoData";

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
  const fixtures = getLocalDemoFixtures();
  const completedPortalJobs =
    fixtures?.jobs
      .filter(
        (job) =>
          job.customer_id === validCustomerId && job.status === "completed",
      )
      .map((job) => ({
        id: job.id,
        customer_id: job.customer_id,
        location_id: job.location_id,
        status: "completed" as const,
        scheduled_start: job.scheduled_start,
        scheduled_end: job.scheduled_end,
        customer: job.customer
          ? {
              id: job.customer.id,
              name: job.customer.name,
            }
          : undefined,
        location: job.location
          ? {
              id: job.location.id,
              address: job.location.address,
              nickname: job.location.nickname,
            }
          : undefined,
      })) ?? [];
  const completedPortalJobIds = new Set(
    completedPortalJobs.map((job) => job.id),
  );
  const fixtureCloseouts =
    fixtures && validAccessToken
      ? buildCustomerPortalCloseouts({
          formSubmissions: fixtures.formSubmissions.filter((submission) =>
            completedPortalJobIds.has(submission.job_id),
          ),
          jobs: completedPortalJobs,
          media: fixtures.media.filter((media) =>
            completedPortalJobIds.has(media.job_id),
          ),
        })
      : null;
  const closeoutsQuery = useQuery({
    enabled: Boolean(validAccessToken) && !fixtures,
    queryKey: customerPortalCloseoutsQueryKey(validCustomerId, validAccessToken),
    queryFn: () => listCustomerPortalCloseouts(validCustomerId, validAccessToken),
  });

  return {
    closeouts: fixtureCloseouts ?? closeoutsQuery.data ?? [],
    error:
      closeoutsQuery.error ??
      (validAccessToken ? null : new Error("Portal access token is required")),
    isLoading: fixtures ? false : closeoutsQuery.isLoading,
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
  const fixtures = getLocalDemoFixtures();
  const fixtureInvoices =
    fixtures && validAccessToken
      ? buildCustomerPortalInvoices(
          fixtures.invoices.filter(
            (invoice) => invoice.customer_id === validCustomerId,
          ),
        )
      : null;
  const billingQuery = useQuery({
    enabled: Boolean(validAccessToken) && !fixtures,
    queryKey: customerPortalBillingQueryKey(validCustomerId, validAccessToken),
    queryFn: () => listCustomerPortalBilling(validCustomerId, validAccessToken),
  });

  return {
    error:
      billingQuery.error ??
      (validAccessToken ? null : new Error("Portal access token is required")),
    invoices: fixtureInvoices ?? billingQuery.data ?? [],
    isLoading: fixtures ? false : billingQuery.isLoading,
  };
}
