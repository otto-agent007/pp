import { describe, expect, it } from "vitest";
import type { Job, PropertyType, ServiceBillingFamily } from "@pest-patrol/types";

import {
  buildInvoiceLineItemsFromOffering,
  buildInvoiceNotesFromOffering,
  getPromotionSuggestionsForOffering,
  getServiceBillingGuidanceForJob,
  getServiceBillingOffering,
  inferServiceBillingOfferingFromJob,
  listServiceBillingOfferings,
  searchServiceBillingOfferings,
} from "./serviceBillingCatalog";

const now = "2026-05-06T00:00:00.000Z";

function jobWithText(
  text: string,
  propertyType: PropertyType = "residential",
): Job {
  return {
    id: `job-${text.slice(0, 10).replace(/\W+/g, "-")}`,
    customer_id: "customer-1",
    location_id: "location-1",
    assigned_tech_id: null,
    status: "completed",
    scheduled_start: now,
    scheduled_end: null,
    service_notes: text,
    created_at: now,
    updated_at: now,
    customer: {
      id: "customer-1",
      name: "Apex Homes",
      phone: null,
      email: null,
      property_type: propertyType,
      service_notes: null,
      status: "active",
      created_at: now,
      updated_at: now,
    },
    location: {
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
  };
}

describe("service billing catalog", () => {
  it("covers the major Pest Patrol service families", () => {
    const families = new Set(
      listServiceBillingOfferings().map((offering) => offering.family),
    );
    const expected: ServiceBillingFamily[] = [
      "general_pest",
      "recurring_general_pest",
      "termite_wdo",
      "rodent_attic",
      "bed_bug",
      "commercial",
      "hoa_property_management",
      "bird_gopher",
      "green_diy",
      "other",
    ];

    for (const family of expected) {
      expect(families.has(family)).toBe(true);
    }
  });

  it.each([
    ["ants", "ant_control"],
    ["bees/wasps", "bee_wasp_control"],
    ["cockroaches", "cockroach_control"],
    ["earwigs", "earwig_control"],
    ["fleas", "flea_control"],
    ["silverfish", "silverfish_control"],
    ["spiders", "spider_control"],
    ["bed bugs", "bed_bug_inspection"],
    ["termite", "termite_inspection"],
    ["WDO", "wdo_escrow_inspection"],
    ["escrow", "wdo_escrow_inspection"],
    ["rodent", "rodent_inspection"],
    ["attic", "rodent_exclusion"],
    ["gopher", "gopher_control"],
    ["bird", "bird_removal"],
    ["HOA", "hoa_common_area"],
    ["property management", "property_management_unit_service"],
    ["commercial", "commercial_single_site"],
    ["green", "green_pest_treatment"],
    ["DIY", "diy_consultation"],
  ])("finds %s in service catalog search", (query, expectedId) => {
    expect(searchServiceBillingOfferings(query).map((item) => item.id)).toContain(
      expectedId,
    );
  });

  it.each([
    ["escrow WDO Branch 3 wood destroying inspection", "wdo_escrow_inspection"],
    ["rodent attic sanitation and access point sealing", "rodent_exclusion"],
    ["quarterly routine service", "general_pest_quarterly"],
    ["restaurant commercial kitchen service", "commercial_single_site"],
    ["HOA common area service", "hoa_common_area"],
    ["tenant apartment property management unit", "property_management_unit_service"],
    ["bird nest removal", "bird_removal"],
    ["gopher mound service", "gopher_control"],
    ["bed bug treatment", "bed_bug_treatment"],
    ["green organic service", "green_pest_treatment"],
    ["DIY consultation", "diy_consultation"],
  ])("infers %s from job text", (text, expectedId) => {
    expect(inferServiceBillingOfferingFromJob(jobWithText(text)).offering.id).toBe(
      expectedId,
    );
  });

  it("prioritizes termite context over green orange-oil language", () => {
    expect(
      inferServiceBillingOfferingFromJob(
        jobWithText("termite localized orange oil option"),
      ).offering.id,
    ).toBe("termite_localized_treatment");
  });

  it("builds valid line items and rejects non-positive amounts", () => {
    const offering = getServiceBillingOffering("rodent_exclusion");

    expect(buildInvoiceLineItemsFromOffering(offering, 12500)).toEqual([
      {
        description: "Rodent exclusion and attic sanitation",
        quantity: 1,
        unit_amount_cents: 12500,
      },
    ]);
    expect(() => buildInvoiceLineItemsFromOffering(offering, 0)).toThrow(
      "Line item amount must be greater than zero",
    );
    expect(() => buildInvoiceLineItemsFromOffering(offering, -100)).toThrow(
      "Line item amount must be greater than zero",
    );
  });

  it("returns promotion suggestions without changing totals", () => {
    const offering = getServiceBillingOffering("wdo_escrow_inspection");

    expect(getPromotionSuggestionsForOffering(offering)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Real estate agent first-service offer",
        }),
      ]),
    );
    expect(
      getPromotionSuggestionsForOffering(offering)
        .map((suggestion) => `${suggestion.label} ${suggestion.summary}`)
        .join(" "),
    ).toMatch(/do not change|Suggestion only|suggestion only/i);
  });

  it("keeps customer-safe descriptions free of internal review language", () => {
    const forbidden = /internal|compliance warning|operator review|raw gps|technician notes|service-role|secret/i;

    for (const offering of listServiceBillingOfferings()) {
      expect(offering.customerSafeDescription).not.toMatch(forbidden);
      expect(offering.portalSafeSummary).not.toMatch(forbidden);
      expect(offering.suggestedLineItems[0]?.description).not.toMatch(forbidden);
    }
  });

  it("builds guidance and customer-safe notes from an inferred offering", () => {
    const job = jobWithText("WDO escrow report and clearance document");
    const guidance = getServiceBillingGuidanceForJob(job);
    const notes = buildInvoiceNotesFromOffering(
      job,
      getServiceBillingOffering(guidance.offeringId),
    );

    expect(guidance).toMatchObject({
      family: "termite_wdo",
      offeringId: "wdo_escrow_inspection",
    });
    expect(guidance.items.join(" ")).toMatch(/WDO report/i);
    expect(notes).toMatch(/WDO \/ escrow inspection completed/i);
    expect(notes).not.toMatch(/internal compliance warning/i);
  });
});
