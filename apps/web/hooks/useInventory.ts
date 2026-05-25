"use client";

import {
  archiveChemicalInventory,
  createChemicalInventory,
  createChemicalLog,
  listChemicalInventory,
  listChemicalLogs,
  updateChemicalInventory,
} from "@pest-patrol/domain";
import type {
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  ChemicalLog,
  ChemicalLogInput,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveLocalDemoInventoryItem,
  createLocalDemoChemicalLog,
  createLocalDemoInventoryItem,
  getLocalDemoFixtures,
  updateLocalDemoInventoryItem,
} from "./localDemoData";

export const chemicalInventoryQueryKey = ["chemical-inventory"] as const;
export const chemicalLogsQueryKey = ["chemical-logs"] as const;

function makeOptimisticInventoryItem(
  input: ChemicalInventoryInput,
): ChemicalInventoryItem {
  const now = new Date().toISOString();

  return {
    id: `optimistic-${crypto.randomUUID()}`,
    name: input.name,
    epa_number: input.epa_number ?? null,
    current_stock: input.current_stock,
    unit: input.unit,
    reorder_level: input.reorder_level ?? null,
    status: "active",
    created_at: now,
    updated_at: now,
  };
}

function makeOptimisticChemicalLog(input: ChemicalLogInput): ChemicalLog {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    job_id: input.job_id,
    chemical_id: input.chemical_id,
    amount_used: input.amount_used,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
  };
}

export function useChemicalInventory() {
  return useQuery({
    queryKey: chemicalInventoryQueryKey,
    queryFn: () => getLocalDemoFixtures()?.inventory ?? listChemicalInventory(),
  });
}

export function useChemicalLogs() {
  return useQuery({
    queryKey: chemicalLogsQueryKey,
    queryFn: () => getLocalDemoFixtures()?.chemicalLogs ?? listChemicalLogs(),
  });
}

export function useCreateChemicalInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChemicalInventoryInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(createLocalDemoInventoryItem(input))
        : createChemicalInventory(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: chemicalInventoryQueryKey });
      const previous =
        queryClient.getQueryData<ChemicalInventoryItem[]>(
          chemicalInventoryQueryKey,
        ) ?? [];

      queryClient.setQueryData<ChemicalInventoryItem[]>(
        chemicalInventoryQueryKey,
        [makeOptimisticInventoryItem(input), ...previous],
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(
        chemicalInventoryQueryKey,
        context?.previous ?? [],
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: chemicalInventoryQueryKey,
      });
    },
  });
}

export function useUpdateChemicalInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: ChemicalInventoryInput;
    }) =>
      getLocalDemoFixtures()
        ? Promise.resolve(updateLocalDemoInventoryItem(id, input))
        : updateChemicalInventory(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: chemicalInventoryQueryKey });
      const previous =
        queryClient.getQueryData<ChemicalInventoryItem[]>(
          chemicalInventoryQueryKey,
        ) ?? [];
      const optimisticItem = makeOptimisticInventoryItem(input);

      queryClient.setQueryData<ChemicalInventoryItem[]>(
        chemicalInventoryQueryKey,
        previous.map((item) =>
          item.id === id
            ? {
                ...optimisticItem,
                id,
                created_at: item.created_at,
              }
            : item,
        ),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(
        chemicalInventoryQueryKey,
        context?.previous ?? [],
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: chemicalInventoryQueryKey,
      });
    },
  });
}

export function useArchiveChemicalInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      getLocalDemoFixtures()
        ? Promise.resolve(archiveLocalDemoInventoryItem(id))
        : archiveChemicalInventory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: chemicalInventoryQueryKey });
      const previous =
        queryClient.getQueryData<ChemicalInventoryItem[]>(
          chemicalInventoryQueryKey,
        ) ?? [];

      queryClient.setQueryData<ChemicalInventoryItem[]>(
        chemicalInventoryQueryKey,
        previous.map((item) =>
          item.id === id ? { ...item, status: "archived" } : item,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(
        chemicalInventoryQueryKey,
        context?.previous ?? [],
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: chemicalInventoryQueryKey,
      });
    },
  });
}

export function useCreateChemicalLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChemicalLogInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(createLocalDemoChemicalLog(input))
        : createChemicalLog(input),
    onMutate: async (input) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: chemicalInventoryQueryKey }),
        queryClient.cancelQueries({ queryKey: chemicalLogsQueryKey }),
      ]);
      const previousInventory =
        queryClient.getQueryData<ChemicalInventoryItem[]>(
          chemicalInventoryQueryKey,
        ) ?? [];
      const previousLogs =
        queryClient.getQueryData<ChemicalLog[]>(chemicalLogsQueryKey) ?? [];

      queryClient.setQueryData<ChemicalInventoryItem[]>(
        chemicalInventoryQueryKey,
        previousInventory.map((item) =>
          item.id === input.chemical_id
            ? { ...item, current_stock: item.current_stock - input.amount_used }
            : item,
        ),
      );
      queryClient.setQueryData<ChemicalLog[]>(chemicalLogsQueryKey, [
        makeOptimisticChemicalLog(input),
        ...previousLogs,
      ]);

      return { previousInventory, previousLogs };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(
        chemicalInventoryQueryKey,
        context?.previousInventory ?? [],
      );
      queryClient.setQueryData(
        chemicalLogsQueryKey,
        context?.previousLogs ?? [],
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: chemicalInventoryQueryKey,
      });
      void queryClient.invalidateQueries({ queryKey: chemicalLogsQueryKey });
    },
  });
}
