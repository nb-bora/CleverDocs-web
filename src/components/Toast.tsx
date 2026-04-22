import { useEffect, useState } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  kind: ToastKind
  title: string
  message?: string
}

let pushFn: ((t: Omit<ToastItem, 'id'>) => void) | null = null

export function toast(t: Omit<ToastItem, 'id'>) {
  pushFn?.(t)
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    pushFn = (t) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const item: ToastItem = { id, ...t }
      setItems((prev) => [item, ...prev].slice(0, 5))
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id))
      }, 4500)
    }
    return () => {
      pushFn = null
    }
  }, [])

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={[
            'rounded-2xl border p-4 shadow-lg shadow-black/30 backdrop-blur',
            t.kind === 'success' ? 'border-emerald-400/30 bg-emerald-500/10' : '',
            t.kind === 'error' ? 'border-red-400/30 bg-red-500/10' : '',
            t.kind === 'info' ? 'border-sky-400/30 bg-sky-500/10' : '',
          ].join(' ')}
        >
          <div className="text-sm font-semibold">{t.title}</div>
          {t.message ? <div className="mt-1 text-sm text-slate-200/90">{t.message}</div> : null}
        </div>
      ))}
    </div>
  )
}

