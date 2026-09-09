import type {
  CustomerPortalAccessGrant,
  CustomerPortalAccessInput,
  CustomerPortalAccessTokenEventListResponse,
  CustomerPortalAccessTokenListResponse,
  CustomerPortalAccessTokenSummary,
  CustomerPortalBillingResponse,
  CustomerPortalCloseoutResponse,
  CustomerPortalProviderStatus,
  CustomerPortalSendInput,
  CustomerPortalSendResult,
  CustomerPortalUpgradeIntentInput,
  CustomerPortalUpgradeIntentRequest,
  CustomerPortalUpgradeIntentResult,
} from "@pest-patrol/types";

import type { SupabaseProviderClient } from "./supabase";

type PortalClient = SupabaseProviderClient;

async function getAccessToken(client: PortalClient) {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
}

function responseError(status: number) {
  if (status === 401) {
    return "Portal session is required";
  }

  if (status === 403) {
    return "Portal access is invalid or expired";
  }

  return "Unable to load customer portal";
}

export async function listCustomerPortalCloseoutRecords(customerId: string) {
  const response = await fetch(
    `/api/portal/${encodeURIComponent(customerId)}/closeouts`,
  );

  if (!response.ok) {
    throw new Error(responseError(response.status));
  }

  const body = (await response.json()) as CustomerPortalCloseoutResponse;

  return body.closeouts;
}

export async function listCustomerPortalBillingRecords(customerId: string) {
  const response = await fetch(
    `/api/portal/${encodeURIComponent(customerId)}/billing`,
  );

  if (!response.ok) {
    throw new Error(responseError(response.status));
  }

  const body = (await response.json()) as CustomerPortalBillingResponse;

  return body.invoices;
}

export async function requestCustomerPortalUpgradeIntentRecord(
  customerId: string,
  input: CustomerPortalUpgradeIntentInput,
) {
  const body: CustomerPortalUpgradeIntentRequest = input;
  const response = await fetch(
    `/api/portal/${encodeURIComponent(customerId)}/upgrade-intents`,
    {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(responseError(response.status));
  }

  return (await response.json()) as CustomerPortalUpgradeIntentResult;
}

export async function createCustomerPortalAccessTokenRecord(
  input: CustomerPortalAccessInput,
  client: PortalClient,
) {
  const adminAccessToken = await getAccessToken(client);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch("/api/portal/access-tokens", {
    body: JSON.stringify(input),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to create portal access token");
  }

  return (await response.json()) as CustomerPortalAccessGrant;
}

export async function listCustomerPortalAccessTokenRecords(
  customerId: string,
  client: PortalClient,
) {
  const adminAccessToken = await getAccessToken(client);
  const headers: Record<string, string> = {};

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const params = new URLSearchParams({ customer_id: customerId });
  const response = await fetch(`/api/portal/access-tokens?${params}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error("Unable to load portal access tokens");
  }

  const body = (await response.json()) as CustomerPortalAccessTokenListResponse;

  return body.tokens;
}

export async function revokeCustomerPortalAccessTokenRecord(
  id: string,
  client: PortalClient,
) {
  const adminAccessToken = await getAccessToken(client);
  const headers: Record<string, string> = {};

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch(
    `/api/portal/access-tokens/${encodeURIComponent(id)}/revoke`,
    {
      headers,
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to revoke portal access token");
  }

  return (await response.json()) as CustomerPortalAccessTokenSummary;
}

export async function listCustomerPortalAccessTokenEventRecords(
  id: string,
  client: PortalClient,
) {
  const adminAccessToken = await getAccessToken(client);
  const headers: Record<string, string> = {};

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch(
    `/api/portal/access-tokens/${encodeURIComponent(id)}/events`,
    {
      headers,
    },
  );

  if (!response.ok) {
    throw new Error("Unable to load portal access history");
  }

  const body =
    (await response.json()) as CustomerPortalAccessTokenEventListResponse;

  return body;
}

export async function getCustomerPortalProviderStatusRecord(
  client: PortalClient,
) {
  const adminAccessToken = await getAccessToken(client);
  const headers: Record<string, string> = {};

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch("/api/portal/access-tokens/provider-status", {
    headers,
  });

  if (!response.ok) {
    throw new Error("Unable to load portal provider status");
  }

  return (await response.json()) as CustomerPortalProviderStatus;
}

export async function sendCustomerPortalAccessTokenRecord(
  input: CustomerPortalSendInput,
  client: PortalClient,
) {
  const adminAccessToken = await getAccessToken(client);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch("/api/portal/access-tokens/send", {
    body: JSON.stringify(input),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to request portal send");
  }

  return (await response.json()) as CustomerPortalSendResult;
}
