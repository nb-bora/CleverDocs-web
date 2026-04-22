import type { ReactNode } from 'react'

export function PageHeader(props: {
  title: string
  description?: string
  actions?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="page-title">{props.title}</div>
        {props.description ? <div className="page-subtitle">{props.description}</div> : null}
      </div>
      {props.actions ? <div className="page-actions">{props.actions}</div> : null}
      {props.right ? <div className="md:ml-auto">{props.right}</div> : null}
    </div>
  )
}

