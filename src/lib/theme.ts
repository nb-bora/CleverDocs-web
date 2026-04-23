export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const KEY = 'cleverdocs.theme.v1'

export function getThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
    return 'system'
  } catch {
    return 'system'
  }
}

export function setThemePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    // ignore
  }
  applyThemePreference(pref)
}

export function getSystemTheme(): ResolvedTheme {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref
}

export function applyResolvedTheme(theme: ResolvedTheme) {
  const el = document.documentElement
  el.dataset.theme = theme
  // Helps form controls, scrollbars, etc.
  el.style.colorScheme = theme
}

export function applyThemePreference(pref: ThemePreference) {
  applyResolvedTheme(resolveTheme(pref))
  document.documentElement.dataset.themePref = pref
}

export function initTheme() {
  const applyFromStorage = () => applyThemePreference(getThemePreference())

  applyFromStorage()

  const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
  const onSystemChange = () => {
    if (getThemePreference() === 'system') applyFromStorage()
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) applyFromStorage()
  }

  if (mql?.addEventListener) mql.addEventListener('change', onSystemChange)
  else if (mql?.addListener) mql.addListener(onSystemChange)
  window.addEventListener('storage', onStorage)

  return () => {
    if (mql?.removeEventListener) mql.removeEventListener('change', onSystemChange)
    else if (mql?.removeListener) mql.removeListener(onSystemChange)
    window.removeEventListener('storage', onStorage)
  }
}

