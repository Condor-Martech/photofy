// Spike PHF-003: mede latencia ponta-a-ponta do Supabase Realtime quando um
// lote de media_items muda para status=aprovado de uma vez, com varios
// assinantes (telao x2, galeria, painel) ouvindo o mesmo evento via
// postgres_changes -- espelha o fanout descrito em 02-spec.md linhas 26-27.
//
// Latencia = timestamp de recebimento no cliente - aprovado_em (timestamp
// gravado pelo Postgres no momento do commit do UPDATE, via clock_timestamp()).
// Usar o clock do servidor como origem remove a incerteza de round-trip do
// disparo do UPDATE, isolando so o trecho que o spike quer medir: commit -> fanout Realtime -> cliente.
//
// Assinantes ficam conectados uma unica vez por evento e recebem varias
// ondas de aprovacao em lote -- assim como telao/galeria/painel de verdade
// ficam conectados pela duracao inteira do evento (nao reconectam a cada
// lote aprovado pelo moderador).

import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const URL = 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwOTkzNTMzOTJ9.O2CZ9R2Uhitre7Snah8_brM51aIbTf2NLDB8PG-fxmPcFPj9C8mcQ6F0REiSDggtukkFoaH3vYafbu540yZvFA'
const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const SUBSCRIBERS = ['telao-entrada', 'telao-salao', 'galeria', 'painel-moderacao']
const BATCH_SIZES = [10, 30, 50]
const REPS_PER_SIZE = 3
const SETTLE_MS = 8000

const pool = new pg.Pool({ connectionString: DB_URL })

async function createEvent() {
  const { rows: [event] } = await pool.query(
    `insert into events (slug) values ($1) returning id`,
    [`spike-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`]
  )
  return event.id
}

async function insertItems(eventId, n) {
  const { rows } = await pool.query(
    `insert into media_items (event_id, status)
     select $1, 'pendente' from generate_series(1, $2)
     returning id`,
    [eventId, n]
  )
  return rows.map(r => r.id)
}

async function connectSubscribers(eventId) {
  const received = new Map(SUBSCRIBERS.map(s => [s, new Map()])) // subscriber -> mediaId -> receivedAt(ms)
  const clients = []
  const channels = []

  for (const name of SUBSCRIBERS) {
    const client = createClient(URL, ANON_KEY)
    clients.push(client)
    const channel = client.channel(`spike-${name}-${eventId}`)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'media_items', filter: `event_id=eq.${eventId}` },
      payload => {
        received.get(name).set(payload.new.id, Date.now())
      }
    )
    channels.push(channel)
  }

  await Promise.all(
    channels.map(
      channel =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('subscribe timeout ' + channel.topic)), 10000)
          channel.subscribe(status => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timer)
              resolve()
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              clearTimeout(timer)
              reject(new Error(`${status} on ${channel.topic}`))
            }
          })
        })
    )
  )

  return {
    received,
    cleanup: async () => {
      await Promise.all(channels.map(c => c.unsubscribe()))
      await Promise.all(clients.map(c => c.removeAllChannels()))
    },
  }
}

async function runSize(size) {
  const eventId = await createEvent()
  const { received, cleanup } = await connectSubscribers(eventId)
  const repResults = []

  for (let rep = 1; rep <= REPS_PER_SIZE; rep++) {
    const ids = await insertItems(eventId, size)
    const before = new Map(SUBSCRIBERS.map(s => [s, received.get(s).size]))

    const { rows } = await pool.query(
      `update media_items
       set status = 'aprovado', aprovado_em = clock_timestamp()
       where id = any($1::uuid[])
       returning id, extract(epoch from aprovado_em) * 1000 as approved_at_ms`,
      [ids]
    )
    const approvedAtMs = new Map(rows.map(r => [r.id, Number(r.approved_at_ms)]))

    await new Promise(resolve => setTimeout(resolve, SETTLE_MS))

    const latencies = []
    let missed = 0
    const missedBySubscriber = {}
    for (const subscriber of SUBSCRIBERS) {
      const map = received.get(subscriber)
      let missedHere = 0
      for (const id of ids) {
        const approvedAt = approvedAtMs.get(id)
        const receivedAt = map.get(id)
        if (receivedAt == null) {
          missed++
          missedHere++
          continue
        }
        latencies.push(receivedAt - approvedAt)
      }
      if (missedHere > 0) missedBySubscriber[subscriber] = missedHere
    }
    repResults.push({ size, rep, latencies, missed, expected: size * SUBSCRIBERS.length, missedBySubscriber })
    console.log(
      `batch=${size} rep=${rep}/${REPS_PER_SIZE} eventos=${size * SUBSCRIBERS.length} perdidos=${missed} ` +
        `(${JSON.stringify(missedBySubscriber)}) latencias(ms) min=${Math.min(...latencies)} max=${Math.max(...latencies)}`
    )
  }

  await cleanup()
  return repResults
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx]
}

async function main() {
  const results = []
  for (const size of BATCH_SIZES) {
    results.push(...(await runSize(size)))
  }

  console.log('\n--- resumo por tamanho de lote ---')
  for (const size of BATCH_SIZES) {
    const all = results.filter(r => r.size === size).flatMap(r => r.latencies).sort((a, b) => a - b)
    const missed = results.filter(r => r.size === size).reduce((acc, r) => acc + r.missed, 0)
    const expected = results.filter(r => r.size === size).reduce((acc, r) => acc + r.expected, 0)
    console.log(
      `lote=${size} amostras=${all.length}/${expected} perdidos=${missed} ` +
        `p50=${percentile(all, 50)}ms p95=${percentile(all, 95)}ms p99=${percentile(all, 99)}ms max=${all[all.length - 1]}ms`
    )
  }

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
