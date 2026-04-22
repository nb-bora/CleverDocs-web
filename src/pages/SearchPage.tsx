import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { cleverdocs } from '../api/cleverdocs'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { TableShell } from '../components/TableShell'
import { toast } from '../components/Toast'
import { ApiError } from '../lib/api'

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

export function SearchPage() {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'org' | 'mine'>('org')

  const search = useMutation({
    mutationFn: async () => (mode === 'mine' ? cleverdocs.searchMine(q.trim()) : cleverdocs.search(q.trim())),
    onError: (e) => toast({ kind: 'error', title: 'Search', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  return (
    <div className="grid gap-6">
      <div className="card-soft">
        <PageHeader
          title="Recherche"
          description="Recherche dans l’org sélectionnée, ou dans tous tes documents (multi-org) via /v1/search/mine."
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatPill label="Mode" value={mode === 'org' ? 'Organisation' : 'Mes docs'} />
          <StatPill
            label="Résultats"
            value={search.data ? String(search.data.results.length) : '—'}
            tone={search.data && search.data.results.length > 0 ? 'good' : 'neutral'}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mots-clés… (ex: facture, pharmacie, index)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && q.trim().length >= 1 && !search.isPending) search.mutate()
              }}
            />
            <select className="input md:w-[240px]" value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="org">Dans l’organisation</option>
              <option value="mine">Mes docs (toutes orgs)</option>
            </select>
            <button className="btn-primary" disabled={search.isPending || q.trim().length < 1} onClick={() => search.mutate()}>
              {search.isPending ? 'Recherche…' : 'Rechercher'}
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {mode === 'org' ? (
              <span>
                Scope: <code className="badge">/v1/search</code> (org active via <code className="badge">X-Org-Id</code>)
              </span>
            ) : (
              <span>
                Scope: <code className="badge">/v1/search/mine</code> (toutes tes orgs + uniquement tes uploads)
              </span>
            )}
          </div>
        </div>
      </div>

      <TableShell title="Résultats" hint="Top 25 résultats (OpenSearch si dispo, sinon fallback SQL/FTS).">
        {search.isPending ? (
          <div className="grid gap-2">
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : null}
        {search.data ? (
          <div className="grid gap-2">
            {search.data.results.map((r) => (
              <div
                key={r.document_id}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate text-sm font-semibold tracking-tight">{r.filename}</div>
                  <span className="badge">score: {r.score.toFixed(2)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  document_id: <span className="text-slate-400">{r.document_id}</span>
                </div>
                {r.preview ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200/90">
                    {r.preview}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-400">Aucun extrait disponible.</div>
                )}
              </div>
            ))}
            {search.data.results.length === 0 ? (
              <EmptyState title="Aucun résultat" description="Essaie d’autres mots-clés ou change de scope (Organisation / Mes docs)." />
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-slate-400">Lance une recherche pour afficher des résultats.</div>
        )}
      </TableShell>
    </div>
  )
}

