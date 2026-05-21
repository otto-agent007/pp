"use client";

import {
  buildDemoWorkflowFixtures,
  shouldUseLocalDemoFixtures,
} from "@pest-patrol/domain";

function stableFixtureNow() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

const localDemoFixtures = buildDemoWorkflowFixtures({ now: stableFixtureNow() });

export function isLocalDemoFixtureMode() {
  return shouldUseLocalDemoFixtures({
    nodeEnv: process.env.NODE_ENV,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}

export function getLocalDemoFixtures() {
  return isLocalDemoFixtureMode() ? localDemoFixtures : null;
}
