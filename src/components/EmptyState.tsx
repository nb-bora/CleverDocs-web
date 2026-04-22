export function EmptyState(props: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
      <div className="text-base font-semibold">{props.title}</div>
      {props.description ? <div className="mt-1 text-sm text-slate-400">{props.description}</div> : null}
      {props.action ? <div className="mt-4 flex justify-center">{props.action}</div> : null}
    </div>
  )
}

