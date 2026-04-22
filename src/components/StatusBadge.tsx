type Kind = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const styles: Record<Kind, string> = {
  success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-400/25 bg-amber-500/10 text-amber-200',
  danger: 'border-red-400/25 bg-red-500/10 text-red-200',
  info: 'border-sky-400/25 bg-sky-500/10 text-sky-200',
  neutral: 'border-white/10 bg-white/5 text-slate-200',
}

export function StatusBadge(props: { kind?: Kind; children: React.ReactNode }) {
  const kind = props.kind || 'neutral'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${styles[kind]}`}>
      {props.children}
    </span>
  )
}

