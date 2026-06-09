import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { __setTestRateLimitChecker } from "../../../../_lib/rate-limit";

let adminError: Response | null = null;
let serviceClient: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("../../../../_lib/server-auth", () => ({
  createServiceRoleSupabaseClient: () => serviceClient,
  getAdminAccess: () =>
    Promise.resolve(
      adminError
        ? { access: null, response: adminError }
        : { access: { userId: "admin-user" }, response: null },
    ),
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }
}

const now = "2026-05-06T12:00:00.000Z";
const notification = {
  id: "notification-1",
  rule_id: "rule-1",
  type: "follow_up_reminder",
  generated_key: null,
  customer_id: "customer-1",
  job_id: null,
  status: "pending",
  title: "Call Apex",
  message: "Check satisfaction",
  due_at: now,
  handled_at: null,
  delivery_status: "not_sent",
  delivery_provider: null,
  provider_message_id: null,
  delivery_attempts: 0,
  last_delivery_attempted_at: null,
  delivered_at: null,
  last_delivery_error: null,
  created_at: now,
  updated_at: now,
  customer: {
    id: "customer-1",
    name: "Apex Homes",
    phone: "555-0100",
    email: "office@apex.example",
    property_type: "commercial",
    service_notes: "Internal customer note",
    status: "active",
    created_at: now,
    updated_at: now,
  },
  job: {
    id: "job-1",
    customer_id: "customer-1",
    location_id: "location-1",
    assigned_tech_id: null,
    status: "completed",
    scheduled_start: "2026-05-01T12:00:00.000Z",
    scheduled_end: null,
    service_notes: "Internal job note",
    created_at: now,
    updated_at: now,
    customer: {
      id: "customer-1",
      name: "Apex Homes",
      phone: "555-0100",
      email: "office@apex.example",
      property_type: "commercial",
      service_notes: "Internal customer note",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    location: {
      id: "location-1",
      customer_id: "customer-1",
      address: "10 Pine Street",
      nickname: "Main office",
      service_notes: "Gate code",
      is_primary: true,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  },
};

function request() {
  return new Request(
    "http://localhost/api/automation/notifications/notification-1/deliver",
    { method: "POST" },
  );
}

function params() {
  return { params: Promise.resolve({ notificationId: "notification-1" }) };
}

describe("notification delivery route", () => {
  beforeEach(() => {
    adminError = null;
    serviceClient = {
      from: vi.fn(),
    };
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: false,
      }),
    );
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requires admin authentication", async () => {
    adminError = Response.json(
      { error: "Authentication is required" },
      { status: 401 },
    );

    const response = await POST(request(), params());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication is required");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("returns 429 before notification lookup when the rate limit is reached", async () => {
    __setTestRateLimitChecker(() =>
      Promise.resolve({
        rateLimited: true,
      }),
    );

    const response = await POST(request(), params());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(429);
    expect(body.error).toBe("Too many requests. Please retry later.");
    expect(serviceClient.from).not.toHaveBeenCalled();
  });

  it("records manual delivery when no provider webhook is configured", async () => {
    const sendingQuery = new MockQuery({
      data: {
        ...notification,
        delivery_status: "sending",
        delivery_attempts: 1,
      },
      error: null,
    });
    const updateQuery = new MockQuery({
      data: {
        ...notification,
        delivery_status: "sent",
        delivery_provider: "manual",
        provider_message_id: "manual-notification-1-123",
        delivery_attempts: 1,
        delivered_at: now,
      },
      error: null,
    });
    serviceClient.from
      .mockReturnValueOnce(new MockQuery({ data: notification, error: null }))
      .mockReturnValueOnce(sendingQuery)
      .mockReturnValueOnce(updateQuery);

    const response = await POST(request(), params());
    const body = (await response.json()) as {
      event?: typeof notification;
      provider?: string;
    };

    expect(response.status).toBe(200);
    expect(body.provider).toBe("manual");
    expect(body.event?.delivery_status).toBe("sent");
    expect(sendingQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          delivery_attempts: 1,
          delivery_provider: null,
          delivery_status: "sending",
          last_delivery_attempted_at: expect.any(String),
          provider_message_id: null,
        }),
      ],
    ]);
    expect(updateQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          delivery_attempts: 1,
          delivery_provider: "manual",
          delivery_status: "sent",
          last_delivery_attempted_at: expect.any(String),
          provider_message_id: expect.stringMatching(/^manual-notification-1-/),
        }),
      ],
    ]);
  });

  it("sends configured webhook delivery with the server-only secret", async () => {
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_URL", "https://provider.example/send");
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_SECRET", "provider-secret");
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ message_id: "message-1" }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);
    const sendingQuery = new MockQuery({
      data: {
        ...notification,
        delivery_status: "sending",
        delivery_attempts: 1,
      },
      error: null,
    });
    const updateQuery = new MockQuery({
      data: {
        ...notification,
        delivery_status: "sent",
        delivery_provider: "webhook",
        provider_message_id: "message-1",
        delivery_attempts: 1,
        delivered_at: now,
      },
      error: null,
    });
    serviceClient.from
      .mockReturnValueOnce(new MockQuery({ data: notification, error: null }))
      .mockReturnValueOnce(sendingQuery)
      .mockReturnValueOnce(updateQuery);

    const response = await POST(request(), params());
    const body = (await response.json()) as { provider_message_id?: string };

    expect(response.status).toBe(200);
    expect(body.provider_message_id).toBe("message-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://provider.example/send",
      expect.objectContaining({
        body: JSON.stringify({
          event: {
            id: "notification-1",
            type: "follow_up_reminder",
            title: "Call Apex",
            message: "Check satisfaction",
            due_at: now,
            status: "pending",
            delivery_status: "sending",
            customer_id: "customer-1",
            job_id: null,
            generated_key: null,
          },
          target: {
            customer_id: "customer-1",
            job_id: "job-1",
            location_id: "location-1",
          },
          customer: {
            id: "customer-1",
            name: "Apex Homes",
            email: "office@apex.example",
            phone: "555-0100",
          },
          job: {
            id: "job-1",
            status: "completed",
            scheduled_start: "2026-05-01T12:00:00.000Z",
            scheduled_end: null,
          },
          location: {
            id: "location-1",
            address: "10 Pine Street",
            nickname: "Main office",
          },
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer provider-secret",
        }),
      }),
    );
    expect(updateQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          delivery_provider: "webhook",
          delivery_status: "sent",
          last_delivery_attempted_at: expect.any(String),
          provider_message_id: "message-1",
        }),
      ],
    ]);
  });

  it("blocks production webhook delivery when the secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_URL", "https://provider.example/send");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const sendingQuery = new MockQuery({
      data: {
        ...notification,
        delivery_status: "sending",
        delivery_attempts: 1,
      },
      error: null,
    });
    const updateQuery = new MockQuery({
      data: {
        ...notification,
        delivery_status: "failed",
        delivery_provider: "webhook",
        provider_message_id: null,
        delivery_attempts: 1,
        last_delivery_error: "Notification delivery provider is unavailable",
      },
      error: null,
    });
    serviceClient.from
      .mockReturnValueOnce(new MockQuery({ data: notification, error: null }))
      .mockReturnValueOnce(sendingQuery)
      .mockReturnValueOnce(updateQuery);

    const response = await POST(request(), params());
    const body = (await response.json()) as {
      error?: string;
      event?: typeof notification;
    };

    expect(response.status).toBe(503);
    expect(body.error).toBe("Notification delivery provider is unavailable");
    expect(body.event?.delivery_status).toBe("failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records failed delivery attempts for retry visibility", async () => {
    vi.stubEnv("NOTIFICATION_DELIVERY_WEBHOOK_URL", "https://provider.example/send");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({}),
        ok: false,
      }),
    );
    const sendingQuery = new MockQuery({
      data: {
        ...notification,
        delivery_status: "sending",
        delivery_attempts: 1,
      },
      error: null,
    });
    const updateQuery = new MockQuery({
      data: {
        ...notification,
        delivery_status: "failed",
        delivery_provider: "webhook",
        provider_message_id: null,
        delivery_attempts: 1,
        last_delivery_error: "Notification provider delivery failed",
      },
      error: null,
    });
    serviceClient.from
      .mockReturnValueOnce(new MockQuery({ data: notification, error: null }))
      .mockReturnValueOnce(sendingQuery)
      .mockReturnValueOnce(updateQuery);

    const response = await POST(request(), params());
    const body = (await response.json()) as {
      error?: string;
      event?: typeof notification;
    };

    expect(response.status).toBe(502);
    expect(body.error).toBe("Notification provider delivery failed");
    expect(body.event?.delivery_status).toBe("failed");
    expect(updateQuery.calls[0]).toEqual([
      "update",
      [
        expect.objectContaining({
          delivery_status: "failed",
          last_delivery_attempted_at: expect.any(String),
          provider_message_id: null,
        }),
      ],
    ]);
  });

  it("rejects duplicate delivery attempts already in progress", async () => {
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({
        data: {
          ...notification,
          delivery_status: "sending",
        },
        error: null,
      }),
    );

    const response = await POST(request(), params());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("Notification delivery is already in progress");
    expect(serviceClient.from).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate delivery attempts already sent", async () => {
    serviceClient.from.mockReturnValueOnce(
      new MockQuery({
        data: {
          ...notification,
          delivery_status: "sent",
          provider_message_id: "message-1",
        },
        error: null,
      }),
    );

    const response = await POST(request(), params());
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("Notification has already been sent");
    expect(serviceClient.from).toHaveBeenCalledTimes(1);
  });
});
