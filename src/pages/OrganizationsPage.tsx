import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cleverdocs } from '../api/cleverdocs'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { TableShell } from '../components/TableShell'
import { toast } from '../components/Toast'
import { authStore } from '../lib/authStore'
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

export function OrganizationsPage() {
  const orgId = authStore.get().orgId
  const [newName, setNewName] = useState('')

  const orgsQ = useQuery({ queryKey: ['orgs'], queryFn: cleverdocs.listMyOrganizations })

  const createOrg = useMutation({
    mutationFn: async () => cleverdocs.createOrganization(newName.trim()),
    onSuccess: (o) => {
      toast({ kind: 'success', title: 'Organisation créée', message: o.name })
      setNewName('')
      orgsQ.refetch()
    },
    onError: (e) => {
      toast({ kind: 'error', title: 'Création organisation', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' })
    },
  })

  const list = useMemo(() => orgsQ.data || [], [orgsQ.data])

  return (
    <div className="grid gap-6">
      <div className="card-soft">
        <PageHeader
          title="Organisations"
          description="Sélectionne l’organisation active (header X-Org-Id) et gère tes espaces."
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link className="btn-ghost" to="/app/profile">
                Profil
              </Link>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <StatPill label="Total" value={String(list.length)} />
          <StatPill label="Active" value={String(list.filter((o) => o.status === 'active').length)} tone="good" />
          <StatPill label="Sélectionnée" value={orgId ? 'Oui' : 'Non'} tone={orgId ? 'good' : 'warn'} />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Créer une organisation</div>
              <div className="mt-0.5 text-xs text-slate-500">Tu deviens owner de l’organisation que tu crées.</div>
            </div>
            <button
              className="btn-primary"
              disabled={createOrg.isPending || newName.trim().length < 1}
              onClick={() => createOrg.mutate()}
            >
              {createOrg.isPending ? 'Création…' : 'Créer'}
            </button>
          </div>
          <div className="mt-3">
            <input className="input" placeholder="Nom de l’organisation…" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
        </div>
      </div>

      <TableShell title="Mes organisations" hint="L’organisation sélectionnée est envoyée au backend via l’en-tête X-Org-Id.">
        {orgsQ.isLoading ? <div className="text-sm text-slate-400">Chargement…</div> : null}
        {orgsQ.isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            Erreur lors du chargement de <code className="badge">/v1/organizations</code>
          </div>
        ) : null}
        {orgsQ.data?.length === 0 ? (
          <EmptyState title="Aucune organisation" description="Crée ta première organisation pour commencer à importer et rechercher des documents." />
        ) : (
          <div className="grid gap-2">
            {list.map((o) => {
              const selected = orgId === o.id
              return (
                <div
                  key={o.id}
                  className={`group flex flex-col gap-2 rounded-2xl border bg-white/5 p-4 transition md:flex-row md:items-center md:justify-between ${
                    selected ? 'border-indigo-400/30 bg-indigo-500/10' : 'border-white/10 hover:border-white/15 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 truncate text-sm font-semibold tracking-tight">{o.name}</div>
                      <span className="badge">{o.status}</span>
                      {selected ? <span className="badge">Sélectionnée</span> : null}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">{o.id}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={selected ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => {
                        authStore.setOrgId(o.id)
                        toast({ kind: 'info', title: 'Organisation sélectionnée', message: o.name })
                        globalThis.location.reload()
                      }}
                    >
                      {selected ? 'Active' : 'Utiliser'}
                    </button>
                    <Link className="btn-ghost" to={`/app/organizations/${o.id}`}>
                      Gérer
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </TableShell>
    </div>
  )
}

