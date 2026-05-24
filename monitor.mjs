const args = process.argv.slice(2)

const readArg = (name, fallback) => {
  const idx = args.indexOf(name)
  if (idx === -1) return fallback
  const v = args[idx + 1]
  if (!v || v.startsWith('--')) return fallback
  return v
}

const hasFlag = (name) => args.includes(name)

const baseUrl = readArg('--url', 'http://127.0.0.1:4173')
const intervalMs = Math.max(500, Number(readArg('--interval', '5000')) || 5000)
const timeoutMs = Math.max(200, Number(readArg('--timeout', '2000')) || 2000)
const once = hasFlag('--once')

const endpoints = [
  { name: 'frontend', path: '/' },
  { name: 'api-proxy', path: '/api/health' },
]

const now = () => new Date().toISOString().replace('T', ' ').replace('Z', '')

const fetchWithTimeout = async (url, timeout) => {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeout)
  try {
    const start = Date.now()
    const resp = await fetch(url, { method: 'GET', signal: controller.signal })
    try {
      await resp.arrayBuffer()
    } catch {}
    const ms = Date.now() - start
    return { ok: resp.ok, status: resp.status, ms }
  } finally {
    clearTimeout(t)
  }
}

const checkOnce = async () => {
  const results = await Promise.all(
    endpoints.map(async (e) => {
      const url = `${baseUrl}${e.path}`
      try {
        const r = await fetchWithTimeout(url, timeoutMs)
        return { name: e.name, url, ...r, error: null }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { name: e.name, url, ok: false, status: null, ms: null, error: msg }
      }
    }),
  )

  const okAll = results.every((r) => r.ok)
  const head = `${now()} ${okAll ? 'OK' : 'FAIL'}`
  process.stdout.write(`${head}\n`)
  for (const r of results) {
    const status = r.status === null ? '-' : String(r.status)
    const ms = r.ms === null ? '-' : `${r.ms}ms`
    const tail = r.error ? ` ${r.error}` : ''
    process.stdout.write(`  ${r.name} ${status} ${ms} ${r.url}${tail}\n`)
  }

  return okAll
}

const run = async () => {
  if (once) {
    const ok = await checkOnce()
    process.exitCode = ok ? 0 : 1
    return
  }

  while (true) {
    await checkOnce()
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

run().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e)
  process.stderr.write(`${now()} FAIL ${msg}\n`)
  process.exitCode = 1
})
