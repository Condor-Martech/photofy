import { describe, expect, it } from 'vitest';
import { hashIp } from '../src/hash-ip.js';

describe('hashIp (LGPD)', () => {
  it('exige salt — sem salt lanca', () => {
    expect(() => hashIp('203.0.113.7', '')).toThrow(/salt obrigatorio/);
  });

  it('e deterministico com o mesmo salt', () => {
    expect(hashIp('203.0.113.7', 'salt-x')).toBe(hashIp('203.0.113.7', 'salt-x'));
  });

  it('salts diferentes produzem hashes diferentes', () => {
    expect(hashIp('203.0.113.7', 'salt-a')).not.toBe(hashIp('203.0.113.7', 'salt-b'));
  });

  it('nunca devolve o IP em claro', () => {
    const h = hashIp('203.0.113.7', 'salt-x');
    expect(h).not.toContain('203.0.113.7');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
