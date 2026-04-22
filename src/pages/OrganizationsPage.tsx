import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cleverdocs } from '../api/cleverdocs'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { toast } from '../components/Toast'
import { authStore } from '../lib/authStore'
import { ApiError } from '../lib/api'

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
    <div className="grid gap-4">
      <div className="card-soft">
        <PageHeader
          title="Organisations"
          description="Sélectionne l’organisation active (header X-Org-Id) et gère tes espaces."
          actions={
            <Link className="btn-ghost" to="/app/profile">
              Profil
            </Link>
          }
        />
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="input"
            placeholder="Nouvelle organisation…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            className="btn-primary"
            disabled={createOrg.isPending || newName.trim().length < 1}
            onClick={() => createOrg.mutate()}
          >
            {createOrg.isPending ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>

      <div className="card-soft">
        <div className="mb-3 text-sm font-semibold text-slate-200">Mes organisations</div>
        {orgsQ.isLoading ? <div className="text-sm text-slate-400">Chargement…</div> : null}
        {orgsQ.isError ? <div className="text-sm text-red-300">Erreur /v1/organizations</div> : null}
        {orgsQ.data && orgsQ.data.length === 0 ? (
          <EmptyState
            title="Aucune organisation"
            description="Crée ta première organisation pour commencer à importer et rechercher des documents."
          />
        ) : (
          <div className="grid gap-2">
            {list.map((o) => (
              <div
                key={o.id}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{o.name}</div>
                    <span className="badge">{o.status}</span>
                    {orgId === o.id ? <span className="badge">Sélectionnée</span> : null}
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-400">{o.id}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      authStore.setOrgId(o.id)
                      toast({ kind: 'info', title: 'Organisation sélectionnée', message: o.name })
                      window.location.reload()
                    }}
                  >
                    Utiliser
                  </button>
                  <Link className="btn-ghost" to={`/app/organizations/${o.id}`}>
                    Gérer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

