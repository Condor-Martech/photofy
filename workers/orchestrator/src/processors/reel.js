// Placeholder — PHF-031 preenche (validação de duração, transcodificação MP4 H.264 vertical ~1080p via ffmpeg).
// Lança de propósito: um enfileiramento acidental fica visível (vai para "erro"), não silenciosamente "done".
export const reelProcessor = async (job) => {
  throw new Error(`worker de reel ainda não implementado (PHF-031): job ${job.id}`);
};
