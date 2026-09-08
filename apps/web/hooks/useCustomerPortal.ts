"use client";

import {
  buildCustomerPortalCloseouts,
  buildCustomerPortalInvoices,
  validateCustomerPortalCustomerId,
} from "@pest-patrol/domain";
import {
  listCustomerPortalBilling,
  listCustomerPortalCloseouts,
  requestCustomerPortalUpgradeIntent,
} from "@pest-patrol/application";
import type { CustomerPortalUpgradeIntentInput } from "@pest-patrol/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getLocalDemoFixtures,
  requestLocalDemoPortalUpgradeIntent,
} from "./localDemoData";
import { createCloseoutsAdapter } from "@pest-patrol/api-client";

const closeoutsPort = createCloseoutsAdapter();


export const customerPortalCloseoutsQueryKey = (customerId: string) =>
  ["customer-portal-closeouts", customerId] as const;

export const customerPortalBillingQueryKey = (customerId: string) =>
  ["customer-portal-billing", customerId] as const;

export function useCustomerPortalCloseouts(customerId: string) {
  const validCustomerId = validateCustomerPortalCustomerId(customerId);
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
    fixtures
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
    enabled: !fixtures,
    queryKey: customerPortalCloseoutsQueryKey(validCustomerId),
    queryFn: () => listCustomerPortalCloseouts(closeoutsPort, validCustomerId),
  });

  return {
    closeouts: fixtureCloseouts ?? closeoutsQuery.data ?? [],
    error: closeoutsQuery.error,
    isLoading: fixtures ? false : closeoutsQuery.isLoading,
  };
}

export function useCustomerPortalBilling(customerId: string) {
  const validCustomerId = validateCustomerPortalCustomerId(customerId);
  const fixtures = getLocalDemoFixtures();
  const fixtureInvoices =
    fixtures
      ? buildCustomerPortalInvoices(
          fixtures.invoices.filter(
            (invoice) => invoice.customer_id === validCustomerId,
          ),
        )
      : null;
  const billingQuery = useQuery({
    enabled: !fixtures,
    queryKey: customerPortalBillingQueryKey(validCustomerId),
    queryFn: () => listCustomerPortalBilling(closeoutsPort, validCustomerId),
  });

  return {
    error: billingQuery.error,
    invoices: fixtureInvoices ?? billingQuery.data ?? [],
    isLoading: fixtures ? false : billingQuery.isLoading,
  };
}

export function useCustomerPortalUpgradeIntent(customerId: string) {
  const validCustomerId = validateCustomerPortalCustomerId(customerId);

  return useMutation({
    mutationFn: (input: CustomerPortalUpgradeIntentInput) => {
      const fixtures = getLocalDemoFixtures();

      if (fixtures) {
        return Promise.resolve(
          requestLocalDemoPortalUpgradeIntent(validCustomerId, input),
        );
      }

      return requestCustomerPortalUpgradeIntent(closeoutsPort, validCustomerId, input);
    },
  });
}
