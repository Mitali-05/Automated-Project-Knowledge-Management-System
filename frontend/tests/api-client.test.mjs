import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { test, beforeEach, afterEach } from 'node:test'
import ts from 'typescript'

const source = (await readFile(new URL('../src/api/client.ts', import.meta.url), 'utf8'))
  .replace('import.meta.env.VITE_API_URL', "''")
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
})
const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const original = { fetch: globalThis.fetch, window: globalThis.window, storage: globalThis.localStorage }
let timers, cleared, events, values

beforeEach(() => {
  timers = []; cleared = []; events = []; values = new Map()
  globalThis.window = {
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length },
    clearTimeout: (id) => cleared.push(id),
    dispatchEvent: (event) => events.push(event.type),
  }
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
})

afterEach(() => {
  globalThis.fetch = original.fetch
  if (original.window === undefined) delete globalThis.window
  else globalThis.window = original.window
  if (original.storage === undefined) delete globalThis.localStorage
  else globalThis.localStorage = original.storage
})

test('OAuth requests can use an explicit deadline without changing the default', async () => {
  globalThis.fetch = async () => Response.json({ projectId: 1 })
  await api.http.post('/api/integrations/jira/callback', { code: 'test', state: 'test' }, 90_000)
  assert.equal(timers[0].delay, 90_000)
  assert.deepEqual(cleared, [1])
})

test('history requests retain authentication and clear their deadline on success', async () => {
  api.tokenStore.set('test-token')
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    assert.ok(options.signal instanceof AbortSignal)
    return Response.json([{ id: 1, status: 'FAILED' }])
  }
  assert.deepEqual(await api.http.get('/api/projects/1/sync/history'), [{ id: 1, status: 'FAILED' }])
  assert.equal(timers[0].delay, 30_000)
  assert.deepEqual(cleared, [1])
})

test('a stalled request times out without automatically repeating a mutation', async () => {
  let calls = 0
  globalThis.fetch = (_url, { signal }) => {
    calls += 1
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () =>
      reject(new DOMException('aborted', 'AbortError'))))
  }
  const pending = api.http.post('/api/projects/1/sync')
  timers[0].callback()
  await assert.rejects(pending, /did not respond within 30 seconds/)
  assert.equal(calls, 1)
  assert.deepEqual(cleared, [1])
})

test('the deadline also covers a stalled response body', async () => {
  let reading
  const bodyStarted = new Promise((resolve) => { reading = resolve })
  globalThis.fetch = async (_url, { signal }) => ({
    status: 200, ok: true,
    text: () => {
      reading()
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError'))))
    },
  })
  const pending = api.http.get('/api/projects/1/sync/history')
  await bodyStarted
  timers[0].callback()
  await assert.rejects(pending, /did not respond within 30 seconds/)
  assert.deepEqual(cleared, [1])
})

test('successful invalid JSON is an explicit error, not null data', async () => {
  globalThis.fetch = async () => new Response('<html>proxy</html>')
  await assert.rejects(api.http.get('/api/projects/1/sync/history'),
    (error) => error instanceof api.ApiError && error.status === 502)
})

test('an expired authenticated session still clears credentials', async () => {
  api.tokenStore.set('expired-test-token')
  globalThis.fetch = async () => Response.json({ message: 'Expired' }, { status: 401 })
  await assert.rejects(api.http.get('/api/auth/me'), /Expired/)
  assert.equal(api.tokenStore.get(), null)
  assert.equal(events.filter(e => e === api.UNAUTHORIZED_EVENT).length, 1)
  assert.ok(events.includes(api.SESSION_CLEARED_EVENT))
  assert.equal(api.pendingApiRequests(), 0)
})

test('non-JSON server failures retain the server status', async () => {
  globalThis.fetch = async () => new Response('Proxy failure', { status: 503 })
  await assert.rejects(api.http.get('/api/projects/1/freshness'),
    (error) => error.status === 503 && error.message === 'Request failed (503)')
})
