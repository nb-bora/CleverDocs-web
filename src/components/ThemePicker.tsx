import { useEffect, useState } from 'react'
import { getThemePreference, setThemePreference, type ThemePreference } from '../lib/theme'

const OPTIONS: Array<{ id: ThemePreference; label: string }> = [
  { id: 'system', label: 'Système' },
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
]

export function ThemePicker() {
  const [pref, setPref] = useState<ThemePreference>(() => getThemePreference())

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cleverdocs.theme.v1') setPref(getThemePreference())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={[
            'rounded-xl px-3 py-1.5 text-xs font-medium transition',
            pref === opt.id ? 'bg-white/15 text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-white/10',
          ].join(' ')}
          onClick={() => {
            setPref(opt.id)
            setThemePreference(opt.id)
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

