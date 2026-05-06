import { describe, expect, it } from "vitest";

import {
  buildCustomerPortalCloseouts,
  buildJobCloseoutReview,
  filterCustomerPortalCloseouts,
  filterCloseoutJobs,
  getCustomerPortalAccessTokenLabel,
  getCustomerPortalAccessTokenState,
  getCloseoutCounts,
  validateCustomerPortalAccessInput,
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
});
