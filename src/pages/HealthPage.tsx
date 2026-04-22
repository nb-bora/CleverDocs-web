import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'

function pickOk(v: any, defaultValue: boolean) {
  if (typeof v === 'boolean') return v
  return defaultValue
}

type HealthSummary = {
  ok: boolean
  dbOk: boolean
  searchOk: boolean
  jobsOk: boolean
  outboxOk: boolean
}

function HealthCards(props: Readonly<{ summary: HealthSummary }>) {
  const s = props.summary
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">DB</div>
          <StatusBadge kind={s.dbOk ? 'success' : 'danger'}>{s.dbOk ? 'ok' : 'ko'}</StatusBadge>
        </div>
        <div className="mt-2 text-xs text-slate-500">Connexion & requêtes.</div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Recherche</div>
          <StatusBadge kind={s.searchOk ? 'success' : 'warning'}>{s.searchOk ? 'ok' : 'fallback'}</StatusBadge>
        </div>
        <div className="mt-2 text-xs text-slate-500">OpenSearch si dispo, sinon SQL/FTS.</div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Jobs</div>
          <StatusBadge kind={s.jobsOk ? 'success' : 'danger'}>{s.jobsOk ? 'ok' : 'ko'}</StatusBadge>
        </div>
        <div className="mt-2 text-xs text-slate-500">Queue OCR/INDEX + dead.</div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Outbox</div>
          <StatusBadge kind={s.outboxOk ? 'success' : 'danger'}>{s.outboxOk ? 'ok' : 'ko'}</StatusBadge>
        </div>
        <div className="mt-2 text-xs text-slate-500">Événements & dispatch.</div>
      </div>
    </div>
  )
}

export function HealthPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const summary = useMemo(() => {
    if (!data) return null
    const ok = pickOk(data?.ok, true)
    const dbOk = pickOk(data?.db?.ok, true)
    const searchOk = pickOk(data?.search?.ok, true)
    const jobsOk = pickOk(data?.jobs?.ok, true)
    const outboxOk = pickOk(data?.outbox?.ok, true)
    return { ok, dbOk, searchOk, jobsOk, outboxOk }
  }, [data])

  async function refresh() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/health`, {
        headers: { accept: 'application/json' },
      })
      const j = await res.json()
      setData(j)
    } catch {
      setError('Erreur /health')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="card-soft">
        <PageHeader
          title="Health"
          description="État de santé du backend (DB, recherche, jobs, outbox)."
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {summary ? (
                <StatusBadge kind={summary.ok ? 'success' : 'danger'}>{summary.ok ? 'OK' : 'KO'}</StatusBadge>
              ) : (
                <StatusBadge kind="neutral">—</StatusBadge>
              )}
            </div>
          }
        />

        <button
          className="btn-primary"
          disabled={loading}
          onClick={async () => {
            await refresh()
          }}
        >
          {loading ? 'Rafraîchissement…' : 'Rafraîchir'}
        </button>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        ) : null}

        {!data && !error ? <div className="mt-4 text-sm text-slate-400">Clique “Rafraîchir” pour charger l’état.</div> : null}

        {summary ? <HealthCards summary={summary} /> : null}
      </div>

      <div className="card-soft">
        <PageHeader title="Détails" description="Payload brut retourné par le backend." />
        {data ? (
          <pre className="overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-slate-200">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div className="text-sm text-slate-400">Aucun payload. Lance un rafraîchissement.</div>
        )}
      </div>
    </div>
  )
}

