import type { CustomerPortalAccessEventKind } from "@pest-patrol/types";

import type { createServiceRoleSupabaseClient } from "../../_lib/server-auth";

type ServiceRoleClient = ReturnType<typeof createServiceRoleSupabaseClient>;

interface AccessTokenEventInput {
  actorProfileId?: string | null;
  customerId: string;
  kind: CustomerPortalAccessEventKind;
  tokenId: string;
}

export async function recordCustomerPortalAccessTokenEvent(
  client: ServiceRoleClient,
  input: AccessTokenEventInput,
) {
  const { error } = await client
    .from("customer_portal_access_token_events")
    .insert({
      actor_profile_id: input.actorProfileId ?? null,
      customer_id: input.customerId,
      kind: input.kind,
      token_id: input.tokenId,
    });

  return !error;
}

export async function recordCustomerPortalOpenedEvent(
  client: ServiceRoleClient,
  input: Pick<AccessTokenEventInput, "customerId" | "tokenId">,
) {
  await recordCustomerPortalAccessTokenEvent(client, {
    customerId: input.customerId,
    kind: "opened",
    tokenId: input.tokenId,
  });
}
