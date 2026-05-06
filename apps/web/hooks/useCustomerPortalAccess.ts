"use client";

import {
  createCustomerPortalAccessToken,
  listCustomerPortalAccessTokens,
  revokeCustomerPortalAccessToken,
} from "@pest-patrol/domain";
import type {
  CustomerPortalAccessGrant,
  CustomerPortalAccessTokenSummary,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const customerPortalAccessTokensQueryKey = (customerId: string) =>
  ["customer-portal-access-tokens", customerId] as const;

export function useCustomerPortalAccessTokens(customerId: string) {
  return useQuery({
    queryKey: customerPortalAccessTokensQueryKey(customerId),
    queryFn: () => listCustomerPortalAccessTokens(customerId),
  });
}

export function useCreateCustomerPortalAccessToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomerPortalAccessToken,
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
    mutationFn: revokeCustomerPortalAccessToken,
    onMutate: async (id) => {
      const queryKey = customerPortalAccessTokensQueryKey(customerId);
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<CustomerPortalAccessTokenSummary[]>(queryKey) ??
        [];

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
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: customerPortalAccessTokensQueryKey(customerId),
      });
    },
  });
}
