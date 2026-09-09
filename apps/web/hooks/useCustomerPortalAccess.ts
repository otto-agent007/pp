"use client";

import {
  createCustomerPortalAccessToken,
  getCustomerPortalProviderStatus,
  listCustomerPortalAccessTokenEvents,
  listCustomerPortalAccessTokens,
  revokeCustomerPortalAccessToken,
  sendCustomerPortalAccessToken,
} from "@pest-patrol/application";
import type {
  CustomerPortalAccessGrant,
  CustomerPortalAccessInput,
  CustomerPortalAccessTokenSummary,
  CustomerPortalSendInput,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLocalDemoPortalAccessToken,
  getLocalDemoFixtures,
  revokeLocalDemoPortalAccessToken,
  sendLocalDemoPortalAccessToken,
} from "./localDemoData";
import { createCloseoutsAdapter } from "@pest-patrol/api-client";

import { browserSupabase } from "../lib/supabase-browser";

const closeoutsPort = createCloseoutsAdapter(browserSupabase);


export const customerPortalAccessTokensQueryKey = (customerId: string) =>
  ["customer-portal-access-tokens", customerId] as const;

export const customerPortalAccessTokenEventsQueryKey = (tokenId: string) =>
  ["customer-portal-access-token-events", tokenId] as const;

export const customerPortalProviderStatusQueryKey = () =>
  ["customer-portal-provider-status"] as const;

export function useCustomerPortalAccessTokens(customerId: string) {
  return useQuery({
    queryKey: customerPortalAccessTokensQueryKey(customerId),
    queryFn: () => {
      const fixtures = getLocalDemoFixtures();

      return fixtures
        ? (fixtures.portalAccessTokensByCustomerId[customerId] ?? [])
        : listCustomerPortalAccessTokens(closeoutsPort, customerId);
    },
  });
}

export function useCustomerPortalAccessTokenEvents(tokenId: string | null) {
  return useQuery({
    queryKey: customerPortalAccessTokenEventsQueryKey(tokenId ?? ""),
    queryFn: () => {
      const fixtures = getLocalDemoFixtures();

      return fixtures
        ? {
            events:
              fixtures.portalAccessTokenEventsByTokenId[tokenId ?? ""] ?? [],
            truncated_before: null,
          }
        : listCustomerPortalAccessTokenEvents(closeoutsPort, tokenId ?? "");
    },
    enabled: Boolean(tokenId),
  });
}

export function useCustomerPortalProviderStatus() {
  return useQuery({
    queryKey: customerPortalProviderStatusQueryKey(),
    queryFn: () =>
      getLocalDemoFixtures()?.portalProviderStatus ??
      getCustomerPortalProviderStatus(closeoutsPort),
  });
}

export function useCreateCustomerPortalAccessToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CustomerPortalAccessInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(createLocalDemoPortalAccessToken(input))
        : createCustomerPortalAccessToken(closeoutsPort, input),
    onSuccess: (grant: CustomerPortalAccessGrant) => {
      void queryClient.invalidateQueries({
        queryKey: customerPortalAccessTokensQueryKey(grant.customer_id),
      });
    },
  });
}

export function useRevokeCustomerPortalAccessToken(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getLocalDemoFixtures()
        ? Promise.resolve(revokeLocalDemoPortalAccessToken(id))
        : revokeCustomerPortalAccessToken(closeoutsPort, id),
    onMutate: async (id) => {
      const queryKey = customerPortalAccessTokensQueryKey(customerId);
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<CustomerPortalAccessTokenSummary[]>(
          queryKey,
        ) ?? [];

      queryClient.setQueryData<CustomerPortalAccessTokenSummary[]>(
        queryKey,
        previous.map((token) =>
          token.id === id
            ? {
                ...token,
                status: "revoked",
                updated_at: new Date().toISOString(),
              }
            : token,
        ),
      );

      return { previous, queryKey };
    },
    onError: (_error, _id, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _error, id) => {
      void queryClient.invalidateQueries({
        queryKey: customerPortalAccessTokensQueryKey(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerPortalAccessTokenEventsQueryKey(id),
      });
    },
  });
}

export function useSendCustomerPortalAccessToken() {
  return useMutation({
    mutationFn: (input: CustomerPortalSendInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(sendLocalDemoPortalAccessToken(input))
        : sendCustomerPortalAccessToken(closeoutsPort, input),
  });
}
