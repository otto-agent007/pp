"use client";

import {
  getDemoSeedStatusRecord,
  prepareLocalDemoLoginRecord,
  runDemoSeedActionRecord,
} from "@pest-patrol/api-client";
import { buildDemoSeedPlan, getDemoSeedPlanSummary } from "@pest-patrol/domain";
import type {
  DemoSeedActionInput,
  DemoSeedActionResponse,
  DemoSeedStatusResponse,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  isLocalDemoFixtureMode,
  resetLocalDemoFixtures,
} from "./localDemoData";

export const demoSeedStatusQueryKey = ["demo-seed-status"] as const;

function localFixtureStatus(): DemoSeedStatusResponse {
  return {
    status: {
      available: true,
      environment_label: "Local fixture demo",
      reason: null,
      target: "local",
    },
    summary: getDemoSeedPlanSummary(buildDemoSeedPlan()),
  };
}

function localFixtureAction(
  input: DemoSeedActionInput,
): DemoSeedActionResponse {
  const status = localFixtureStatus();

  return {
    action: input.action,
    result: status.summary,
    ...status,
  };
}

export function useDemoSeedStatus() {
  const fixtureStatus = isLocalDemoFixtureMode() ? localFixtureStatus() : null;

  return useQuery<DemoSeedStatusResponse>({
    enabled: !fixtureStatus,
    initialData: fixtureStatus ?? undefined,
    queryKey: demoSeedStatusQueryKey,
    queryFn: () => getDemoSeedStatusRecord(),
  });
}

export function useRunDemoSeedAction() {
  const queryClient = useQueryClient();

  return useMutation<DemoSeedActionResponse, Error, DemoSeedActionInput>({
    mutationFn: (input: DemoSeedActionInput) => {
      if (isLocalDemoFixtureMode()) {
        resetLocalDemoFixtures();
        return Promise.resolve(localFixtureAction(input));
      }

      return runDemoSeedActionRecord(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      void queryClient.invalidateQueries({ queryKey: demoSeedStatusQueryKey });
    },
  });
}

export function usePrepareLocalDemoLogin() {
  const queryClient = useQueryClient();

  return useMutation<DemoSeedActionResponse, Error>({
    mutationFn: () => {
      if (isLocalDemoFixtureMode()) {
        resetLocalDemoFixtures();

        return Promise.resolve(
          localFixtureAction({
            action: "seed",
            target: "local",
          }),
        );
      }

      return prepareLocalDemoLoginRecord();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      void queryClient.invalidateQueries({ queryKey: demoSeedStatusQueryKey });
    },
  });
}
