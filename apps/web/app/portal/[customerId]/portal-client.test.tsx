import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCustomerPortalBilling,
  useCustomerPortalCloseouts,
} from "../../../hooks/useCustomerPortal";
import { CustomerPortalClient } from "./portal-client";

vi.mock("../../../hooks/useCustomerPortal", () => ({
  useCustomerPortalBilling: vi.fn(),
  useCustomerPortalCloseouts: vi.fn(),
}));

const now = "2026-05-05T00:00:00Z";
const closeout = {
  job: {
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
  form_submissions: [
    {
      id: "submission-1",
      job_id: "job-1",
      form_data: {
        target_pests: "Ants",
        follow_up_required: false,
      },
      submitted_at: now,
      template: {
        id: "template-1",
        name: "Treatment Form",
        version: 1,
        status: "active",
        created_at: now,
        updated_at: now,
        schema: {
          fields: [
            {
              id: "target_pests",
              label: "Target pests",
              type: "textarea",
            },
            {
              id: "follow_up_required",
              label: "Follow-up required",
              type: "boolean",
            },
          ],
        },
      },
    },
  ],
  photos: [
    {
      id: "media-1",
      job_id: "job-1",
      media_type: "photo",
      signed_url: "https://signed.example/photo.jpg",
      description: "Kitchen photo",
      captured_at: now,
    },
  ],
  signatures: [
    {
      id: "media-2",
      job_id: "job-1",
      media_type: "signature",
      signed_url: "https://signed.example/signature.png",
      description: "Signed by Jamie",
      captured_at: now,
    },
  ],
} as const;
const invoice = {
  id: "invoice-1",
  job_id: "job-1",
  status: "open",
  currency: "usd",
  total_cents: 12500,
  balance_cents: 12500,
  due_date: "2026-05-15T00:00:00Z",
  payment_url: "https://pay.stripe.com/test",
  paid_at: null,
  created_at: now,
  job: closeout.job,
  line_items: [
    {
      id: "line-1",
      description: "Quarterly service",
      quantity: 1,
      unit_amount_cents: 12500,
      total_cents: 12500,
    },
  ],
} as const;

describe("CustomerPortalClient", () => {
  beforeEach(() => {
    vi.mocked(useCustomerPortalBilling).mockReturnValue({
      error: null,
      invoices: [invoice],
      isLoading: false,
    } as never);
    vi.mocked(useCustomerPortalCloseouts).mockReturnValue({
      closeouts: [closeout],
      error: null,
      isLoading: false,
    } as never);
  });

  it("renders customer-safe completed service details and media", () => {
    render(
      <CustomerPortalClient accessToken="portal-token" customerId="customer-1" />,
    );

    expect(useCustomerPortalCloseouts).toHaveBeenCalledWith(
      "customer-1",
      "portal-token",
    );
    expect(useCustomerPortalBilling).toHaveBeenCalledWith(
      "customer-1",
      "portal-token",
    );
    expect(screen.getByRole("heading", { name: "Apex Homes" })).toBeInTheDocument();
    expect(screen.getByText("Invoice invoice-")).toBeInTheDocument();
    expect(screen.getByText("Quarterly service")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pay invoice" })).toHaveAttribute(
      "href",
      "https://pay.stripe.com/test",
    );
    expect(screen.getAllByText("Main house")).toHaveLength(2);
    expect(screen.getByText("Treatment Form")).toBeInTheDocument();
    expect(screen.getByText("Ants")).toBeInTheDocument();
    expect(screen.getByText("Kitchen photo")).toBeInTheDocument();
    expect(screen.getByText("Signed by Jamie")).toBeInTheDocument();
  });

  it("does not render admin-only service notes or chemical internals", () => {
    render(
      <CustomerPortalClient accessToken="portal-token" customerId="customer-1" />,
    );

    expect(screen.queryByText("Interior treatment")).not.toBeInTheDocument();
    expect(screen.queryByText("Bait Gel")).not.toBeInTheDocument();
    expect(screen.queryByText("EPA-123")).not.toBeInTheDocument();
    expect(screen.queryByText("pi_secret")).not.toBeInTheDocument();
    expect(screen.queryByText("provider_payment_id")).not.toBeInTheDocument();
  });

  it("filters completed service visits", async () => {
    const user = userEvent.setup();
    render(
      <CustomerPortalClient accessToken="portal-token" customerId="customer-1" />,
    );

    await user.type(screen.getByLabelText("Search service visits"), "missing");

    expect(screen.getByText("No completed service visits found")).toBeInTheDocument();
  });

  it("renders empty capture states", () => {
    vi.mocked(useCustomerPortalCloseouts).mockReturnValue({
      closeouts: [
        {
          ...closeout,
          form_submissions: [],
          photos: [],
          signatures: [],
        },
      ],
      error: null,
      isLoading: false,
    } as never);

    render(
      <CustomerPortalClient accessToken="portal-token" customerId="customer-1" />,
    );

    expect(
      screen.getByText("No service forms are available for this visit."),
    ).toBeInTheDocument();
    expect(screen.getByText("No photos are available for this visit.")).toBeInTheDocument();
    expect(
      screen.getByText("No signatures are available for this visit."),
    ).toBeInTheDocument();
  });

  it("renders access errors", () => {
    vi.mocked(useCustomerPortalCloseouts).mockReturnValue({
      closeouts: [],
      error: new Error("Portal access token is required"),
      isLoading: false,
    } as never);

    render(<CustomerPortalClient accessToken="" customerId="customer-1" />);

    expect(screen.getByText("Unable to load service visits")).toBeInTheDocument();
  });
});
