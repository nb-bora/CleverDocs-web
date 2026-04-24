export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL || 'https://briceincode-cleverdocs.hf.space'
  return raw.replace(/\/+$/, '')
}

