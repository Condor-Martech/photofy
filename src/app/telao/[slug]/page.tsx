import { TelaoCliente } from "./telao-cliente";

// Rota do telão (PHF-051): /telao/<slug>. A tela renderiza o estado vazio e a
// rotação de aprovados via Realtime — ver TelaoCliente e components/telao.
export default async function TelaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TelaoCliente slug={slug} />;
}
