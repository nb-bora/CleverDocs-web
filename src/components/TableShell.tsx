export function TableShell(
  props: Readonly<{ title?: string; hint?: string; children: React.ReactNode; right?: React.ReactNode }>
) {
  const showHeader = Boolean(props.title || props.hint || props.right)
  const hasLeft = Boolean(props.title || props.hint)
  return (
    <div className="card-soft overflow-hidden p-0">
      {showHeader ? (
        <div
          className="flex items-start justify-between gap-3 border-b p-4"
          style={{ borderColor: 'hsl(var(--surface) / var(--divider-alpha))' }}
        >
          {hasLeft ? (
            <div className="min-w-0">
              {props.title ? <div className="text-sm font-semibold">{props.title}</div> : null}
              {props.hint ? <div className="mt-1 text-xs text-slate-400">{props.hint}</div> : null}
            </div>
          ) : null}
          {props.right ? <div className={hasLeft ? 'shrink-0' : 'w-full'}>{props.right}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{props.children}</div>
    </div>
  )
}

