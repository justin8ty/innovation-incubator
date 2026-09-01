export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"

const DEBUG_API = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_API === "1"

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now()

  if (DEBUG_API) {
    console.debug("[apiFetch] request", {
      url,
      method: init?.method ?? "GET",
      body: init?.body,
    })
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  const text = await response.text()

  if (DEBUG_API) {
    const finishedAt = typeof performance !== "undefined" ? performance.now() : Date.now()
    console.debug("[apiFetch] response", {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      ms: Math.round(finishedAt - startedAt),
      contentType: response.headers.get("content-type"),
      bodyPreview: text.slice(0, 500),
    })
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}: ${text || "empty response body"}`)
  }

  return JSON.parse(text) as T
}
