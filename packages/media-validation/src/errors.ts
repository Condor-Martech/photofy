export type ValidationCode =
  | 'FILE_TOO_LARGE'
  | 'UNKNOWN_FORMAT'
  | 'UNSUPPORTED_FORMAT'
  | 'TYPE_MISMATCH'
  | 'PIXEL_BOMB'
  | 'DECODE_ERROR'
  | 'CODEC_NOT_ALLOWED'
  | 'CONTAINER_NOT_ALLOWED'
  | 'RESOLUTION_BOMB'
  | 'DURATION_EXCEEDED'
  | 'PROBE_ERROR'
  | 'MALWARE_FOUND'
  | 'ANTIVIRUS_UNAVAILABLE';

// Erro tecnico de validacao pre-enqueue. NAO e uma decisao de moderacao: pode
// surfacar ao cliente como falha tecnica de upload (igual ao gate client-side do
// PHF-022), mas NUNCA carrega semantica de aprovado/reprovado (regra de silencio
// de moderacao do CLAUDE.md). `detail` guarda o dado bruto (MIME, codec, assinatura
// de virus) para log/observabilidade, nunca para exibir ao participante.
export class ValidationError extends Error {
  readonly code: ValidationCode;
  readonly detail?: string;

  constructor(code: ValidationCode, message: string, detail?: string) {
    super(message);
    this.code = code;
    this.detail = detail;
    this.name = 'ValidationError';
  }
}
