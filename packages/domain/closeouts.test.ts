import { describe, expect, it } from "vitest";
import type { Invoice } from "@pest-patrol/types";

import {
  buildBillingQueue,
  buildCustomerPortalCloseouts,
  buildJobCloseoutReview,
  filterCustomerPortalCloseouts,
  filterCloseoutJobs,
  formatMissingCaptureList,
  getBillingQueueCounts,
  getBillingQueueItemSummary,
  getCloseoutReviewQueueFilters,
  getAdminCloseoutProofReview,
  getCustomerPortalAccessTokenLabel,
  getCustomerPortalAccessTokenEventLabel,
  getCustomerPortalAccessTokenReadiness,
  getCustomerPortalAccessTokenReadinessSummary,
  getCustomerPortalAccessTokenState,
  buildCustomerPortalUpgradeGeneratedKey,
  buildCustomerPortalUpgradeNotificationInput,
  getCustomerPortalProofHandoff,
  getCloseoutProofHandoffSummary,
  buildCustomerPortalTimeline,
  getCustomerPortalServiceSummary,
  getCustomerPortalUpgradeSummary,
  getCloseoutCounts,
  getCloseoutReviewReadiness,
  getCloseoutReviewReadinessFromCounts,
  getCustomerPortalSendProviderStatusLabel,
  validateCustomerPortalUpgradeIntentInput,
  validateCustomerPortalAccessInput,
  validateCustomerPortalSendInput,
  validateCustomerPortalAccessToken,
  validateCustomerPortalAccessTokenId,
  validateCustomerPortalCustomerId,
} from "./closeouts";

