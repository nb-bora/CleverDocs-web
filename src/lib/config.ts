export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
  return raw.replace(/\/+$/, '')
}

