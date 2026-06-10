import type { Job } from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  buildWorkOrderInputFromEstimate,
  canConvertEstimateToWorkOrder,
  getEstimateConversionGuidance,
  getEstimateConversionReadiness,
  getExistingWorkOrderForEstimate,
} from "./estimateConversion";

const now = "2026-06-09T12:00:00Z";

function job(overrides: Partial<Job> = {}): Job {
  return {
    assigned_tech_id: null,
    billing_disposition: "billable",
    created_at: now,
    customer_id: "customer-1",
    estimate_status: "not_applicable",
    id: "job-1",
    job_purpose: "service",
    location_id: "location-1",
    parent_job_id: null,
    scheduled_end: null,
    scheduled_start: now,
    service_cadence: "one_time",
    service_family: "general_pest",
    service_notes: null,
    service_offering_id: "general_pest_initial",
    status: "scheduled",
    updated_at: now,
    ...overrides,
  };
}

function estimate(overrides: Partial<Job> = {}) {
  return job({
    billing_disposition: "estimate_only",
    estimate_status: "presented",
    job_purpose: "estimate",
    service_cadence: "none",
    service_family: "rodent_attic",
    service_notes: "Seal entry points and review attic access.",
    service_offering_id: "rodent_inspection",
    ...overrides,
  });
}

describe("estimate conversion", () => {
  it("allows estimate-only jobs to convert", () => {
    expect(canConvertEstimateToWorkOrder(estimate())).toBe(true);
    expect(getEstimateConversionReadiness(estimate())).toMatchObject({
      can_convert: true,
      status: "ready",
      title: "Convert estimate to work order",
    });
  });

  it("blocks non-estimate jobs", () => {
    expect(canConvertEstimateToWorkOrder(job())).toBe(false);
    expect(getEstimateConversionReadiness(job()).reasons[0]).toMatch(
      /Only estimate jobs/i,
    );
  });

  it("blocks canceled and declined estimates", () => {
    expect(
      getEstimateConversionReadiness(estimate({ status: "canceled" })),
    ).toMatchObject({
      can_convert: false,
      title: "Estimate canceled",
    });
    expect(
      getEstimateConversionReadiness(
        estimate({ estimate_status: "declined" }),
      ),
    ).toMatchObject({
      can_convert: false,
      title: "Estimate declined",
    });
  });

  it("maps rodent exclusion estimates to linked project work orders", () => {
    const input = buildWorkOrderInputFromEstimate(estimate(), {
      estimate_job_id: "job-1",
      scheduled_start: "2026-06-10T09:00",
    });

    expect(input).toMatchObject({
      billing_disposition: "billable",
      customer_id: "customer-1",
      job_purpose: "project_phase",
      location_id: "location-1",
      parent_job_id: "job-1",
      service_cadence: "project",
      service_family: "rodent_attic",
      service_offering_id: "rodent_exclusion",
      service_notes: "Seal entry points and review attic access.",
    });
  });

  it("maps general pest estimates to billable one-time service work", () => {
    const input = buildWorkOrderInputFromEstimate(
      estimate({
        service_family: "general_pest",
        service_offering_id: "general_pest_initial",
      }),
      {
        estimate_job_id: "job-1",
        scheduled_start: "2026-06-10T09:00",
      },
    );

    expect(input).toMatchObject({
      billing_disposition: "billable",
      job_purpose: "service",
      service_cadence: "one_time",
      service_family: "general_pest",
      service_offering_id: "general_pest_initial",
    });
  });

  it("maps termite and WDO estimates to termite project work orders", () => {
    const input = buildWorkOrderInputFromEstimate(
      estimate({
        service_family: "termite_wdo",
        service_offering_id: "wdo_escrow_inspection",
      }),
      {
        estimate_job_id: "job-1",
        scheduled_start: "2026-06-10T09:00",
      },
    );

    expect(input).toMatchObject({
      billing_disposition: "billable",
      job_purpose: "project_phase",
      service_cadence: "project",
      service_family: "termite_wdo",
      service_offering_id: "termite_repair",
    });
  });

  it("prevents silent duplicate conversion", () => {
    const source = estimate();
    const workOrder = job({
      id: "job-work-order",
      parent_job_id: source.id,
      service_offering_id: "rodent_exclusion",
    });

    expect(getExistingWorkOrderForEstimate(source, [source, workOrder])).toBe(
      workOrder,
    );
    expect(getEstimateConversionReadiness(source, workOrder)).toMatchObject({
      can_convert: false,
      status: "already_converted",
    });
  });

  it("keeps operator copy free of internal field names", () => {
    const guidance = getEstimateConversionGuidance(estimate());
    const copy = [guidance.readiness.summary, ...guidance.items].join(" ");

    expect(copy).not.toMatch(
      /parent_job_id|service_offering_id|billing_disposition|project_phase/i,
    );
    expect(copy).toMatch(/No invoice or payment link is created automatically/i);
  });
});
