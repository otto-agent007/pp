"use client";

import {
  createInvoice,
  createInvoicePaymentLink,
  listInvoices,
  markInvoicePaid,
  voidInvoice,
} from "@pest-patrol/domain";
import type { Invoice, InvoiceInput } from "@pest-patrol/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const invoicesQueryKey = ["invoices"] as const;

export function useInvoices() {
  return useQuery({
    queryKey: invoicesQueryKey,
    queryFn: listInvoices,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoicesQueryKey });
    },
  });
}

export function useCreateInvoicePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvoicePaymentLink,
    onMutate: async (invoice) => {
      await queryClient.cancelQueries({ queryKey: invoicesQueryKey });
      const previous = queryClient.getQueryData<Invoice[]>(invoicesQueryKey) ?? [];

      queryClient.setQueryData<Invoice[]>(
        invoicesQueryKey,
        previous.map((current) =>
          current.id === invoice.id ? { ...current, status: "sent" } : current,
        ),
      );

      return { previous };
    },
    onError: (_error, _invoice, context) => {
      queryClient.setQueryData(invoicesQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: invoicesQueryKey });
    },
  });
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markInvoicePaid,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: invoicesQueryKey });
      const previous = queryClient.getQueryData<Invoice[]>(invoicesQueryKey) ?? [];

      queryClient.setQueryData<Invoice[]>(
        invoicesQueryKey,
        previous.map((invoice) =>
          invoice.id === id ? { ...invoice, status: "paid" } : invoice,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(invoicesQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: invoicesQueryKey });
    },
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: voidInvoice,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: invoicesQueryKey });
      const previous = queryClient.getQueryData<Invoice[]>(invoicesQueryKey) ?? [];

      queryClient.setQueryData<Invoice[]>(
        invoicesQueryKey,
        previous.map((invoice) =>
          invoice.id === id ? { ...invoice, status: "void" } : invoice,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(invoicesQueryKey, context?.previous ?? []);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: invoicesQueryKey });
    },
  });
}

export type CreateInvoiceMutationInput = InvoiceInput;
