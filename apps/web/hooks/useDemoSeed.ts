"use client";

import {
  getDemoSeedStatusRecord,
  prepareLocalDemoLoginRecord,
  runDemoSeedActionRecord,
} from "@pest-patrol/api-client";
import type {
  DemoSeedActionInput,
  DemoSeedActionResponse,
  DemoSeedStatusResponse,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const demoSeedStatusQueryKey = ["demo-seed-status"] as const;

export function useDemoSeedStatus() {
  return useQuery<DemoSeedStatusResponse>({
    queryKey: demoSeedStatusQueryKey,
    queryFn: () => getDemoSeedStatusRecord(),
  });
}

export function useRunDemoSeedAction() {
  const queryClient = useQueryClient();

  return useMutation<DemoSeedActionResponse, Error, DemoSeedActionInput>({
    mutationFn: (input: DemoSeedActionInput) => runDemoSeedActionRecord(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: demoSeedStatusQueryKey });
    },
  });
}

export function usePrepareLocalDemoLogin() {
  const queryClient = useQueryClient();

  return useMutation<DemoSeedActionResponse, Error>({
    mutationFn: prepareLocalDemoLoginRecord,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: demoSeedStatusQueryKey });
    },
  });
}
