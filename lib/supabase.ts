// lib/supabase.ts
// Lazy singleton — the client is created on first USE, not at module import time.
// This prevents "supabaseUrl is required" crashes during Next.js build-time
// static analysis, where env vars may not yet be available.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY");

  _client = createClient(url, key);
  return _client;
}

// Proxy forwards every property access to the lazily-created client.
// All existing call sites (supabase.from(...), supabase.rpc(...)) work unchanged.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
