import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'

export function HealthPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="card-soft">
      <PageHeader title="Health" description="État de santé du backend (DB, recherche, jobs, outbox)." />
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-primary"
          onClick={async () => {
            setError(null)
            try {
              const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/health`, {
                headers: { accept: 'application/json' },
              })
              const j = await res.json()
              setData(j)
            } catch {
              setError('Erreur /health')
            }
          }}
        >
          Rafraîchir
        </button>
      </div>
      {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
      {data ? (
        <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-slate-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <div className="mt-4 text-sm text-slate-400">Clique “Rafraîchir”.</div>
      )}
    </div>
  )
}

