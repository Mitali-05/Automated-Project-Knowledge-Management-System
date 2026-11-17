// Empty in development (requests go through the Vite proxy); set VITE_API_URL for a deployed API.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'prism.token'

/** Fired when the API rejects our token so the app can drop the session and show the login page. */
export const UNAUTHORIZED_EVENT = 'prism:unauthorized'
export const API_ACTIVITY_EVENT = 'prism:api-activity'
export const SESSION_CLEARED_EVENT = 'prism:session-cleared'
let activeRequests = 0
export const pendingApiRequests = () => activeRequests
function activity(delta: number) {
  activeRequests = Math.max(0, activeRequests + delta)
  window.dispatchEvent(new Event(API_ACTIVITY_EVENT))
}

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT))
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
  clear(): void {
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT))
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function request<T>(method: Method, path: string, body?: unknown, timeoutMs = 30_000): Promise<T> {
  activity(1)
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    if (response.status === 204) return undefined as T

    const text = await response.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        if (response.ok) throw new ApiError(502, 'The server returned an invalid JSON response.')
      }
    }

    if (!response.ok) {
      const err = (data ?? {}) as { message?: string; fieldErrors?: Record<string, string> }
      if (response.status === 401 && token) {
        tokenStore.clear()
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
      }
      throw new ApiError(
        response.status,
        err.message ?? `Request failed (${response.status})`,
        err.fieldErrors ?? {},
      )
    }
    if (!text) throw new ApiError(502, 'The server returned an empty response.')
    return data as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (controller.signal.aborted) {
      throw new ApiError(0, `The server did not respond within ${timeoutMs / 1000} seconds. Check the current status before retrying an action.`)
    }
    throw new ApiError(0, 'Cannot reach the server. Make sure the backend is running on port 8080 and try again.')
  } finally {
    window.clearTimeout(timeout)
    activity(-1)
  }
}

export const http = {
  get: <T>(path: string, timeoutMs?: number) => request<T>('GET', path, undefined, timeoutMs),
  post: <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('POST', path, body ?? {}, timeoutMs),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}

/** Downloads a file from an authenticated endpoint (a plain link cannot send the Authorization header). */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = tokenStore.get()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Make sure the backend is running on port 8080 and try again.')
  }
  if (!response.ok) {
    let message = `Download failed (${response.status})`
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      /* keep the generic message */
    }
    throw new ApiError(response.status, message)
  }
  const url = URL.createObjectURL(await response.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
