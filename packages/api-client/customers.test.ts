import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  archiveCustomerRecord,
  createCustomerRecord,
  listCustomerRecords,
  updateCustomerRecord,
} from "./customers";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }

  upsert(...args: unknown[]) {
    this.calls.push(["upsert", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  not(...args: unknown[]) {
    this.calls.push(["not", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const now = "2026-05-05T00:00:00Z";

describe("customer api client", () => {
  const from = vi.mocked(supabase.from);

  beforeEach(() => {
    from.mockReset();
  });

  it("lists customers with locations", async () => {
    const customersQuery = new MockQuery({
      data: [
        {
          id: "customer-1",
          name: "Apex Homes",
          phone: null,
          email: null,
          property_type: "residential",
          service_notes: null,
          status: "active",
          created_at: now,
          updated_at: now,
          locations: [],
        },
      ],
      error: null,
    });
    from.mockReturnValue(customersQuery as never);

    const customers = await listCustomerRecords();

    expect(customers).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("customers");
    expect(customersQuery.calls).toContainEqual(["select", ["*, locations(*)"]]);
  });

  it("creates a customer with locations", async () => {
    const customerQuery = new MockQuery({
      data: {
        id: "customer-1",
        name: "Apex Homes",
        phone: "555-1111",
        email: null,
        property_type: "residential",
        service_notes: null,
        status: "active",
        created_at: now,
        updated_at: now,
      },
      error: null,
    });
    const locationsQuery = new MockQuery({
      data: [
        {
          id: "location-1",
          customer_id: "customer-1",
          address: "10 Pine Street",
          nickname: null,
          service_notes: null,
          is_primary: true,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ],
      error: null,
    });
    from.mockReturnValueOnce(customerQuery as never).mockReturnValueOnce(locationsQuery as never);

    const customer = await createCustomerRecord({
      name: "Apex Homes",
      phone: "555-1111",
      email: null,
      property_type: "residential",
      service_notes: null,
      locations: [{ address: "10 Pine Street" }],
    });

    expect(customer.locations).toHaveLength(1);
    expect(customerQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          name: "Apex Homes",
          status: "active",
        }),
      ],
    ]);
    expect(locationsQuery.calls[0]).toEqual([
      "insert",
      [
        [
          expect.objectContaining({
            customer_id: "customer-1",
            address: "10 Pine Street",
            is_primary: true,
          }),
        ],
      ],
    ]);
  });

  it("updates a customer and archives omitted locations", async () => {
    const customerQuery = new MockQuery({
      data: {
        id: "customer-1",
        name: "Apex Homes",
        phone: null,
        email: null,
        property_type: "commercial",
        service_notes: null,
        status: "active",
        created_at: now,
        updated_at: now,
      },
      error: null,
    });
    const archiveQuery = new MockQuery({ data: null, error: null });
    const upsertQuery = new MockQuery({ data: [], error: null });
    from
      .mockReturnValueOnce(customerQuery as never)
      .mockReturnValueOnce(archiveQuery as never)
      .mockReturnValueOnce(upsertQuery as never);

    await updateCustomerRecord("customer-1", {
      name: "Apex Homes",
      property_type: "commercial",
      locations: [{ id: "location-1", address: "10 Pine Street" }],
    });

    expect(archiveQuery.calls).toContainEqual(["eq", ["customer_id", "customer-1"]]);
    expect(archiveQuery.calls).toContainEqual(["not", ["id", "in", "(location-1)"]]);
    expect(upsertQuery.calls[0][0]).toBe("upsert");
  });

  it("archives a customer and its locations", async () => {
    const locationsQuery = new MockQuery({ data: null, error: null });
    const customerQuery = new MockQuery({
      data: {
        id: "customer-1",
        name: "Apex Homes",
        phone: null,
        email: null,
        property_type: "residential",
        service_notes: null,
        status: "archived",
        created_at: now,
        updated_at: now,
        locations: [],
      },
      error: null,
    });
    from.mockReturnValueOnce(locationsQuery as never).mockReturnValueOnce(customerQuery as never);

    const archived = await archiveCustomerRecord("customer-1");

    expect(archived.status).toBe("archived");
    expect(locationsQuery.calls[0]).toEqual([
      "update",
      [{ status: "archived", is_primary: false }],
    ]);
  });
});
