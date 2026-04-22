export function TableShell(props: { title: string; hint?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card-soft p-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{props.title}</div>
          {props.hint ? <div className="mt-1 text-xs text-slate-400">{props.hint}</div> : null}
        </div>
        {props.right ? <div className="shrink-0">{props.right}</div> : null}
      </div>
      <div className="p-4">{props.children}</div>
    </div>
  )
}

