import { describe, it, expect } from 'vitest';
import { hashIp } from '../src/hash-ip.js';

describe('hashIp (LGPD)', () => {
  it('e deterministico para mesmo ip+salt', () => {
    expect(hashIp('203.0.113.7', 'salt-a')).toBe(hashIp('203.0.113.7', 'salt-a'));
  });

  it('nunca devolve o IP em claro', () => {
    const h = hashIp('203.0.113.7', 'salt-a');
    expect(h).not.toContain('203.0.113.7');
    expect(h).toMatch(/^[0-9a-f]{64}$/); // sha-256 hex
  });

  it('salts diferentes produzem hashes diferentes (impede rainbow table)', () => {
    expect(hashIp('203.0.113.7', 'salt-a')).not.toBe(hashIp('203.0.113.7', 'salt-b'));
  });

  it('IPs diferentes produzem hashes diferentes', () => {
    expect(hashIp('203.0.113.7', 'salt-a')).not.toBe(hashIp('203.0.113.8', 'salt-a'));
  });

  it('exige salt (LGPD: sem salt SHA-256 de IPv4 e reversivel)', () => {
    expect(() => hashIp('203.0.113.7', '')).toThrow(/salt obrigatorio/);
  });
});
