import UploadForm from "./upload-form";

// ponytail: busca do evento pelo slug (nome, background, limites) entra quando o Supabase
// estiver provisionado (PHF-010/012). Por ora a rota pública renderiza o formulário.
export default async function EventoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-screen">
      <h1 className="p-4 text-center text-xl font-semibold">Envie sua foto ou reel</h1>
      <UploadForm slug={slug} />
    </main>
  );
}
