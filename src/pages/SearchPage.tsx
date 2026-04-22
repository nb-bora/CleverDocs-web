import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { cleverdocs } from '../api/cleverdocs'
import { PageHeader } from '../components/PageHeader'
import { TableShell } from '../components/TableShell'
import { toast } from '../components/Toast'
import { ApiError } from '../lib/api'

export function SearchPage() {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'org' | 'mine'>('org')

  const search = useMutation({
    mutationFn: async () => (mode === 'mine' ? cleverdocs.searchMine(q.trim()) : cleverdocs.search(q.trim())),
    onError: (e) => toast({ kind: 'error', title: 'Search', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  return (
    <div className="grid gap-4">
      <div className="card-soft">
        <PageHeader
          title="Recherche"
          description="Recherche dans l’org sélectionnée, ou dans tous tes documents (multi-org) via /v1/search/mine."
        />
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recherche…" />
          <select className="input md:w-[220px]" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="org">Dans l’organisation</option>
            <option value="mine">Mes docs (toutes orgs)</option>
          </select>
          <button className="btn-primary" disabled={search.isPending || q.trim().length < 1} onClick={() => search.mutate()}>
            {search.isPending ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
      </div>

      <TableShell title="Résultats" hint="Top 25 résultats (OpenSearch si dispo, sinon fallback SQL/FTS).">
        {search.data ? (
          <div className="grid gap-2">
            {search.data.results.map((r) => (
              <div key={r.document_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{r.filename}</div>
                  <span className="badge">score: {r.score.toFixed(2)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">document_id: {r.document_id}</div>
                {r.preview ? <div className="mt-3 text-sm text-slate-200/90">{r.preview}</div> : null}
              </div>
            ))}
            {search.data.results.length === 0 ? <div className="text-sm text-slate-400">Aucun résultat.</div> : null}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Lance une recherche.</div>
        )}
      </TableShell>
    </div>
  )
}

