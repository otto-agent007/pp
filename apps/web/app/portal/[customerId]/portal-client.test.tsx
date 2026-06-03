import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCustomerPortalBilling,
  useCustomerPortalCloseouts,
  useCustomerPortalUpgradeIntent,
} from "../../../hooks/useCustomerPortal";
import { CustomerPortalClient } from "./portal-client";

vi.mock("../../../hooks/useCustomerPortal", () => ({
  useCustomerPortalBilling: vi.fn(),
  useCustomerPortalCloseouts: vi.fn(),
  useCustomerPortalUpgradeIntent: vi.fn(),
}));

const now = "2026-05-05T00:00:00Z";
const closeout = {
  job: {
    id: "job-1",
    customer_id: "customer-1",
    location_id: "location-1",
    status: "completed",
    scheduled_start: "2026-05-06T09:38:00Z",
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
  const requestUpgrade = vi.fn();

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
    requestUpgrade.mockReset();
    requestUpgrade.mockResolvedValue({
      notification_id: "notification-1",
      plan_id: "general_pest_recurring",
      status: "requested",
    });
    vi.mocked(useCustomerPortalUpgradeIntent).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: requestUpgrade,
    } as never);
  });

  it("renders customer-safe completed service details and media", () => {
    render(
      <CustomerPortalClient
        accessToken="portal-token"
        customerId="customer-1"
      />,
    );

    expect(useCustomerPortalCloseouts).toHaveBeenCalledWith(
      "customer-1",
      "portal-token",
    );
    expect(useCustomerPortalBilling).toHaveBeenCalledWith(
      "customer-1",
      "portal-token",
    );
    expect(screen.getByText("Service history")).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("Open balance")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Apex Homes service history" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Customer records for completed services, invoices, forms, photos, and signatures.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Quarterly service invoice")).toBeInTheDocument();
    expect(screen.getByText("Quarterly service")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pay invoice" })).toHaveAttribute(
      "href",
      "https://pay.stripe.com/test",
    );
    expect(screen.getByText("Account timeline")).toBeInTheDocument();
    expect(screen.getByText("Service completed")).toBeInTheDocument();
    expect(
      screen.getByText("Invoice Open | Balance $125.00"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Main house")).toHaveLength(5);
    expect(screen.getAllByText("May 6, 2026").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Service date May 6, 2026, 9:38 AM"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/2:38 AM/)).not.toBeInTheDocument();
    expect(screen.getAllByText("1 form, 1 photo, 1 signature")).toHaveLength(2);
    expect(screen.getByText("Invoice open")).toBeInTheDocument();
    expect(screen.getByText("Proof of service")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Proof of service is ready: service form, photo, and signature are available.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Technician GPS details stay private and are not shown in this portal.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Available for your records.")).toBeInTheDocument();
    expect(screen.getByText("Treatment Form")).toBeInTheDocument();
    expect(screen.getByText("Ants")).toBeInTheDocument();
    expect(screen.getByText("Kitchen photo")).toBeInTheDocument();
    expect(screen.getByText("Signed by Jamie")).toBeInTheDocument();
  });

  it("lets customers request a recurring service review once", async () => {
    const user = userEvent.setup();
    render(
      <CustomerPortalClient
        accessToken="portal-token"
        customerId="customer-1"
      />,
    );

    expect(useCustomerPortalUpgradeIntent).toHaveBeenCalledWith(
      "customer-1",
      "portal-token",
    );
    expect(screen.getByText("Recurring service review")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Request review" }),
    );

    expect(requestUpgrade).toHaveBeenCalledTimes(1);
    expect(requestUpgrade).toHaveBeenCalledWith({
      plan_id: "general_pest_recurring",
    });
    expect(
      screen.getByText(
        "Request received. Our office will follow up before anything recurring is scheduled or billed.",
      ),
    ).toBeInTheDocument();
  });

  it("offers print/save actions for customer records", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <CustomerPortalClient
        accessToken="portal-token"
        customerId="customer-1"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Print or save records" }),
    );

    expect(print).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Print invoice record" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Print service record" }),
    ).toBeInTheDocument();
  });

  it("uses semantic portal polish tokens without nested metric cards", () => {
    render(
      <CustomerPortalClient
        accessToken="portal-token"
        customerId="customer-1"
      />,
    );

    expect(screen.getByLabelText("Search portal activity")).toHaveClass(
      "focus:border-theme-action-primary",
    );
    expect(
      screen.getByRole("heading", { name: "Apex Homes service history" }),
    ).toHaveClass("text-theme-text-primary");
    expect(screen.getByText("Completed service")).toHaveClass(
      "text-xs",
      "font-extrabold",
      "text-theme-text-muted",
    );

    const formsMetric = screen.getByText("Forms").closest("div");

    expect(formsMetric).toHaveClass("bg-theme-background-subtle");
    expect(formsMetric).not.toHaveClass("shadow-sm");
    expect(formsMetric?.querySelector("p")).toHaveClass(
      "text-theme-text-primary",
    );
  });

  it("does not render admin-only service notes or chemical internals", () => {
    render(
      <CustomerPortalClient
        accessToken="portal-token"
        customerId="customer-1"
      />,
    );

    expect(screen.queryByText("Interior treatment")).not.toBeInTheDocument();
    expect(screen.queryByText("Bait Gel")).not.toBeInTheDocument();
    expect(screen.queryByText("EPA-123")).not.toBeInTheDocument();
    expect(screen.queryByText("pi_secret")).not.toBeInTheDocument();
    expect(screen.queryByText("provider_payment_id")).not.toBeInTheDocument();
    expect(screen.queryByText("33.8121")).not.toBeInTheDocument();
    expect(screen.queryByText("-117.919")).not.toBeInTheDocument();
    expect(screen.queryByText("Open service map")).not.toBeInTheDocument();
  });

  it("filters completed service visits", async () => {
    const user = userEvent.setup();
    render(
      <CustomerPortalClient
        accessToken="portal-token"
        customerId="customer-1"
      />,
    );

    await user.type(screen.getByLabelText("Search portal activity"), "missing");

    expect(
      screen.getByText("No completed service visits found"),
    ).toBeInTheDocument();
  });

  it("renders invoice-only portal timeline entries", () => {
    vi.mocked(useCustomerPortalCloseouts).mockReturnValue({
      closeouts: [],
      error: null,
      isLoading: false,
    } as never);

    render(
      <CustomerPortalClient
        accessToken="portal-token"
        customerId="customer-1"
      />,
    );

    expect(screen.getByText("Account timeline")).toBeInTheDocument();
    expect(screen.getByText("Invoice activity")).toBeInTheDocument();
    expect(
      screen.getByText("Invoice Open | Balance $125.00"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Pay from timeline" }),
    ).toHaveAttribute("href", "https://pay.stripe.com/test");
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
      <CustomerPortalClient
        accessToken="portal-token"
        customerId="customer-1"
      />,
    );

    expect(
      screen.getByText("No service forms are available for this visit."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No photos are available for this visit."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No signatures are available for this visit."),
    ).toBeInTheDocument();
  });

  it("renders customer-safe missing portal link errors", () => {
    vi.mocked(useCustomerPortalCloseouts).mockReturnValue({
      closeouts: [],
      error: new Error("Portal access token is required"),
      isLoading: false,
    } as never);

    render(<CustomerPortalClient accessToken="" customerId="customer-1" />);

    expect(
      screen.getAllByText(
        "This portal link is missing. Contact your pest control provider for a new link.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("renders customer-safe invalid or expired portal link errors", () => {
    vi.mocked(useCustomerPortalCloseouts).mockReturnValue({
      closeouts: [],
      error: new Error("Portal access is invalid or expired"),
      isLoading: false,
    } as never);

    render(
      <CustomerPortalClient
        accessToken="expired-token"
        customerId="customer-1"
      />,
    );

    expect(
      screen.getByText(
        "This portal link is invalid or expired. Contact your pest control provider for a new link.",
      ),
    ).toBeInTheDocument();
  });
});
