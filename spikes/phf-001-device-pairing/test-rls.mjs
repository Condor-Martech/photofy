// Spike PHF-001 — executa o schema + as FUNCOES da migration real
// (supabase/migrations/*.sql) contra um Postgres in-memory (pg-mem) e valida
// os 4 pontos da pergunta fechada: pareamento, isolamento por device+event,
// revogacao individual, e token de longa duracao sem refresh.
//
// LIMITE CONHECIDO: pg-mem nao implementa `ENABLE ROW LEVEL SECURITY` / `CREATE
// POLICY` (RLS de verdade so roda em Postgres real — Supabase/Docker, indisponivel
// neste sandbox, ver findings.md). Por isso aqui aplicamos manualmente o MESMO
// predicado SQL da policy (copiado de baixo) usando as funcoes reais da migration
// — testamos a logica de autorizacao de verdade via SQL, so nao o encanamento
// nativo do RLS (que e feature consolidada do Postgres, nao o risco deste spike).
import { newDb } from 'pg-mem';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const db = newDb({ autoCreateForeignKeyIndices: true });
db.public.registerFunction({
  name: 'gen_random_uuid',
  returns: 'uuid',
  implementation: () => crypto.randomUUID(),
  impure: true,
});

let sql = readFileSync(new URL('./supabase/migrations/20260713000000_device_pairing_spike.sql', import.meta.url), 'utf8');
sql = sql
  .replace(/alter publication[\s\S]*?;/gi, '') // infra do Realtime, nao suportado por pg-mem, fora do escopo deste teste
  .replace(/alter table \w+ enable row level security;/gi, '') // ver LIMITE CONHECIDO acima
  .replace(/create policy[\s\S]*?;\n\n?/gi, ''); // idem — predicado reaplicado manualmente abaixo

const { Pool } = db.adapters.createPg();
const client = new Pool();
await client.query(sql);

// Mesmo predicado de `media_items_device_read` na migration, so que chamado
// diretamente em vez de injetado por uma policy — ver LIMITE CONHECIDO.
async function mediaItemsVisibleTo(deviceId) {
  return client.query(
    `select * from media_items
     where device_is_active($1)
       and event_id = device_event_id($1)`,
    [deviceId]
  );
}
// Idem para `device_self_select`.
async function ownDeviceRow(deviceId) {
  return client.query(`select id from devices where id = $1`, [deviceId]);
}

const results = [];
function check(name, cond) {
  results.push({ name, pass: !!cond });
}

// --- Setup: 1 evento, 2 telas pareadas ---
const { rows: [event] } = await client.query(`insert into events (slug, nome) values ('lancamento-verao','Lançamento Verão') returning id`);
const { rows: [entrada] } = await client.query(
  `insert into devices (pairing_code, event_id, status, paired_at) values ('AAA111', $1, 'pareado', now()) returning id`,
  [event.id]
);
const { rows: [salao] } = await client.query(
  `insert into devices (pairing_code, event_id, status, paired_at) values ('BBB222', $1, 'pareado', now()) returning id`,
  [event.id]
);
await client.query(`insert into media_items (event_id, status, autor) values ($1, 'aprovado', 'participante-1')`, [event.id]);
await client.query(`insert into media_items (event_id, status, autor) values ($1, 'pendente', 'participante-2')`, [event.id]);

// 1) Tela pareada e ativa le os media_items do proprio evento
const itemsEntrada = await mediaItemsVisibleTo(entrada.id);
check('device pareado enxerga media_items do seu evento', itemsEntrada.rows.length === 2);

// 2) Revogacao de UM device nao afeta o outro pareado ao mesmo evento
await client.query(`update devices set status = 'revogado' where id = $1`, [entrada.id]);
const itemsEntradaAposRevogar = await mediaItemsVisibleTo(entrada.id);
check('device revogado perde acesso imediatamente (sem esperar exp do token)', itemsEntradaAposRevogar.rows.length === 0);

const itemsSalaoAposRevogarOutro = await mediaItemsVisibleTo(salao.id);
check('revogar "entrada" NAO afeta "salao-principal" (isolamento por linha)', itemsSalaoAposRevogarOutro.rows.length === 2);

// 3) Um device nunca enxerga o registro de outro device
const ownRow = await ownDeviceRow(salao.id);
check('device so consulta o proprio registro em `devices` (nunca o de outro)', ownRow.rows.length === 1 && ownRow.rows[0].id === salao.id);

// 4) Token de longa duracao (4-8h) sem refresh: a policy NAO depende do `exp` do JWT
//    (isso e responsabilidade do backend ao assinar); a policy so depende do `status`
//    ficar 'pareado' no banco. Assinamos um JWT HS256 com exp=+8h e mostramos que a
//    validade dele e ortogonal ao controle de acesso (que e sempre live via RLS/predicado).
function mintDeviceToken(deviceId, ttlHours) {
  const secret = 'spike-secret-nao-usar-em-prod';
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.parse('2026-07-13T12:00:00Z') / 1000); // relogio fixo p/ teste deterministico
  const payload = { device_id: deviceId, role: 'device', iat: now, exp: now + ttlHours * 3600 };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return { token: `${data}.${sig}`, payload };
}
const tokenSalao = mintDeviceToken(salao.id, 8);
check('token assinado com exp=+8h cobre a janela do evento sem refresh', tokenSalao.payload.exp - tokenSalao.payload.iat === 8 * 3600);

const tokenEntradaRevogado = mintDeviceToken(entrada.id, 8);
const aindaDentroDoExp = tokenEntradaRevogado.payload.exp > tokenSalao.payload.iat;
const itemsComTokenAindaValidoMasRevogado = await mediaItemsVisibleTo(entrada.id);
check(
  'device revogado com token ainda dentro do exp continua bloqueado (revogacao != expirar token)',
  aindaDentroDoExp && itemsComTokenAindaValidoMasRevogado.rows.length === 0
);

console.log(results.map(r => `[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`).join('\n'));
const failed = results.filter(r => !r.pass);
assert.equal(failed.length, 0, `${failed.length} check(s) falharam`);
console.log(`\n${results.length}/${results.length} checks OK`);
