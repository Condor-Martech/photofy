# @photofy/audit-log (PHF-082)

Trilha de acesso/auditoria append-only e detecção de anomalia para o Photofy.

- **Trilha**: `AuditLogger` normaliza eventos de domínio na forma canônica de `audit_log`, hasheia o IP
  (LGPD, salt via PHF-081) e escreve num sink. **Fail-open**: nunca derruba a request se o sink falhar.
- **Sinks**: `MemoryAuditSink` (testes), `StdoutAuditSink` (JSON por linha), `createSupabaseSink` (tabela
  `audit_log`).
- **Anomalia**: `evaluateAnomalies` roda detectores puros (pico de falha de processamento, brute-force
  de auth, reprovação em massa) sobre uma janela deslizante. Todo alerta é **para operadores, nunca para
  o participante** — invariante de tipo (`audiencia: 'operadores'`).

Ver `docs/observability.md` na raiz para a arquitetura completa e a cobertura Gherkin.

```bash
npm install
npm test        # vitest
npm run typecheck
```
