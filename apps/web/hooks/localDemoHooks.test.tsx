import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCreateCustomerPortalAccessToken,
  useCustomerPortalAccessTokens,
} from "./useCustomerPortalAccess";
import { useCreateCustomer, useCustomers } from "./useCustomers";
import { useRunDemoSeedAction } from "./useDemoSeed";
import {
  useChemicalInventory,
  useChemicalLogs,
  useCreateChemicalInventory,
  useCreateChemicalLog,
} from "./useInventory";
import { useCreateJob, useJobs } from "./useJobs";
import { useCreateInvoice, useInvoices } from "./usePayments";
import { useInviteTechnician, useTechnicians } from "./useTechnicians";
import { resetLocalDemoFixtures } from "./localDemoData";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("local demo React Query hooks", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    resetLocalDemoFixtures();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("updates core ops query data from local fixture mutations", async () => {
    const wrapper = createWrapper();
    const customers = renderHook(() => useCustomers(), { wrapper });
    const technicians = renderHook(() => useTechnicians(), { wrapper });
    const jobs = renderHook(() => useJobs(), { wrapper });
    const inventory = renderHook(() => useChemicalInventory(), { wrapper });
    const chemicalLogs = renderHook(() => useChemicalLogs(), { wrapper });
    const invoices = renderHook(() => useInvoices(), { wrapper });

    await waitFor(() =>
      expect(customers.result.current.data).toHaveLength(100),
    );
    await waitFor(() =>
      expect(technicians.result.current.data).toHaveLength(16),
    );
    await waitFor(() => expect(jobs.result.current.data).toHaveLength(180));
    await waitFor(() => expect(inventory.result.current.data).toHaveLength(14));

    const customer = customers.result.current.data?.[0];
    const location = customer?.locations?.[0];
    const completedJob = jobs.result.current.data?.find(
      (job) => job.status === "completed",
    );

    if (!customer || !location || !completedJob) {
      throw new Error("Expected loaded fixture data");
    }

    const createCustomer = renderHook(() => useCreateCustomer(), { wrapper });
    const inviteTechnician = renderHook(() => useInviteTechnician(), {
      wrapper,
    });
    const createJob = renderHook(() => useCreateJob(), { wrapper });
    const createInventory = renderHook(() => useCreateChemicalInventory(), {
      wrapper,
    });
    const createChemicalLog = renderHook(() => useCreateChemicalLog(), {
      wrapper,
    });
    const createInvoice = renderHook(() => useCreateInvoice(), { wrapper });
    const portalTokens = renderHook(
      () => useCustomerPortalAccessTokens(customer.id),
      { wrapper },
    );
    const createPortalToken = renderHook(
      () => useCreateCustomerPortalAccessToken(),
      { wrapper },
    );

    await act(async () => {
      await createCustomer.result.current.mutateAsync({
        email: "demo+hook-customer@example.test",
        locations: [
          {
            address: "910 Demo Hook Ave, San Diego, CA 92101",
            is_primary: true,
            nickname: "Hook site",
          },
        ],
        name: "Demo - Hook Customer",
        phone: "555-0200",
        property_type: "commercial",
      });
    });

    let invitedTechnicianId: string | null = null;
    await act(async () => {
      const invited = await inviteTechnician.result.current.mutateAsync({
        display_name: "Demo - Hook Technician",
        email: "demo+tech-hook@example.test",
      });
      invitedTechnicianId = invited.technician.id;
    });

    await act(async () => {
      await createJob.result.current.mutateAsync({
        assigned_tech_id: invitedTechnicianId,
        customer_id: customer.id,
        location_id: location.id,
        scheduled_end: "2026-05-14T19:00:00.000Z",
        scheduled_start: "2026-05-14T18:00:00.000Z",
        service_notes: "Hook-created local job",
        status: "scheduled",
      });
    });

    let supplyId: string | null = null;
    await act(async () => {
      const supply = await createInventory.result.current.mutateAsync({
        current_stock: 7,
        epa_number: "N/A",
        name: "Demo - Hook Restock Kit",
        reorder_level: 2,
        unit: "each",
      });
      supplyId = supply.id;
    });

    await act(async () => {
      await createChemicalLog.result.current.mutateAsync({
        amount_used: 1,
        chemical_id: supplyId ?? "",
        job_id: completedJob.id,
        notes: "Hook usage",
      });
    });

    await act(async () => {
      await createInvoice.result.current.mutateAsync({
        customer_id: completedJob.customer_id,
        currency: "usd",
        due_date: null,
        job_id: completedJob.id,
        line_items: [
          {
            description: "Hook invoice",
            quantity: 1,
            unit_amount_cents: 9800,
          },
        ],
        notes: "Hook-created local invoice",
      });
    });

    await act(async () => {
      await createPortalToken.result.current.mutateAsync({
        customer_id: customer.id,
        expires_at: null,
      });
    });

    await waitFor(() =>
      expect(
        customers.result.current.data?.some(
          (item) => item.name === "Demo - Hook Customer",
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        technicians.result.current.data?.some(
          (item) => item.email === "demo+tech-hook@example.test",
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        jobs.result.current.data?.some(
          (job) => job.service_notes === "Hook-created local job",
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        inventory.result.current.data?.find((item) => item.id === supplyId)
          ?.current_stock,
      ).toBe(6),
    );
    await waitFor(() =>
      expect(
        chemicalLogs.result.current.data?.some(
          (log) => log.notes === "Hook usage",
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        invoices.result.current.data?.some(
          (invoice) => invoice.notes === "Hook-created local invoice",
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(
        portalTokens.result.current.data?.some(
          (token) => token.status === "active",
        ),
      ).toBe(true),
    );
  });

  it("resets edited local query data when demo data reset runs", async () => {
    const wrapper = createWrapper();
    const customers = renderHook(() => useCustomers(), { wrapper });
    const createCustomer = renderHook(() => useCreateCustomer(), { wrapper });
    const runDemoSeedAction = renderHook(() => useRunDemoSeedAction(), {
      wrapper,
    });

    await waitFor(() =>
      expect(customers.result.current.data).toHaveLength(100),
    );

    await act(async () => {
      await createCustomer.result.current.mutateAsync({
        email: "demo+reset-hook@example.test",
        locations: [
          {
            address: "920 Demo Reset Ave, San Diego, CA 92101",
            is_primary: true,
            nickname: "Reset hook site",
          },
        ],
        name: "Demo - Reset Hook Customer",
        phone: "555-0201",
        property_type: "commercial",
      });
    });

    await waitFor(() =>
      expect(customers.result.current.data).toHaveLength(101),
    );

    await act(async () => {
      await runDemoSeedAction.result.current.mutateAsync({
        action: "reset",
        confirm: "seed-demo-data",
        target: "local",
      });
    });

    await waitFor(() =>
      expect(customers.result.current.data).toHaveLength(100),
    );
    expect(
      customers.result.current.data?.some(
        (customer) => customer.name === "Demo - Reset Hook Customer",
      ),
    ).toBe(false);
  });
});
