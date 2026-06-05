const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  getLive:      () => request('/api/v1/dashboard/live'),
  getHistory:   (period = 'daily') => request(`/api/v1/analytics/history?period=${period}`),
  getDevices:   () => request('/api/v1/devices'),
  toggleDevice: (id, is_on) =>
    request(`/api/v1/devices/${id}`, { method: 'PATCH', body: JSON.stringify({ is_on }) }),
  getBilling:   () => request('/api/v1/billing/summary'),

  // Week 3 — AI endpoints
  chat: (message) =>
    request('/api/v1/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  qa: (question) =>
    request('/api/v1/qa', { method: 'POST', body: JSON.stringify({ question }) }),
}

// ── Advanced streaming helpers (Week 3+) ──────────────────────────────────────

/**
 * Stream chat tokens via SSE.
 * onToken(str)  — called for each token
 * onDone(obj)   — called when stream ends {session_id}
 * onError(str)  — called on error
 * Returns the session_id used (so caller can persist it for memory).
 */
export async function streamChat({ message, session_id, onToken, onDone, onError }) {
  const res = await fetch(`${BASE_URL}/api/v1/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id }),
  })
  if (!res.ok) { onError?.(`HTTP ${res.status}`); return }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const evt = JSON.parse(line.slice(6))
        if (evt.type === 'token') onToken?.(evt.content)
        else if (evt.type === 'done') onDone?.(evt)
        else if (evt.type === 'error') onError?.(evt.content)
      } catch { /* ignore parse errors */ }
    }
  }
}

/**
 * Stream QA tokens via SSE.
 * onCitation(obj) — called for each citation before tokens start
 * onToken(str)    — called for each token
 * onDone(obj)     — called when done {session_id, sources_used}
 * onError(str)    — called on error
 */
export async function streamQA({ question, session_id, onCitation, onToken, onDone, onError }) {
  const res = await fetch(`${BASE_URL}/api/v1/qa/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id }),
  })
  if (!res.ok) { onError?.(`HTTP ${res.status}`); return }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const evt = JSON.parse(line.slice(6))
        if (evt.type === 'citation') onCitation?.(evt)
        else if (evt.type === 'token') onToken?.(evt.content)
        else if (evt.type === 'done') onDone?.(evt)
        else if (evt.type === 'error') onError?.(evt.content)
      } catch { /* ignore */ }
    }
  }
}
