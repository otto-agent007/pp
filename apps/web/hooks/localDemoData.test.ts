import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  activateLocalDemoFixtureSession,
  archiveLocalDemoCustomer,
  archiveLocalDemoInventoryItem,
  assignLocalDemoJobTechnician,
  createLocalDemoChemicalLog,
  createLocalDemoCustomer,
  createLocalDemoInventoryItem,
  createLocalDemoInvoice,
  createLocalDemoInvoicePaymentLink,
  createLocalDemoJob,
  createLocalDemoPortalAccessToken,
  deactivateLocalDemoFixtureSession,
  getLocalDemoFixtures,
  inviteLocalDemoTechnician,
  isLocalDemoFixtureMode,
  markLocalDemoInvoicePaid,
  resetLocalDemoFixtures,
  revokeLocalDemoPortalAccessToken,
  sendLocalDemoPortalAccessToken,
  updateLocalDemoCustomer,
  updateLocalDemoJobStatus,
  voidLocalDemoInvoice,
} from "./localDemoData";

describe("local demo editable fixture store", () => {
  beforeEach(() => {
    deactivateLocalDemoFixtureSession();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    resetLocalDemoFixtures();
  });

  it("can be activated for a demo session even when Supabase env exists", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "demo-anon-key");

    expect(isLocalDemoFixtureMode()).toBe(false);
    expect(getLocalDemoFixtures()).toBeNull();

    activateLocalDemoFixtureSession({ reset: true });

    expect(isLocalDemoFixtureMode()).toBe(true);
    expect(getLocalDemoFixtures()?.customers).toHaveLength(100);
    expect(getLocalDemoFixtures()?.technicians).toHaveLength(16);
    expect(getLocalDemoFixtures()?.jobs).toHaveLength(180);

    deactivateLocalDemoFixtureSession();

    expect(isLocalDemoFixtureMode()).toBe(false);
    expect(getLocalDemoFixtures()).toBeNull();
  });

  it("starts from the canonical large demo and resets edits for reuse", () => {
    const created = createLocalDemoCustomer({
      email: "demo+edited-customer@example.test",
      locations: [
        {
          address: "900 Demo Reset Way, San Diego, CA 92101",
          is_primary: true,
          nickname: "Reset suite",
          service_notes: "Temporary local edit",
        },
      ],
      name: "Demo - Edited Customer",
      phone: "555-0199",
      property_type: "commercial",
      service_notes: "Editable local customer",
    });

    expect(getLocalDemoFixtures()?.customers).toHaveLength(101);

    const updated = updateLocalDemoCustomer(created.id, {
      email: "demo+edited-customer@example.test",
      locations: [
        {
          address: "901 Demo Reset Way, San Diego, CA 92101",
          is_primary: true,
          nickname: "Updated suite",
        },
      ],
      name: "Demo - Edited Customer Updated",
      phone: "555-0199",
      property_type: "commercial",
    });
    const archived = archiveLocalDemoCustomer(created.id);

    expect(updated.name).toBe("Demo - Edited Customer Updated");
    expect(archived.status).toBe("archived");

    resetLocalDemoFixtures();

    expect(getLocalDemoFixtures()?.customers).toHaveLength(100);
    expect(
      getLocalDemoFixtures()?.customers.some(
        (customer) => customer.id === created.id,
      ),
    ).toBe(false);
  });

  it("edits technicians and jobs without calling Supabase", () => {
    const fixtures = getLocalDemoFixtures();
    const customer = fixtures?.customers[0];
    const location = customer?.locations?.[0];
    const technician = fixtures?.technicians[0];

    if (!customer || !location || !technician) {
      throw new Error("Expected canonical local demo fixtures");
    }

    const invited = inviteLocalDemoTechnician({
      display_name: "Demo - Route Flex",
      email: "demo+tech-route-flex@example.test",
    });
    const createdJob = createLocalDemoJob({
      assigned_tech_id: technician.id,
      customer_id: customer.id,
      location_id: location.id,
      scheduled_end: "2026-05-14T18:00:00.000Z",
      scheduled_start: "2026-05-14T17:00:00.000Z",
      service_notes: "Editable fixture job",
      status: "scheduled",
    });
    const inProgress = updateLocalDemoJobStatus(createdJob, "in_progress");
    const reassigned = assignLocalDemoJobTechnician(
      inProgress,
      invited.technician.id,
    );

    expect(getLocalDemoFixtures()?.technicians).toHaveLength(17);
    expect(getLocalDemoFixtures()?.jobs).toHaveLength(181);
    expect(reassigned).toMatchObject({
      assigned_tech_id: invited.technician.id,
      status: "in_progress",
    });
  });

  it("edits inventory usage and invoices locally", () => {
    const fixtures = getLocalDemoFixtures();
    const completedJob = fixtures?.jobs.find(
      (job) => job.status === "completed",
    );

    if (!completedJob) {
      throw new Error("Expected a completed fixture job");
    }

    const inventory = createLocalDemoInventoryItem({
      current_stock: 10,
      epa_number: "N/A",
      name: "Demo - Local Test Material",
      reorder_level: 2,
      unit: "each",
    });
    const log = createLocalDemoChemicalLog({
      amount_used: 2,
      chemical_id: inventory.id,
      job_id: completedJob.id,
      notes: "Fixture usage edit",
    });
    const archivedInventory = archiveLocalDemoInventoryItem(inventory.id);
    const invoice = createLocalDemoInvoice({
      customer_id: completedJob.customer_id,
      currency: "usd",
      due_date: null,
      job_id: completedJob.id,
      line_items: [
        {
          description: "Editable fixture invoice",
          quantity: 1,
          unit_amount_cents: 12500,
        },
      ],
      notes: "Local fixture invoice",
    });
    const link = createLocalDemoInvoicePaymentLink(invoice);
    const paid = markLocalDemoInvoicePaid(invoice.id);
    const voided = voidLocalDemoInvoice(invoice.id);

    expect(log.amount_used).toBe(2);
    expect(archivedInventory.status).toBe("archived");
    expect(
      getLocalDemoFixtures()?.inventory.find((item) => item.id === inventory.id)
        ?.current_stock,
    ).toBe(8);
    expect(link.payment_url).toContain(invoice.id);
    expect(paid.status).toBe("paid");
    expect(voided.status).toBe("void");
  });

  it("edits portal access token state locally", () => {
    const customer = getLocalDemoFixtures()?.customers[0];

    if (!customer) {
      throw new Error("Expected a fixture customer");
    }

    const grant = createLocalDemoPortalAccessToken({
      customer_id: customer.id,
      expires_at: null,
    });
    const send = sendLocalDemoPortalAccessToken({
      customer_id: customer.id,
      portal_url: grant.portal_url,
      token_id: grant.token_id,
    });
    const revoked = revokeLocalDemoPortalAccessToken(grant.token_id);
    const events =
      getLocalDemoFixtures()?.portalAccessTokenEventsByTokenId[grant.token_id];

    expect(grant.portal_url).toContain("access_token=");
    expect(grant.portal_url).not.toContain("?token=");
    expect(send).toEqual({ provider: "webhook", status: "requested" });
    expect(revoked.status).toBe("revoked");
    expect(events?.map((event) => event.kind)).toEqual([
      "generated",
      "send_requested",
      "revoked",
    ]);
  });
});
