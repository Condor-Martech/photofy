import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente com service_role: IGNORA RLS. NUNCA importar em código client-side —
// só em route handlers / workers (server-only). Ver PHF-012 docs/storage.md.
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export const MEDIA_BUCKET = "media";
