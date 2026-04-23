import { useEffect, useId, useRef, useState } from 'react'

export function DropdownMenu(
  props: Readonly<{
  label: string
  buttonClassName?: string
  align?: 'left' | 'right'
  children: React.ReactNode
  }>
) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    globalThis.addEventListener('mousedown', onDown)
    globalThis.addEventListener('keydown', onKey)
    return () => {
      globalThis.removeEventListener('mousedown', onDown)
      globalThis.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className={props.buttonClassName || 'btn-secondary'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {props.label}
      </button>
      {open ? (
        <div
          id={id}
          role="menu"
          className={[
            'absolute z-20 mt-2 min-w-[200px] overflow-hidden rounded-2xl border p-1 shadow-xl',
            props.align === 'left' ? 'left-0' : 'right-0',
          ].join(' ')}
          style={{
            borderColor: 'hsl(var(--surface) / var(--divider-alpha))',
            background: 'hsl(var(--soft-bg) / 0.98)',
            boxShadow: 'var(--elev-2)',
          }}
        >
          {props.children}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownItem(
  props: Readonly<{
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: 'danger' | 'default'
  }>
) {
  const tone = props.tone || 'default'
  return (
    <button
      type="button"
      role="menuitem"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
        'disabled:opacity-50',
        tone === 'danger' ? 'text-red-600' : 'text-[hsl(var(--foreground))]',
      ].join(' ')}
      style={{
        background: 'transparent',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--surface) / var(--surface-alpha))'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      <span>{props.children}</span>
    </button>
  )
}

