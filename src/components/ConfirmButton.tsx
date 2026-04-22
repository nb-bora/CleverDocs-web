import { useState } from 'react'

export function ConfirmButton(props: {
  className?: string
  confirmText?: string
  children: React.ReactNode
  onConfirm: () => Promise<void> | void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      className={props.className}
      disabled={busy}
      onClick={async () => {
        const ok = window.confirm(props.confirmText || 'Confirmer ?')
        if (!ok) return
        try {
          setBusy(true)
          await props.onConfirm()
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? '…' : props.children}
    </button>
  )
}

