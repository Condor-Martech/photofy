import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase para uso EXCLUSIVO no servidor (Server Components, Route Handlers).
// Lê com service_role — o painel do organizador roda em contexto confiável de servidor
// e nunca expõe esta chave ao cliente (`SUPABASE_SERVICE_ROLE_KEY` não é NEXT_PUBLIC,
// então o Next não a inclui no bundle do browser).
//
// ponytail: enquanto o app não tem auth wiring (nenhuma rota, pública ou admin, tem
// guarda ainda), o painel usa service_role e depende de a rota /admin ser protegida por
// middleware. Troque por um client SSR por-requisição com a sessão do organizador
// (@supabase/ssr + RLS de `profiles`) assim que o login do admin existir.
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no servidor.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
