import Link from "next/link";
import { FilaDoEvento } from "@/components/moderacao/fila-do-evento";

// PHF-072 — /admin/eventos/[slug]/moderacao: acesso do organizador à fila de
// moderação daquele evento. Reusa o painel ao vivo do Epic 4 (PHF-040) com a
// navegação do painel administrativo. O silêncio de moderação continua valendo:
// nada aqui comunica ao participante qualquer decisão (regra dura, CLAUDE.md).
export default async function ModeracaoEventoAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="mx-auto max-w-2xl">
      <nav className="p-4">
        <Link href="/admin/eventos" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Eventos
        </Link>
      </nav>
      <FilaDoEvento slug={slug} />
    </main>
  );
}