const now = "2026-05-05T00:00:00Z";
const completedJob = {
  id: "job-1",
  customer_id: "customer-1",
  location_id: "location-1",
  assigned_tech_id: "tech-1",
  scheduled_start: "2026-05-06T09:00:00Z",
  scheduled_end: null,
  status: "completed",
  service_notes: "Interior closeout",
  created_at: now,
  updated_at: now,
  customer: {
    id: "customer-1",
    name: "Apex Homes",
    phone: null,
    email: null,
    property_type: "residential",
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
} as const;
const scheduledJob = {
  ...completedJob,
  id: "job-2",
  status: "scheduled",
  service_notes: "Upcoming",
} as const;

function fullCaptureSummary(jobId: string) {
  return {
    chemicalLogs: 1,
    forms: 1,
    jobId,
    photos: 1,
    signatures: 1,
  };
}

describe("closeouts domain", () => {
  it("filters completed closeout jobs by customer and location", () => {
    expect(filterCloseoutJobs([scheduledJob, completedJob], "pine")).toEqual([
      completedJob,
    ]);
    expect(filterCloseoutJobs([scheduledJob, completedJob], "", "all")).toEqual([
      scheduledJob,
      completedJob,
    ]);
  });

  it("groups completed jobs into billing queue sections with counts and sorting", () => {
    const olderReadyJob = {
      ...completedJob,
      id: "job-ready-old",
      scheduled_start: "2026-05-01T09:00:00Z",
    };
    const newerReadyJob = {
      ...completedJob,
      id: "job-ready-new",
      scheduled_start: "2026-05-04T09:00:00Z",
    };
    const needsCapturesJob = {
      ...completedJob,
      id: "job-needs",
      scheduled_start: "2026-05-03T09:00:00Z",
    };
    const invoicedJob = {
      ...completedJob,
      id: "job-invoiced",
      scheduled_start: "2026-05-02T09:00:00Z",
    };
    const latestInvoice = {
      id: "invoice-latest",
      job_id: "job-invoiced",
      customer_id: "customer-1",
      status: "sent",
      currency: "usd",
      subtotal_cents: 12500,
      total_cents: 12500,
      due_date: null,
      notes: null,
      payment_url: "https://pay.example/invoice-latest",
      stripe_payment_link_id: null,
      created_at: "2026-05-06T00:00:00Z",
      updated_at: "2026-05-06T00:00:00Z",
      payments: [],
    } satisfies Invoice;

    const queue = buildBillingQueue(
      [newerReadyJob, scheduledJob, needsCapturesJob, invoicedJob, olderReadyJob],
      [
        {
          ...latestInvoice,
          id: "invoice-old",
          status: "draft",
          created_at: "2026-05-04T00:00:00Z",
        },
        latestInvoice,
      ],
      [
        fullCaptureSummary("job-ready-old"),
        fullCaptureSummary("job-ready-new"),
        { ...fullCaptureSummary("job-needs"), photos: 0, signatures: 0 },
        fullCaptureSummary("job-invoiced"),
      ],
    );

    expect(queue.ready.map((item) => item.job.id)).toEqual([
      "job-ready-old",
      "job-ready-new",
    ]);
    expect(queue.needsCaptures.map((item) => item.job.id)).toEqual([
      "job-needs",
    ]);
    expect(queue.invoiced.map((item) => item.job.id)).toEqual(["job-invoiced"]);
    expect(queue.needsCaptures[0].readiness).toMatchObject({
      billingReady: false,
      label: "Needs field captures",
      missing: ["Photo", "Signature"],
    });
    expect(queue.invoiced[0].invoice).toMatchObject({
      id: "invoice-latest",
      status: "sent",
    });
    expect(getBillingQueueCounts(queue)).toEqual({
      invoiced: 1,
      needsCaptures: 1,
      ready: 2,
      totalCompleted: 4,
    });
    expect(getBillingQueueItemSummary(queue.needsCaptures[0])).toBe(
      "Needs photo and signature before billing.",
    );
    expect(getBillingQueueItemSummary(queue.ready[0])).toBe("Ready to bill.");
    expect(getCloseoutReviewQueueFilters(queue)).toEqual([
      {
        count: 3,
        id: "proof_ready",
        label: "Proof ready",
        summary: "Field proof is complete and ready for office review.",
      },
      {
        count: 1,
        id: "missing_capture",
        label: "Missing captures",
        summary: "Completed jobs still need field evidence before billing.",
      },
      {
        count: 2,
        id: "gps_review",
        label: "GPS review",
        summary: "Review synced arrival and departure proof before invoicing.",
      },
      {
        count: 2,
        id: "needs_invoice",
        label: "Needs invoice",
        summary: "Proof-ready jobs without an invoice.",
      },
      {
        count: 1,
        id: "billing_ready",
        label: "Billing ready",
        summary: "Jobs with invoice handoff already started.",
      },
    ]);
  });

  it("formats missing capture lists for billing queue copy", () => {
    expect(formatMissingCaptureList(["Photo"])).toBe("photo");
    expect(formatMissingCaptureList(["Photo", "Signature"])).toBe(
      "photo and signature",
    );
    expect(formatMissingCaptureList(["Treatment form", "Photo", "Signature"])).toBe(
      "treatment form, photo, and signature",
    );
  });

  it("builds closeout reviews with separated photos and signatures", () => {
    const review = buildJobCloseoutReview({
      job: completedJob,
      formSubmissions: [
        {
          id: "submission-1",
          job_id: "job-1",
          template_id: "template-1",
          form_data: { target_pests: "Ants" },
          submitted_by: "tech-1",
          submitted_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
      chemicalLogs: [
        {
          id: "log-1",
          job_id: "job-1",
          chemical_id: "chemical-1",
          amount_used: 1,
          notes: null,
          created_at: now,
        },
      ],
      media: [
        {
          id: "media-1",
          job_id: "job-1",
          media_type: "photo",
          storage_bucket: "job-media",
          storage_path: "job-1/photo.jpg",
          description: "Kitchen",
          uploaded_by: "tech-1",
          captured_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          id: "media-2",
          job_id: "job-1",
          media_type: "signature",
          storage_bucket: "job-media",
          storage_path: "job-1/signature.png",
          description: "Signed by Jamie",
          uploaded_by: "tech-1",
          captured_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    expect(getCloseoutCounts(review)).toEqual({
      chemicalLogs: 1,
      forms: 1,
      photos: 1,
      signatures: 1,
    });
    expect(review.photos[0].storage_path).toBe("job-1/photo.jpg");
    expect(review.signatures[0].storage_path).toBe("job-1/signature.png");
  });

  it("summarizes closeout readiness for office review", () => {
    const review = buildJobCloseoutReview({
      job: completedJob,
      formSubmissions: [],
      chemicalLogs: [],
      media: [
        {
          id: "media-1",
          job_id: "job-1",
          media_type: "photo",
          storage_bucket: "job-media",
          storage_path: "job-1/photo.jpg",
          description: "Kitchen",
          uploaded_by: "tech-1",
          captured_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    expect(getCloseoutReviewReadiness(review)).toEqual({
      billingReady: false,
      label: "Needs field captures",
      missing: ["Treatment form", "Chemical log", "Signature"],
      summary:
        "Photo captured. Missing treatment form, chemical log, and signature before billing.",
    });
  });

  it("summarizes closeout readiness directly from capture counts", () => {
    expect(
      getCloseoutReviewReadinessFromCounts({
        chemicalLogs: 0,
        forms: 1,
        photos: 1,
        signatures: 0,
      }),
    ).toEqual({
      billingReady: false,
      label: "Needs field captures",
      missing: ["Chemical log", "Signature"],
      summary:
        "Treatment form captured. Photo captured. Missing chemical log and signature before billing.",
    });

    expect(
      getCloseoutReviewReadinessFromCounts({
        chemicalLogs: 1,
        forms: 1,
        photos: 1,
        signatures: 1,
      }),
    ).toEqual({
      billingReady: true,
      label: "Ready for billing",
      missing: [],
      summary: "Treatment form, chemical log, photo, and signature are captured.",
    });
  });

  it("summarizes office proof handoff with sanitized GPS evidence", () => {
    const readiness = {
      billingReady: false,
      label: "Needs field captures",
      missing: ["Treatment form", "Chemical log", "Signature"],
      summary:
        "Photo captured. Missing treatment form, chemical log, and signature before billing.",
    };
    const handoff = getCloseoutProofHandoffSummary({
      evidence: {
        job_id: "job-1",
        latest_arrival: {
          accuracy_m: 12,
          captured_at: "2026-05-06T09:05:00.000Z",
          distance_m: 80,
          event_type: "arrival",
          latitude: 33.8121,
          longitude: -117.919,
          map_url: "https://maps.example/private",
          radius_label: "Within service radius (80 m)",
          radius_state: "inside",
          within_radius: true,
        },
        latest_departure: null,
        latest_event: null,
        state: "captured",
        summary_label: "Latest GPS: Arrival",
      },
      readiness,
    });
    const serialized = JSON.stringify(handoff);

    expect(handoff).toEqual({
      exact_coordinates_disclosed: false,
      gps_items: [
        "Arrival GPS synced for service-radius review.",
        "Departure GPS still needs a synced capture.",
      ],
      gps_label: "Arrival GPS synced; departure GPS missing",
      missing_capture_guidance:
        "Ask the technician to sync treatment form, chemical log, and signature before billing or portal handoff.",
      portal_handoff_label: "Portal proof remains in progress",
      portal_handoff_summary:
        "Customer portal proof can be shared after required captures are reviewed; exact technician GPS stays private.",
      proof_label: "Needs proof review",
      proof_summary:
        "Photo captured. Missing treatment form, chemical log, and signature before billing.",
    });
    expect(serialized).not.toContain("33.8121");
    expect(serialized).not.toContain("-117.919");
    expect(serialized).not.toContain("maps.example");
  });

  it("builds admin proof review with GPS and invoice readiness", () => {
    const review = buildJobCloseoutReview({
      job: completedJob,
      formSubmissions: [
        {
          id: "submission-1",
          job_id: "job-1",
          template_id: "template-1",
          form_data: { target_pests: "Ants" },
          submitted_by: "tech-1",
          submitted_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
      chemicalLogs: [
        {
          id: "log-1",
          job_id: "job-1",
          chemical_id: "chemical-1",
          amount_used: 1,
          notes: null,
          created_at: now,
        },
      ],
      media: [
        {
          id: "media-1",
          job_id: "job-1",
          media_type: "photo",
          storage_bucket: "job-media",
          storage_path: "job-1/photo.jpg",
          description: "Kitchen",
          uploaded_by: "tech-1",
          captured_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          id: "media-2",
          job_id: "job-1",
          media_type: "signature",
          storage_bucket: "job-media",
          storage_path: "job-1/signature.png",
          description: "Signed by Jamie",
          uploaded_by: "tech-1",
          captured_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    expect(
      getAdminCloseoutProofReview({
        evidence: {
          job_id: "job-1",
          latest_arrival: null,
          latest_departure: null,
          latest_event: null,
          state: "missing",
          summary_label: "No synced GPS evidence yet",
        },
        invoice: null,
        review,
      }),
    ).toEqual({
      billing_label: "Billing captures ready",
      completion_label: "Needs review",
      gps_label: "GPS evidence missing",
      invoice_label: "No invoice yet",
      missing_labels: ["arrival GPS", "departure GPS"],
      summary: "Review arrival gps and departure gps before billing handoff.",
      sync_confidence_label: "Review synced field evidence",
    });
  });

  it("builds customer portal closeouts without admin-only data", () => {
    const closeouts = buildCustomerPortalCloseouts({
      jobs: [
        {
          id: "job-1",
          customer_id: "customer-1",
          location_id: "location-1",
          status: "completed",
          scheduled_start: "2026-05-06T09:00:00Z",
          scheduled_end: null,
          customer: { id: "customer-1", name: "Apex Homes" },
          location: {
            id: "location-1",
            address: "10 Pine Street",
            nickname: null,
          },
        },
        {
          id: "job-2",
          customer_id: "customer-1",
          location_id: "location-1",
          status: "scheduled" as never,
          scheduled_start: "2026-05-07T09:00:00Z",
          scheduled_end: null,
        },
      ],
      formSubmissions: [
        {
          id: "submission-1",
          job_id: "job-1",
          form_data: { target_pests: "Ants" },
          submitted_at: now,
        },
      ],
      media: [
        {
          id: "media-1",
          job_id: "job-1",
          media_type: "photo",
          signed_url: "https://signed.example/photo.jpg",
          description: "Kitchen",
          captured_at: now,
        },
        {
          id: "media-2",
          job_id: "job-1",
          media_type: "signature",
          signed_url: "https://signed.example/signature.png",
          description: "Signed by Jamie",
          captured_at: now,
        },
      ],
    });

    expect(closeouts).toHaveLength(1);
    expect(closeouts[0].form_submissions).toHaveLength(1);
    expect(closeouts[0].photos).toHaveLength(1);
    expect(closeouts[0].signatures).toHaveLength(1);
    expect("service_notes" in closeouts[0].job).toBe(false);
  });

  it("builds customer-safe proof handoff without exact technician GPS", () => {
    const closeout = buildCustomerPortalCloseouts({
      jobs: [
        {
          id: "job-1",
          customer_id: "customer-1",
          location_id: "location-1",
          status: "completed",
          scheduled_start: "2026-05-06T09:00:00Z",
          scheduled_end: null,
          customer: { id: "customer-1", name: "Apex Homes" },
          location: {
            id: "location-1",
            address: "10 Pine Street",
            nickname: "Main house",
          },
        },
      ],
      formSubmissions: [],
      media: [
        {
          id: "media-1",
          job_id: "job-1",
          media_type: "photo",
          signed_url: "https://signed.example/photo.jpg",
          description: "Kitchen",
          captured_at: now,
        },
      ],
    })[0];

    const handoff = getCustomerPortalProofHandoff(closeout);
    const serialized = JSON.stringify(handoff);

    expect(handoff).toEqual({
      capture_counts: {
        forms: 0,
        photos: 1,
        signatures: 0,
      },
      completion_label: "Proof in progress",
      exact_coordinates_disclosed: false,
      job_id: "job-1",
      location_label: "Main house",
      missing_labels: ["service form", "signature"],
      next_step_label: "Our office is finishing proof review.",
      privacy_label:
        "Technician GPS details stay private and are not shown in this portal.",
      service_date_label: "May 6, 2026",
      summary_label:
        "Proof of service is in progress. Missing service form and signature.",
    });
    expect(serialized).not.toContain("latitude");
    expect(serialized).not.toContain("longitude");
    expect(serialized).not.toContain("map_url");
  });

  it("filters customer portal closeouts and validates customer ids", () => {
    const closeout = {
      job: {
        id: "job-1",
        customer_id: "customer-1",
        location_id: "location-1",
        status: "completed" as const,
        scheduled_start: now,
        scheduled_end: null,
        customer: { id: "customer-1", name: "Apex Homes" },
        location: {
          id: "location-1",
          address: "10 Pine Street",
          nickname: "Main house",
        },
      },
      form_submissions: [],
      photos: [],
      signatures: [],
    };

    expect(filterCustomerPortalCloseouts([closeout], "pine")).toEqual([closeout]);
    expect(filterCustomerPortalCloseouts([closeout], "missing")).toEqual([]);
    expect(validateCustomerPortalCustomerId(" customer-1 ")).toBe("customer-1");
    expect(() => validateCustomerPortalCustomerId(" ")).toThrow(
      "Customer is required",
    );
  });

  it("summarizes customer-safe portal service details with invoice state", () => {
    const closeout = {
      job: {
        id: "job-1",
        customer_id: "customer-1",
        location_id: "location-1",
        status: "completed" as const,
        scheduled_start: "2026-05-06T09:00:00Z",
        scheduled_end: null,
        customer: { id: "customer-1", name: "Apex Homes" },
        location: {
          id: "location-1",
          address: "10 Pine Street",
          nickname: "Main house",
        },
      },
      form_submissions: [
        {
          id: "submission-1",
          job_id: "job-1",
          form_data: { target_pests: "Ants" },
          submitted_at: now,
        },
      ],
      photos: [
        {
          id: "media-1",
          job_id: "job-1",
          media_type: "photo" as const,
          signed_url: "https://signed.example/photo.jpg",
          description: "Kitchen",
          captured_at: now,
        },
      ],
      signatures: [],
    };

    expect(
      getCustomerPortalServiceSummary(closeout, [
        {
          id: "invoice-1",
          job_id: "job-1",
          status: "open",
          currency: "usd",
          total_cents: 12500,
          balance_cents: 12500,
          due_date: "2026-05-15T00:00:00Z",
          payment_url: null,
          paid_at: null,
          created_at: now,
          job: closeout.job,
          line_items: [],
        },
      ]),
    ).toEqual({
      capturesLabel: "1 form, 1 photo, 0 signatures",
      invoiceLabel: "Invoice open",
      locationLabel: "Main house",
      serviceDateLabel: "May 6, 2026",
    });
  });

  it("validates customer portal access inputs", () => {
    expect(validateCustomerPortalAccessToken(" token-1 ")).toBe("token-1");
    expect(
      validateCustomerPortalAccessInput({
        customer_id: " customer-1 ",
        expires_at: "",
      }),
    ).toEqual({
      customer_id: "customer-1",
      expires_at: null,
    });
    expect(() => validateCustomerPortalAccessToken(" ")).toThrow(
      "Portal access token is required",
    );
    expect(() => validateCustomerPortalAccessTokenId(" ")).toThrow(
      "Portal access token is required",
    );
  });

  it("validates portal send inputs and provider status labels", () => {
    expect(
      validateCustomerPortalSendInput({
        customer_id: " customer-1 ",
        token_id: " token-1 ",
        portal_url:
          " http://localhost:3000/portal/customer-1?grant=raw-token ",
      }),
    ).toEqual({
      customer_id: "customer-1",
      token_id: "token-1",
      portal_url: "http://localhost:3000/portal/customer-1?grant=raw-token",
    });
    expect(() =>
      validateCustomerPortalSendInput({
        customer_id: "customer-1",
        token_id: "",
        portal_url: "http://localhost:3000/portal/customer-1",
      }),
    ).toThrow("Portal access token is required");
    expect(() =>
      validateCustomerPortalSendInput({
        customer_id: "customer-1",
        token_id: "token-1",
        portal_url: "",
      }),
    ).toThrow("Portal URL is required");
    expect(getCustomerPortalSendProviderStatusLabel(true)).toBe(
      "Portal delivery provider configured",
    );
    expect(getCustomerPortalSendProviderStatusLabel(false)).toBe(
      "Portal delivery provider not configured",
    );
  });

  it("labels portal access token states", () => {
    const activeToken = {
      id: "token-1",
      customer_id: "customer-1",
      status: "active",
      expires_at: null,
      last_used_at: null,
      created_at: now,
      updated_at: now,
    } as const;
    const expiringToken = {
      ...activeToken,
      expires_at: "2026-05-07T00:00:00Z",
    };
    const expiredToken = {
      ...activeToken,
      expires_at: "2026-05-04T00:00:00Z",
    };
    const revokedToken = {
      ...activeToken,
      status: "revoked",
    } as const;
    const currentDate = new Date("2026-05-05T00:00:00Z");

    expect(getCustomerPortalAccessTokenState(activeToken, currentDate)).toBe(
      "active",
    );
    expect(getCustomerPortalAccessTokenLabel(activeToken, currentDate)).toBe(
      "Active",
    );
    expect(getCustomerPortalAccessTokenLabel(expiringToken, currentDate)).toBe(
      "Active until expiration",
    );
    expect(getCustomerPortalAccessTokenState(expiredToken, currentDate)).toBe(
      "expired",
    );
    expect(getCustomerPortalAccessTokenLabel(revokedToken, currentDate)).toBe(
      "Revoked",
    );
  });

  it("labels portal access token audit events", () => {
    expect(
      getCustomerPortalAccessTokenEventLabel({
        id: "event-1",
        token_id: "token-1",
        customer_id: "customer-1",
        kind: "generated",
        occurred_at: "2026-05-06T00:00:00.000Z",
      }),
    ).toBe("Link generated");
    expect(
      getCustomerPortalAccessTokenEventLabel({
        id: "event-2",
        token_id: "token-1",
        customer_id: "customer-1",
        kind: "opened",
        occurred_at: "2026-05-06T01:00:00.000Z",
      }),
    ).toBe("Opened by customer");
    expect(
      getCustomerPortalAccessTokenEventLabel({
        id: "event-3",
        token_id: "token-1",
        customer_id: "customer-1",
        kind: "revoked",
        occurred_at: "2026-05-06T02:00:00.000Z",
      }),
    ).toBe("Revoked");
    expect(
      getCustomerPortalAccessTokenEventLabel({
        id: "event-4",
        token_id: "token-1",
        customer_id: "customer-1",
        kind: "send_requested",
        occurred_at: "2026-05-06T03:00:00.000Z",
      }),
    ).toBe("Send requested");
    expect(
      getCustomerPortalAccessTokenEventLabel({
        id: "event-5",
        token_id: "token-1",
        customer_id: "customer-1",
        kind: "send_succeeded",
        occurred_at: "2026-05-06T04:00:00.000Z",
      }),
    ).toBe("Send succeeded");
    expect(
      getCustomerPortalAccessTokenEventLabel({
        id: "event-6",
        token_id: "token-1",
        customer_id: "customer-1",
        kind: "send_failed",
        occurred_at: "2026-05-06T05:00:00.000Z",
      }),
    ).toBe("Send failed");
  });

  it("summarizes portal access token readiness for admins", () => {
    const activeToken = {
      id: "token-active",
      customer_id: "customer-1",
      status: "active",
      expires_at: "2026-05-10T00:00:00Z",
      last_used_at: null,
      created_at: now,
      updated_at: now,
    } as const;
    const noExpirationToken = {
      ...activeToken,
      id: "token-no-expiration",
      expires_at: null,
      last_used_at: "2026-05-06T00:00:00Z",
    };
    const expiredToken = {
      ...activeToken,
      id: "token-expired",
      expires_at: "2026-05-04T00:00:00Z",
    };
    const revokedToken = {
      ...activeToken,
      id: "token-revoked",
      status: "revoked",
    } as const;
    const currentDate = new Date("2026-05-05T00:00:00Z");

    expect(getCustomerPortalAccessTokenReadiness(activeToken, currentDate)).toMatchObject({
      detail: "Generated but never opened",
      label: "Active portal link",
      state: "active",
    });
    expect(
      getCustomerPortalAccessTokenReadiness(noExpirationToken, currentDate),
    ).toMatchObject({
      detail: "No expiration",
      state: "no_expiration",
    });
    expect(
      getCustomerPortalAccessTokenReadinessSummary(
        [activeToken, noExpirationToken, expiredToken, revokedToken],
        currentDate,
      ),
    ).toEqual({
      active: 2,
      expired: 1,
      neverUsed: 3,
      noExpiration: 1,
      revoked: 1,
      total: 4,
    });
  });

  it("builds a customer-safe portal timeline from closeouts and invoices", () => {
    const closeout = {
      job: {
        id: "job-1",
        customer_id: "customer-1",
        location_id: "location-1",
        status: "completed" as const,
        scheduled_start: "2026-05-06T09:00:00Z",
        scheduled_end: null,
        customer: { id: "customer-1", name: "Apex Homes" },
        location: {
          id: "location-1",
          address: "10 Pine Street",
          nickname: "Main house",
        },
      },
      form_submissions: [{ id: "form-1", job_id: "job-1", form_data: {}, submitted_at: now }],
      photos: [
        {
          id: "photo-1",
          job_id: "job-1",
          media_type: "photo" as const,
          signed_url: "https://signed.example/photo.jpg",
          description: "Kitchen",
          captured_at: now,
        },
      ],
      signatures: [],
    };
    const openInvoice = {
      id: "invoice-1",
      job_id: "job-1",
      status: "open" as const,
      currency: "usd",
      total_cents: 12500,
      balance_cents: 12500,
      due_date: "2026-05-15T00:00:00Z",
      payment_url: "https://pay.stripe.com/test",
      paid_at: null,
      created_at: "2026-05-07T00:00:00Z",
      job: closeout.job,
      line_items: [],
    };
    const invoiceOnly = {
      ...openInvoice,
      id: "invoice-2",
      job_id: "job-2",
      created_at: "2026-05-08T00:00:00Z",
      job: {
        ...closeout.job,
        id: "job-2",
        scheduled_start: "2026-05-08T09:00:00Z",
      },
    };

    const timeline = buildCustomerPortalTimeline([closeout], [openInvoice, invoiceOnly]);

    expect(timeline.map((item) => item.id)).toEqual(["invoice-invoice-2", "job-job-1"]);
    expect(timeline[0]).toMatchObject({
      balance_cents: 12500,
      invoice_status: "open",
      payment_url: "https://pay.stripe.com/test",
      type: "invoice",
    });
    expect(timeline[1]).toMatchObject({
      captures_label: "1 form, 1 photo, 0 signatures",
      invoice_status: "open",
      type: "service",
    });
    expect(JSON.stringify(timeline)).not.toContain("provider_payment_id");
    expect(JSON.stringify(timeline)).not.toContain("storage_path");
  });

  it("builds a customer-safe recurring service review notification", () => {
    const input = validateCustomerPortalUpgradeIntentInput({
      plan_id: "general_pest_recurring",
    });
    const requestedAt = new Date("2026-06-02T16:30:00.000Z");

    expect(input).toEqual({ plan_id: "general_pest_recurring" });
    expect(
      buildCustomerPortalUpgradeGeneratedKey(
        "customer-1",
        input.plan_id,
        requestedAt,
      ),
    ).toBe("portal-upgrade:customer-1:general-pest:2026-06-02");
    expect(
      buildCustomerPortalUpgradeNotificationInput(
        "customer-1",
        input,
        requestedAt,
      ),
    ).toEqual({
      customer_id: "customer-1",
      due_at: "2026-06-02T16:30:00.000Z",
      generated_key: "portal-upgrade:customer-1:general-pest:2026-06-02",
      job_id: null,
      message:
        "Customer requested a recurring service review from the customer portal. Contact them to confirm service type, pricing, cadence, and start date.",
      rule_id: null,
      title: "Recurring service review request",
      type: "recurring_service_prompt",
    });
    expect(getCustomerPortalUpgradeSummary()).toMatchObject({
      action_label: "Request review",
      confirmation_label:
        "Request received. Our office will follow up before anything recurring is scheduled or billed.",
      plan_id: "general_pest_recurring",
      title: "Recurring service review",
    });
    expect(JSON.stringify(getCustomerPortalUpgradeSummary())).not.toContain(
      "General Pest",
    );
    expect(JSON.stringify(getCustomerPortalUpgradeSummary())).not.toContain(
      "access_token",
    );
    expect(JSON.stringify(getCustomerPortalUpgradeSummary())).not.toContain(
      "provider_payment_id",
    );
    expect(JSON.stringify(getCustomerPortalUpgradeSummary())).not.toContain(
      "payment_url",
    );
    expect(JSON.stringify(getCustomerPortalUpgradeSummary())).not.toContain(
      "stripe",
    );
  });

  it("rejects unsupported portal upgrade plans", () => {
    expect(() =>
      validateCustomerPortalUpgradeIntentInput({
        plan_id: "termite_monitoring" as never,
      }),
    ).toThrow("Unsupported portal upgrade plan");
  });
});
