import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cleverdocs } from '../api/cleverdocs'
import { ConfirmButton } from '../components/ConfirmButton'
import { toast } from '../components/Toast'
import { ApiError } from '../lib/api'
import { authStore } from '../lib/authStore'

export function OrganizationDetailPage() {
  const { organizationId } = useParams()
  if (!organizationId) return null

  useEffect(() => {
    const cur = authStore.get().orgId
    if (cur !== organizationId) authStore.setOrgId(organizationId)
  }, [organizationId])

  const orgQ = useQuery({ queryKey: ['org', organizationId], queryFn: () => cleverdocs.getOrganization(organizationId) })
  const membersQ = useQuery({
    queryKey: ['members', organizationId],
    queryFn: () => cleverdocs.listMembers(organizationId),
  })

  const [name, setName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [transferTo, setTransferTo] = useState('')

  const updateOrg = useMutation({
    mutationFn: async () => cleverdocs.updateOrganization(organizationId, name.trim()),
    onSuccess: (o) => {
      toast({ kind: 'success', title: 'Organisation modifiée', message: o.name })
      orgQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Update org', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const addMember = useMutation({
    mutationFn: async () => cleverdocs.addMember(organizationId, { user_email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Membre ajouté' })
      setInviteEmail('')
      membersQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Ajout membre', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const transfer = useMutation({
    mutationFn: async () => cleverdocs.transferOwnership(organizationId, transferTo.trim()),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Ownership transféré' })
      setTransferTo('')
      membersQ.refetch()
      orgQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Transfer ownership', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const suspendOrg = useMutation({
    mutationFn: async () => cleverdocs.suspendOrganization(organizationId),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Organisation suspendue' })
      orgQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Suspend org', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const activateOrg = useMutation({
    mutationFn: async () => cleverdocs.activateOrganization(organizationId),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Organisation activée' })
      orgQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Activate org', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const delOrg = useMutation({
    mutationFn: async () => cleverdocs.deleteOrganization(organizationId),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Organisation supprimée (soft)' })
      window.location.assign('/app/organizations')
    },
    onError: (e) => toast({ kind: 'error', title: 'Delete org', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const members = useMemo(() => membersQ.data || [], [membersQ.data])

  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{orgQ.data?.name || 'Organisation'}</div>
            <div className="mt-1 text-xs text-slate-400">{organizationId}</div>
          </div>
          <Link className="btn-ghost" to="/app/organizations">
            Retour
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input className="input" placeholder="Nouveau nom…" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary" disabled={updateOrg.isPending || name.trim().length < 1} onClick={() => updateOrg.mutate()}>
            {updateOrg.isPending ? '…' : 'Renommer'}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ConfirmButton
            className="btn-ghost"
            confirmText="Suspendre cette organisation ?"
            onConfirm={async () => {
              await suspendOrg.mutateAsync()
            }}
          >
            Suspendre
          </ConfirmButton>
          <button className="btn-ghost" disabled={activateOrg.isPending} onClick={() => activateOrg.mutate()}>
            Activer
          </button>
          <ConfirmButton
            className="btn-ghost"
            confirmText="Supprimer (soft) cette organisation ?"
            onConfirm={async () => {
              await delOrg.mutateAsync()
            }}
          >
            Supprimer
          </ConfirmButton>
        </div>
      </div>

      <div className="card">
        <div className="mb-2 text-lg font-semibold">Membres</div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="label mb-1">Email</div>
            <input className="input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@exemple.com" />
          </div>
          <div>
            <div className="label mb-1">Rôle</div>
            <select className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="reader">reader</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <button className="btn-primary" disabled={addMember.isPending || inviteEmail.trim().length < 3} onClick={() => addMember.mutate()}>
            {addMember.isPending ? '…' : 'Ajouter / réactiver'}
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {membersQ.isLoading ? <div className="text-sm text-slate-400">Chargement…</div> : null}
          {membersQ.isError ? <div className="text-sm text-red-300">Erreur /members</div> : null}
          {members.map((m) => (
            <MemberRow key={m.id} organizationId={organizationId} membership={m} onChanged={() => membersQ.refetch()} />
          ))}
          {membersQ.data && membersQ.data.length === 0 ? <div className="text-sm text-slate-400">Aucun membre.</div> : null}
        </div>
      </div>

      <div className="card">
        <div className="mb-2 text-lg font-semibold">Transfert ownership</div>
        <div className="text-sm text-slate-400">
          Renseigne le <code className="badge">user_id</code> du nouveau owner.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="input max-w-lg" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder="new_owner_user_id" />
          <ConfirmButton
            className="btn-primary"
            confirmText="Transférer l'ownership ?"
            onConfirm={async () => {
              await transfer.mutateAsync()
            }}
          >
            Transférer
          </ConfirmButton>
        </div>
      </div>
    </div>
  )
}

function MemberRow(props: { organizationId: string; membership: any; onChanged: () => void }) {
  const m = props.membership
  const [role, setRole] = useState(m.role)

  const upd = useMutation({
    mutationFn: async () => cleverdocs.updateMember(props.organizationId, m.id, { role }),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Membre mis à jour' })
      props.onChanged()
    },
    onError: (e) => toast({ kind: 'error', title: 'Update member', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const suspend = useMutation({
    mutationFn: async () => cleverdocs.suspendMember(props.organizationId, m.id),
    onSuccess: () => props.onChanged(),
    onError: (e) => toast({ kind: 'error', title: 'Suspend member', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const activate = useMutation({
    mutationFn: async () => cleverdocs.activateMember(props.organizationId, m.id),
    onSuccess: () => props.onChanged(),
    onError: (e) => toast({ kind: 'error', title: 'Activate member', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const remove = useMutation({
    mutationFn: async () => cleverdocs.removeMember(props.organizationId, m.id),
    onSuccess: () => props.onChanged(),
    onError: (e) => toast({ kind: 'error', title: 'Remove member', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{m.status}</span>
            <span className="badge">role: {m.role}</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">membership_id: {m.id}</div>
          <div className="mt-1 text-xs text-slate-400">user_id: {m.user_id}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-[180px]" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="reader">reader</option>
          </select>
          <button className="btn-ghost" disabled={upd.isPending} onClick={() => upd.mutate()}>
            {upd.isPending ? '…' : 'Appliquer rôle'}
          </button>
          <button className="btn-ghost" disabled={suspend.isPending} onClick={() => suspend.mutate()}>
            Suspendre
          </button>
          <button className="btn-ghost" disabled={activate.isPending} onClick={() => activate.mutate()}>
            Activer
          </button>
          <ConfirmButton
            className="btn-ghost"
            confirmText="Retirer ce membre ?"
            onConfirm={async () => {
              await remove.mutateAsync()
            }}
          >
            Retirer
          </ConfirmButton>
        </div>
      </div>
    </div>
  )
}

