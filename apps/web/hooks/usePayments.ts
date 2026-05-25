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
import {
  createLocalDemoInvoice,
  createLocalDemoInvoicePaymentLink,
  getLocalDemoFixtures,
  markLocalDemoInvoicePaid,
  voidLocalDemoInvoice,
} from "./localDemoData";

export const invoicesQueryKey = ["invoices"] as const;

export function useInvoices() {
  return useQuery({
    queryKey: invoicesQueryKey,
    queryFn: () => getLocalDemoFixtures()?.invoices ?? listInvoices(),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InvoiceInput) =>
      getLocalDemoFixtures()
        ? Promise.resolve(createLocalDemoInvoice(input))
        : createInvoice(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoicesQueryKey });
    },
  });
}

export function useCreateInvoicePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoice: Invoice) => {
      const fixtures = getLocalDemoFixtures();

      if (fixtures) {
        createLocalDemoInvoicePaymentLink(invoice);
        const updatedInvoice = fixtures.invoices.find(
          (current) => current.id === invoice.id,
        );

        if (!updatedInvoice) {
          throw new Error("Invoice was not found in the local demo.");
        }

        return Promise.resolve(updatedInvoice);
      }

      return createInvoicePaymentLink(invoice);
    },
    onMutate: async (invoice) => {
      await queryClient.cancelQueries({ queryKey: invoicesQueryKey });
      const previous =
        queryClient.getQueryData<Invoice[]>(invoicesQueryKey) ?? [];

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
    mutationFn: (id: string) =>
      getLocalDemoFixtures()
        ? Promise.resolve(markLocalDemoInvoicePaid(id))
        : markInvoicePaid(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: invoicesQueryKey });
      const previous =
        queryClient.getQueryData<Invoice[]>(invoicesQueryKey) ?? [];

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
    mutationFn: (id: string) =>
      getLocalDemoFixtures()
        ? Promise.resolve(voidLocalDemoInvoice(id))
        : voidInvoice(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: invoicesQueryKey });
      const previous =
        queryClient.getQueryData<Invoice[]>(invoicesQueryKey) ?? [];

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
