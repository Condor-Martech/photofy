import { createHash } from 'node:crypto';

// LGPD (02-spec.md secao 6, "Privacidade"): o IP e PII e a trilha de auditoria
// NUNCA grava IP em claro. Hasheamos com um salt de servico ANTES de persistir,
// exatamente como `consent_record.ip_hash` (02-spec.md secao 3) e o rate limiter
// (PHF-080). Mesmo salt do PHF-081 -> ip_hash consistente entre trilha e consent,
// permitindo correlacao sem jamais expor o IP.
//
// O salt NAO e opcional: SHA-256 de um IPv4 sem salt e reversivel por forca bruta
// (~4 bilhoes de entradas). O salt vem do secrets manager (PHF-081), nunca do codigo.
export function hashIp(ip: string, salt: string): string {
  if (!salt) {
    throw new Error('hashIp: salt obrigatorio (LGPD) — provisione via secrets manager (PHF-081)');
  }
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}
