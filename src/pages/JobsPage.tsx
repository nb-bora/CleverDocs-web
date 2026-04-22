import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { cleverdocs } from '../api/cleverdocs'
import { PageHeader } from '../components/PageHeader'
import { TableShell } from '../components/TableShell'
import { ConfirmButton } from '../components/ConfirmButton'
import { StatusBadge } from '../components/StatusBadge'
import { toast } from '../components/Toast'
import { ApiError } from '../lib/api'

function kind(status: string) {
  if (status === 'succeeded') return 'success'
  if (status === 'queued' || status === 'running') return 'info'
  if (status === 'failed' || status === 'dead') return 'danger'
  if (status === 'cancelled') return 'neutral'
  return 'neutral'
}

function StatPill(props: Readonly<{ label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }>) {
  const tone = props.tone || 'neutral'
  let toneCls = 'border-white/10 bg-white/5 text-slate-200'
  if (tone === 'good') toneCls = 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
  if (tone === 'warn') toneCls = 'border-amber-400/20 bg-amber-500/10 text-amber-100'
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${toneCls}`}>
      <span className="text-slate-400">{props.label}</span>
      <span className="font-semibold tracking-tight">{props.value}</span>
    </div>
  )
}

export function JobsPage() {
  const [limit, setLimit] = useState(50)
  const jobsQ = useQuery({ queryKey: ['jobs', limit], queryFn: () => cleverdocs.listJobs(limit) })
  const deadQ = useQuery({ queryKey: ['jobs-dead', limit], queryFn: () => cleverdocs.listDeadJobs(limit) })

  const items = useMemo(() => jobsQ.data || [], [jobsQ.data])
  const dead = useMemo(() => deadQ.data || [], [deadQ.data])
  const stats = useMemo(() => {
    const queued = items.filter((j: any) => j.status === 'queued').length
    const running = items.filter((j: any) => j.status === 'running').length
    const failed = items.filter((j: any) => j.status === 'failed').length
    const succeeded = items.filter((j: any) => j.status === 'succeeded').length
    const deadCount = dead.length
    return { queued, running, failed, succeeded, deadCount }
  }, [items, dead])

  const retryFailed = useMutation({
    mutationFn: async () => cleverdocs.retryFailedJobs(null, limit, true),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Retry failed lancé' })
      jobsQ.refetch()
      deadQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Retry failed', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const retryDead = useMutation({
    mutationFn: async () => cleverdocs.retryDeadJobs(null, limit, true),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Retry dead lancé' })
      jobsQ.refetch()
      deadQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Retry dead', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  return (
    <div className="grid gap-6">
      <div className="card-soft">
        <PageHeader
          title="Jobs"
          description="Queue OCR/INDEX: annuler, relancer, et gérer la dead-letter (dead)."
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button className="btn-ghost" onClick={() => jobsQ.refetch()}>
                Refresh
              </button>
              <button className="btn-ghost" onClick={() => deadQ.refetch()}>
                Refresh dead
              </button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <StatPill label="Queued" value={String(stats.queued)} tone={stats.queued > 0 ? 'warn' : 'neutral'} />
          <StatPill label="Running" value={String(stats.running)} tone={stats.running > 0 ? 'warn' : 'neutral'} />
          <StatPill label="Failed" value={String(stats.failed)} tone={stats.failed > 0 ? 'warn' : 'neutral'} />
          <StatPill label="Succeeded" value={String(stats.succeeded)} tone={stats.succeeded > 0 ? 'good' : 'neutral'} />
          <StatPill label="Dead" value={String(stats.deadCount)} tone={stats.deadCount > 0 ? 'warn' : 'neutral'} />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Contrôles</div>
              <div className="mt-0.5 text-xs text-slate-500">Relancer les jobs échoués / dead, et ajuster le nombre affiché.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="label">Limit</span>
              <input
                className="input w-[120px]"
                type="number"
                min={1}
                max={200}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(200, Number(e.target.value) || 50)))}
              />
              <button className="btn-primary" disabled={retryFailed.isPending} onClick={() => retryFailed.mutate()}>
                Retry failed
              </button>
              <button className="btn-secondary" disabled={retryDead.isPending} onClick={() => retryDead.mutate()}>
                Retry dead
              </button>
            </div>
          </div>
        </div>
      </div>

      <TableShell title="Jobs (org)" hint="Tu dois être admin/owner sur l’org sélectionnée.">
        {jobsQ.isLoading ? <div className="text-sm text-slate-400">Chargement…</div> : null}
        {jobsQ.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            Erreur <code className="badge">/v1/jobs</code>
          </div>
        ) : null}
        <div className="grid gap-2">
          {items.map((j: any) => (
            <JobRow key={j.id} job={j} onChanged={() => jobsQ.refetch()} />
          ))}
          {jobsQ.data?.length === 0 ? <div className="text-sm text-slate-400">Aucun job.</div> : null}
        </div>
      </TableShell>

      <TableShell title="Dead-letter (dead)" hint="Jobs ayant dépassé max_attempts.">
        {deadQ.isLoading ? <div className="text-sm text-slate-400">Chargement…</div> : null}
        {deadQ.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            Erreur <code className="badge">/v1/jobs/dead</code>
          </div>
        ) : null}
        <div className="grid gap-2">
          {dead.map((j: any) => (
            <div
              key={j.id}
              className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/15 hover:bg-white/[0.06]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge kind="danger">dead</StatusBadge>
                  <span className="badge">{j.type}</span>
                </div>
                <div className="text-xs text-slate-400">doc: {j.document_id}</div>
              </div>
              {j.last_error ? <div className="mt-2 text-xs text-red-200">{j.last_error}</div> : null}
            </div>
          ))}
          {deadQ.data?.length === 0 ? <div className="text-sm text-slate-400">Aucun dead job.</div> : null}
        </div>
      </TableShell>
    </div>
  )
}

function JobRow(props: Readonly<{ job: any; onChanged: () => void }>) {
  const j = props.job
  const cancel = useMutation({
    mutationFn: async () => cleverdocs.cancelJob(j.id),
    onSuccess: () => props.onChanged(),
    onError: (e) => toast({ kind: 'error', title: 'Cancel job', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const retry = useMutation({
    mutationFn: async () => cleverdocs.retryJob(j.id, true),
    onSuccess: () => props.onChanged(),
    onError: (e) => toast({ kind: 'error', title: 'Retry job', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/15 hover:bg-white/[0.06]">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind={kind(String(j.status)) as any}>{j.status}</StatusBadge>
            <span className="badge">{j.type}</span>
            <span className="badge">attempts: {j.attempts}/{j.max_attempts}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">job_id: {j.id}</div>
          <div className="mt-1 text-xs text-slate-400">doc: {j.document_id}</div>
          {j.last_error ? <div className="mt-1 text-xs text-red-200">{j.last_error}</div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" disabled={retry.isPending} onClick={() => retry.mutate()}>
            Retry
          </button>
          <ConfirmButton
            className="btn-ghost"
            confirmText="Annuler ce job ?"
            onConfirm={async () => {
              await cancel.mutateAsync()
            }}
          >
            Cancel
          </ConfirmButton>
        </div>
      </div>
    </div>
  )
}

