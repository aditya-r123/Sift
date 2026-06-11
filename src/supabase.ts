import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createStubSupabaseClient } from "../tests/supabase-stub.js";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
const nodeEnv = typeof process === "undefined" ? undefined : process.env.NODE_ENV;
const stubFromProcess =
  typeof process !== "undefined" && process.env.VITE_SIFT_ALLOW_STUB_SUPABASE === "1";
const useStubClient =
  env.VITE_SIFT_ALLOW_STUB_SUPABASE === "1" ||
  stubFromProcess ||
  env.MODE === "test" ||
  nodeEnv === "test";

if ((!supabaseUrl || !supabaseAnonKey) && !useStubClient) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values."
  );
}

export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey && !useStubClient
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : createStubSupabaseClient();
