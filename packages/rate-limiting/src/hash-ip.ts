import { createHash } from 'node:crypto';

// LGPD (02-spec.md §6, "Privacidade"): o IP do participante e PII. O rate limiter
// nunca deve gravar IP em claro no Redis. Hasheamos com um salt de servico ANTES
// de montar a chave, do mesmo jeito que `consent_record.ip_hash` (02-spec.md §3).
//
// O salt NAO e opcional: sem salt, SHA-256 de um IPv4 e reversivel por forca bruta
// (sao ~4 bilhoes de entradas). O salt vem do secrets manager (PHF-081), nunca do
// codigo/repositorio. Rotacao do salt reseta as janelas de rate limit — aceitavel,
// e so um efeito transitorio de contagem, nao perda de dado.
export function hashIp(ip: string, salt: string): string {
  if (!salt) {
    throw new Error('hashIp: salt obrigatorio (LGPD) — provisione via secrets manager (PHF-081)');
  }
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}
