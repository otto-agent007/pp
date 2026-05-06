"use client";

import {
  createAutomationRule,
  createNotificationEvent,
  createNotificationTemplate,
  archiveNotificationTemplate,
  dismissNotificationEvent,
  listAutomationSchedulerRuns,
  listAutomationRules,
  getNotificationProviderStatus,
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
} from "@pest-patrol/domain";
import type {
  AutomationRule,
  AutomationRuleInput,
  AutomationRuleStatus,
  NotificationEvent,
  NotificationEventInput,
  NotificationTemplateInput,
} from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    queryFn: listAutomationRules,
  });
}

export function useAutomationSchedulerRuns() {
  return useQuery({
    queryKey: automationSchedulerRunsQueryKey,
    queryFn: listAutomationSchedulerRuns,
  });
}

export function useRunAutomationScheduler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runAutomationSchedulerManual,
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
    queryFn: listNotificationEvents,
  });
}

export function useNotificationTemplates() {
  return useQuery({
    queryKey: notificationTemplatesQueryKey,
    queryFn: listNotificationTemplates,
  });
}

export function useNotificationProviderStatus() {
  return useQuery({
    queryKey: notificationProviderStatusQueryKey,
    queryFn: getNotificationProviderStatus,
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AutomationRuleInput) => createAutomationRule(input),
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
    }) => updateAutomationRuleStatus(id, status),
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
    }) => updateAutomationRule(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: automationRulesQueryKey });
    },
  });
}

export function useCreateNotificationEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NotificationEventInput) => createNotificationEvent(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationEventsQueryKey });
    },
  });
}

export function useCreateNotificationTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NotificationTemplateInput) =>
      createNotificationTemplate(input),
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
    }) => updateNotificationTemplate(id, input),
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
    mutationFn: archiveNotificationTemplate,
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
    mutationFn: restoreNotificationTemplate,
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
    mutationFn: markNotificationEventHandled,
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
    mutationFn: dismissNotificationEvent,
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
    mutationFn: sendNotificationEventDelivery,
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
    mutationFn: sendNotificationEventDeliveries,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationEventsQueryKey });
    },
  });
}
