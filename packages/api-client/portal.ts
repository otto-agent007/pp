import type {
  CustomerPortalAccessGrant,
  CustomerPortalAccessInput,
  CustomerPortalAccessTokenListResponse,
  CustomerPortalAccessTokenSummary,
  CustomerPortalBillingResponse,
  CustomerPortalCloseoutResponse,
} from "@pest-patrol/types";

import { supabase } from "./supabase";

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
}

function responseError(status: number) {
  if (status === 401) {
    return "Portal access token is required";
  }

  if (status === 403) {
    return "Portal access is invalid or expired";
  }

  return "Unable to load customer portal";
}

export async function listCustomerPortalCloseoutRecords(
  customerId: string,
  accessToken: string,
) {
  const params = new URLSearchParams({ access_token: accessToken });
  const response = await fetch(
    `/api/portal/${encodeURIComponent(customerId)}/closeouts?${params}`,
  );

  if (!response.ok) {
    throw new Error(responseError(response.status));
  }

  const body = (await response.json()) as CustomerPortalCloseoutResponse;

  return body.closeouts;
}

export async function listCustomerPortalBillingRecords(
  customerId: string,
  accessToken: string,
) {
  const params = new URLSearchParams({ access_token: accessToken });
  const response = await fetch(
    `/api/portal/${encodeURIComponent(customerId)}/billing?${params}`,
  );

  if (!response.ok) {
    throw new Error(responseError(response.status));
  }

  const body = (await response.json()) as CustomerPortalBillingResponse;

  return body.invoices;
}

export async function createCustomerPortalAccessTokenRecord(
  input: CustomerPortalAccessInput,
) {
  const adminAccessToken = await getAccessToken();
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

export async function listCustomerPortalAccessTokenRecords(customerId: string) {
  const adminAccessToken = await getAccessToken();
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

export async function revokeCustomerPortalAccessTokenRecord(id: string) {
  const adminAccessToken = await getAccessToken();
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
