"use client";

import {
  archiveCustomer,
  createCustomer,
  listCustomers,
  updateCustomer,
} from "@pest-patrol/application";
import type { Customer, CustomerInput } from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveLocalDemoCustomer,
  createLocalDemoCustomer,
  getLocalDemoFixtures,
  updateLocalDemoCustomer,
} from "./localDemoData";
import { createCustomersAdapter } from "@pest-patrol/api-client";

import { browserSupabase } from "../lib/supabase-browser";

const customersPort = createCustomersAdapter(browserSupabase);


export const customersQueryKey = ["customers"] as const;

function makeOptimisticCustomer(input: CustomerInput): Customer {
  const now = new Date().toISOString();
  const id = `optimistic-${crypto.randomUUID()}`;

  return {
    id,
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    property_type: input.property_type,
    service_notes: input.service_notes ?? null,
    status: "active",
    created_at: now,
    updated_at: now,
    locations: input.locations.map((location, index) => ({
      id: location.id ?? `${id}-location-${index}`,
      customer_id: id,
      address: location.address,
      nickname: location.nickname ?? null,
      service_notes: location.service_notes ?? null,
      is_primary: location.is_primary ?? index === 0,
      status: "active",
      created_at: now,
      updated_at: now,
    })),
  };
}

export function useCustomers() {
  return useQuery({
    queryKey: customersQueryKey,
    queryFn: () => getLocalDemoFixtures()?.customers ?? listCustomers(customersPort),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CustomerInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(createLocalDemoCustomer(input))
        : createCustomer(customersPort, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: customersQueryKey });
      const previous =
        queryClient.getQueryData<Customer[]>(customersQueryKey) ?? [];
      const optimisticCustomer = makeOptimisticCustomer(input);

      queryClient.setQueryData<Customer[]>(customersQueryKey, [
        optimisticCustomer,
        ...previous,
      ]);

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(customersQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKey });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) =>
      getLocalDemoFixtures()
        ? Promise.resolve(updateLocalDemoCustomer(id, input))
        : updateCustomer(customersPort, id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: customersQueryKey });
      const previous =
        queryClient.getQueryData<Customer[]>(customersQueryKey) ?? [];
      const optimisticCustomer = makeOptimisticCustomer(input);

      queryClient.setQueryData<Customer[]>(
        customersQueryKey,
        previous.map((customer) =>
          customer.id === id
            ? {
                ...optimisticCustomer,
                id,
                created_at: customer.created_at,
                locations: optimisticCustomer.locations?.map(
                  (location, index) => ({
                    ...location,
                    id: input.locations[index]?.id ?? location.id,
                    customer_id: id,
                  }),
                ),
              }
            : customer,
        ),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(customersQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKey });
    },
  });
}

export function useArchiveCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getLocalDemoFixtures()
        ? Promise.resolve(archiveLocalDemoCustomer(id))
        : archiveCustomer(customersPort, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: customersQueryKey });
      const previous =
        queryClient.getQueryData<Customer[]>(customersQueryKey) ?? [];

      queryClient.setQueryData<Customer[]>(
        customersQueryKey,
        previous.map((customer) =>
          customer.id === id
            ? {
                ...customer,
                status: "archived",
                locations: customer.locations?.map((location) => ({
                  ...location,
                  status: "archived",
                  is_primary: false,
                })),
              }
            : customer,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(customersQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: customersQueryKey });
    },
  });
}
