import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase de browser (chave anônima pública). Usado pelo painel de
// moderação para assinar Realtime. RLS por event_id continua sendo a fronteira
// de segurança real (02-spec.md §3) — o cliente nunca é a garantia de isolamento.
let cliente: SupabaseClient | undefined;

export function criarClienteBrowser(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios.",
    );
  }

  cliente = createClient(url, anon);
  return cliente;
}
