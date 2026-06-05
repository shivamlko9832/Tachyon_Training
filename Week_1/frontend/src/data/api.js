const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  getLive: () => request('/api/v1/dashboard/live'),
  getHistory: (period = 'daily') => request(`/api/v1/analytics/history?period=${period}`),
  getDevices: () => request('/api/v1/devices'),
  toggleDevice: (id, is_on) =>
    request(`/api/v1/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_on }),
    }),
  getBilling: () => request('/api/v1/billing/summary'),
}
