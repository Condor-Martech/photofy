import type { Tipo } from "./upload";

// ponytail: seam para PHF-013 (BullMQ + Redis). A fila real ainda não existe.
// Trocar o corpo por `filaProcessamento.add(tipo, { mediaId })` quando PHF-013 mergear.
export async function enqueueProcessing(mediaId: string, tipo: Tipo): Promise<void> {
  console.info(`[queue] processamento pendente media=${mediaId} tipo=${tipo}`);
}
