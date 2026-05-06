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
