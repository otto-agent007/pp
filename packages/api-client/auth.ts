import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@pest-patrol/types";

export type AuthSupabaseClient = SupabaseClient;

export interface AuthRecord {
  session: Session;
  profile: UserProfile;
}

export type TechnicianAuthRecord = AuthRecord;

export async function getProfileRecord(
  client: AuthSupabaseClient,
  userId: string,
) {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<UserProfile>();

  if (error) {
    throw error;
  }

  return data as UserProfile;
}

export async function getCurrentAuthRecord(client: AuthSupabaseClient) {
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  if (!data.session) {
    return null;
  }

  return {
    session: data.session,
    profile: await getProfileRecord(client, data.session.user.id),
  } satisfies AuthRecord;
}

export async function signInWithPasswordRecord(
  client: AuthSupabaseClient,
  email: string,
  password: string,
) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error("Unable to start session");
  }

  return {
    session: data.session,
    profile: await getProfileRecord(client, data.session.user.id),
  } satisfies AuthRecord;
}

export async function signOutRecord(client: AuthSupabaseClient) {
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function resetPasswordForEmailRecord(
  client: AuthSupabaseClient,
  email: string,
  redirectTo: string,
) {
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function setPasswordRecoverySessionRecord(
  client: AuthSupabaseClient,
  accessToken: string,
  refreshToken: string,
) {
  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error("Unable to start password recovery session");
  }

  return data.session;
}

export async function updatePasswordRecord(
  client: AuthSupabaseClient,
  password: string,
) {
  const { data, error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }

  return data.user;
}
