// Variante do measure.mjs para o outro fator de incerteza citado em
// 01-poc-spikes.md Spike 3: "multiplos eventos ativos simultaneos" (nao so
// lote grande num unico evento). 5 eventos concorrentes, 4 assinantes cada
// (20 conexoes Realtime simultaneas), todos disparando lote=50 ao mesmo
// tempo -- pior caso realista (dois eventos do Condor rodando no mesmo dia,
// ambos no "momento do brinde").

import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const URL = 'http://127.0.0.1:54321'
const ANON_KEY =
  'eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjIwOTkzNTMzOTJ9.O2CZ9R2Uhitre7Snah8_brM51aIbTf2NLDB8PG-fxmPcFPj9C8mcQ6F0REiSDggtukkFoaH3vYafbu540yZvFA'
const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const SUBSCRIBERS = ['telao-entrada', 'telao-salao', 'galeria', 'painel-moderacao']
const CONCURRENT_EVENTS = 5
const BATCH_SIZE = 50
const SETTLE_MS = 10000

const pool = new pg.Pool({ connectionString: DB_URL })

async function setupEvent(idx) {
  const { rows: [event] } = await pool.query(
    `insert into events (slug) values ($1) returning id`,
    [`concurrent-${idx}-${Date.now()}`]
  )
  const { rows } = await pool.query(
    `insert into media_items (event_id, status) select $1, 'pendente' from generate_series(1, $2) returning id`,
    [event.id, BATCH_SIZE]
  )
  const ids = rows.map(r => r.id)

  const received = new Map(SUBSCRIBERS.map(s => [s, new Map()]))
  const clients = []
  const channels = []
  for (const name of SUBSCRIBERS) {
    const client = createClient(URL, ANON_KEY)
    clients.push(client)
    const channel = client.channel(`concurrent-${name}-${event.id}`)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'media_items', filter: `event_id=eq.${event.id}` },
      payload => received.get(name).set(payload.new.id, Date.now())
    )
    channels.push(channel)
  }
  await Promise.all(
    channels.map(
      channel =>
        new Promise((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('subscribe timeout ' + channel.topic)), 15000)
          channel.subscribe(status => {
            if (status === 'SUBSCRIBED') { clearTimeout(t); resolve() }
            else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              clearTimeout(t); reject(new Error(`${status} on ${channel.topic}`))
            }
          })
        })
    )
  )

  return { eventId: event.id, ids, received, clients, channels }
}

async function main() {
  const events = await Promise.all(Array.from({ length: CONCURRENT_EVENTS }, (_, i) => setupEvent(i)))

  const approvedAtByEvent = await Promise.all(
    events.map(async ev => {
      const { rows } = await pool.query(
        `update media_items set status='aprovado', aprovado_em=clock_timestamp()
         where id = any($1::uuid[]) returning id, extract(epoch from aprovado_em) * 1000 as approved_at_ms`,
        [ev.ids]
      )
      return new Map(rows.map(r => [r.id, Number(r.approved_at_ms)]))
    })
  )

  await new Promise(resolve => setTimeout(resolve, SETTLE_MS))

  const allLatencies = []
  let totalMissed = 0
  let totalExpected = 0
  events.forEach((ev, i) => {
    const approvedAt = approvedAtByEvent[i]
    let missed = 0
    for (const subscriber of SUBSCRIBERS) {
      const map = ev.received.get(subscriber)
      for (const id of ev.ids) {
        const receivedAt = map.get(id)
        if (receivedAt == null) { missed++; continue }
        allLatencies.push(receivedAt - approvedAt.get(id))
      }
    }
    totalMissed += missed
    totalExpected += ev.ids.length * SUBSCRIBERS.length
    console.log(`evento ${i}: perdidos=${missed}/${ev.ids.length * SUBSCRIBERS.length}`)
  })

  allLatencies.sort((a, b) => a - b)
  const p95 = allLatencies[Math.min(allLatencies.length - 1, Math.ceil(0.95 * allLatencies.length) - 1)]
  const p99 = allLatencies[Math.min(allLatencies.length - 1, Math.ceil(0.99 * allLatencies.length) - 1)]
  console.log(
    `\n${CONCURRENT_EVENTS} eventos concorrentes x lote=${BATCH_SIZE}: amostras=${allLatencies.length}/${totalExpected} ` +
      `perdidos=${totalMissed} p50=${allLatencies[Math.floor(allLatencies.length / 2)]}ms p95=${p95}ms p99=${p99}ms max=${allLatencies[allLatencies.length - 1]}ms`
  )

  await Promise.all(events.flatMap(ev => ev.channels.map(c => c.unsubscribe())))
  await Promise.all(events.flatMap(ev => ev.clients.map(c => c.removeAllChannels())))
  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
