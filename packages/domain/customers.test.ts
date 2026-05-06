import { describe, expect, it } from "vitest";

import { filterCustomers, validateCustomerInput } from "./customers";
import type { Customer } from "@pest-patrol/types";

const validInput = {
  name: "  Acme Pest Stop  ",
  phone: " 555-0100 ",
  email: "",
  property_type: "commercial" as const,
  service_notes: "  Gate code 1234 ",
  locations: [
    {
      address: "  100 Main St ",
      nickname: "",
      service_notes: "  Rear entrance ",
    },
    {
      address: "200 Oak Ave",
      is_primary: true,
    },
  ],
};

describe("customer domain", () => {
  it("rejects a missing customer name", () => {
    expect(() =>
      validateCustomerInput({ ...validInput, name: " " }),
    ).toThrow("Customer name is required");
  });

  it("rejects a customer without locations", () => {
    expect(() =>
      validateCustomerInput({ ...validInput, locations: [] }),
    ).toThrow("At least one location is required");
  });

  it("normalizes a customer with multiple locations", () => {
    const result = validateCustomerInput(validInput);

    expect(result).toMatchObject({
      name: "Acme Pest Stop",
      phone: "555-0100",
      email: null,
      service_notes: "Gate code 1234",
    });
    expect(result.locations).toHaveLength(2);
    expect(result.locations[0]).toMatchObject({
      address: "100 Main St",
      nickname: null,
      service_notes: "Rear entrance",
      is_primary: false,
    });
    expect(result.locations[1]).toMatchObject({
      address: "200 Oak Ave",
      is_primary: true,
    });
  });

  it("filters by active status and search text", () => {
    const customers = [
      {
        id: "customer-1",
        name: "Apex Homes",
        phone: "555-1111",
        email: null,
        property_type: "residential",
        service_notes: null,
        status: "active",
        created_at: "2026-05-05T00:00:00Z",
        updated_at: "2026-05-05T00:00:00Z",
        locations: [
          {
            id: "location-1",
            customer_id: "customer-1",
            address: "10 Pine Street",
            nickname: null,
            service_notes: null,
            is_primary: true,
            status: "active",
            created_at: "2026-05-05T00:00:00Z",
            updated_at: "2026-05-05T00:00:00Z",
          },
        ],
      },
      {
        id: "customer-2",
        name: "Archived Shop",
        phone: null,
        email: null,
        property_type: "commercial",
        service_notes: null,
        status: "archived",
        created_at: "2026-05-05T00:00:00Z",
        updated_at: "2026-05-05T00:00:00Z",
        locations: [],
      },
    ] satisfies Customer[];

    expect(filterCustomers(customers, "pine", "active")).toHaveLength(1);
    expect(filterCustomers(customers, "", "archived")).toHaveLength(1);
  });
});
