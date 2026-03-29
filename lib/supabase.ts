// lib/supabase.ts
// Singleton Supabase client — import this everywhere instead of
// calling createClient() individually in each page/component.
// This avoids creating a new connection on every server render.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
