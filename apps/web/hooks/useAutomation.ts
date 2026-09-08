"use client";

import {
  archiveNotificationTemplate,
  createAutomationRule,
  createNotificationEvent,
  createNotificationTemplate,
  dismissNotificationEvent,
  getNotificationProviderStatus,
  listAutomationRules,
  listAutomationSchedulerRuns,
  listNotificationEvents,
  listNotificationTemplates,
  markNotificationEventHandled,
  restoreNotificationTemplate,
  runAutomationSchedulerManual,
  sendNotificationEventDeliveries,
  sendNotificationEventDelivery,
  updateAutomationRule,
  updateAutomationRuleStatus,
  updateNotificationTemplate,
} from "@pest-patrol/application";
import type {
  AutomationRule,
  AutomationRuleInput,
  AutomationRuleStatus,
  NotificationEvent,
  NotificationEventInput,
  NotificationTemplateInput,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLocalDemoFixtures } from "./localDemoData";
import { createAutomationAdapter } from "@pest-patrol/api-client";

const automationPort = createAutomationAdapter();


export const automationRulesQueryKey = ["automation-rules"] as const;
export const automationSchedulerRunsQueryKey = [
  "automation-scheduler-runs",
] as const;
export const notificationEventsQueryKey = ["notification-events"] as const;
export const notificationTemplatesQueryKey = [
  "notification-templates",
] as const;
export const notificationProviderStatusQueryKey = [
  "notification-provider-status",
] as const;

export function useAutomationRules() {
  return useQuery({
    queryKey: automationRulesQueryKey,
    queryFn: () => (getLocalDemoFixtures() ? [] : listAutomationRules(automationPort)),
  });
}

export function useAutomationSchedulerRuns() {
  return useQuery({
    queryKey: automationSchedulerRunsQueryKey,
    queryFn: () =>
      getLocalDemoFixtures() ? [] : listAutomationSchedulerRuns(automationPort),
  });
}

export function useRunAutomationScheduler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => runAutomationSchedulerManual(automationPort),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: automationSchedulerRunsQueryKey,
      });
      void queryClient.invalidateQueries({ queryKey: notificationEventsQueryKey });
    },
  });
}

export function useNotificationEvents() {
  return useQuery({
    queryKey: notificationEventsQueryKey,
    queryFn: () => (getLocalDemoFixtures() ? [] : listNotificationEvents(automationPort)),
  });
}

export function useNotificationTemplates() {
  return useQuery({
    queryKey: notificationTemplatesQueryKey,
    queryFn: () =>
      getLocalDemoFixtures() ? [] : listNotificationTemplates(automationPort),
  });
}

export function useNotificationProviderStatus() {
  return useQuery({
    queryKey: notificationProviderStatusQueryKey,
    queryFn: () =>
      getLocalDemoFixtures()
        ? {
            provider: "manual" as const,
            webhook_configured: false,
            webhook_secret_configured: false,
          }
        : getNotificationProviderStatus(automationPort),
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AutomationRuleInput) => createAutomationRule(automationPort, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: automationRulesQueryKey });
    },
  });
}

export function useUpdateAutomationRuleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: AutomationRuleStatus;
    }) => updateAutomationRuleStatus(automationPort, id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: automationRulesQueryKey });
      const previous =
        queryClient.getQueryData<AutomationRule[]>(automationRulesQueryKey) ?? [];

      queryClient.setQueryData<AutomationRule[]>(
        automationRulesQueryKey,
        previous.map((rule) => (rule.id === id ? { ...rule, status } : rule)),
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(automationRulesQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: automationRulesQueryKey });
    },
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: AutomationRuleInput;
    }) => updateAutomationRule(automationPort, id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: automationRulesQueryKey });
    },
  });
}

export function useCreateNotificationEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NotificationEventInput) => createNotificationEvent(automationPort, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationEventsQueryKey });
    },
  });
}

export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NotificationTemplateInput) =>
      createNotificationTemplate(automationPort, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationTemplatesQueryKey,
      });
    },
  });
}

export function useUpdateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: NotificationTemplateInput;
    }) => updateNotificationTemplate(automationPort, id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationTemplatesQueryKey,
      });
    },
  });
}

export function useArchiveNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveNotificationTemplate(automationPort, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationTemplatesQueryKey,
      });
    },
  });
}

export function useRestoreNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreNotificationTemplate(automationPort, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationTemplatesQueryKey,
      });
    },
  });
}

export function useMarkNotificationEventHandled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationEventHandled(automationPort, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationEventsQueryKey });
      const previous =
        queryClient.getQueryData<NotificationEvent[]>(
          notificationEventsQueryKey,
        ) ?? [];

      queryClient.setQueryData<NotificationEvent[]>(
        notificationEventsQueryKey,
        previous.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                status: "handled",
                handled_at: new Date().toISOString(),
              }
            : notification,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(notificationEventsQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationEventsQueryKey });
    },
  });
}

export function useDismissNotificationEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dismissNotificationEvent(automationPort, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationEventsQueryKey });
      const previous =
        queryClient.getQueryData<NotificationEvent[]>(
          notificationEventsQueryKey,
        ) ?? [];

      queryClient.setQueryData<NotificationEvent[]>(
        notificationEventsQueryKey,
        previous.map((notification) =>
          notification.id === id
            ? { ...notification, status: "dismissed" }
            : notification,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(notificationEventsQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationEventsQueryKey });
    },
  });
}

export function useSendNotificationEventDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sendNotificationEventDelivery(automationPort, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationEventsQueryKey });
      const previous =
        queryClient.getQueryData<NotificationEvent[]>(
          notificationEventsQueryKey,
        ) ?? [];

      queryClient.setQueryData<NotificationEvent[]>(
        notificationEventsQueryKey,
        previous.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                delivery_status: "sending",
                last_delivery_error: null,
              }
            : notification,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(notificationEventsQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationEventsQueryKey });
    },
  });
}

export function useSendNotificationBulkDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => sendNotificationEventDeliveries(automationPort, ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationEventsQueryKey });
    },
  });
}
