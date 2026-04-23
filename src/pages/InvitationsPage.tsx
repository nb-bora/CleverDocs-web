import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { cleverdocs, type InvitationOut, type UserOut } from '../api/cleverdocs'
import { ConfirmButton } from '../components/ConfirmButton'
import { DropdownItem, DropdownMenu } from '../components/DropdownMenu'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { TableShell } from '../components/TableShell'
import { toast } from '../components/Toast'
import { ApiError } from '../lib/api'
import { authStore } from '../lib/authStore'
import { useDebouncedValue } from '../lib/useDebouncedValue'

function isEmailLike(v: string) {
  const s = v.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function tokenFromAcceptUrl(acceptUrl: string): string | null {
  try {
    const u = new URL(acceptUrl, globalThis.location.origin)
    const t = u.searchParams.get('token')
    return t && t.length >= 10 ? t : null
  } catch {
    return null
  }
}

export function InvitationsPage() {
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query.trim(), 150)
  const [role, setRole] = useState<'member' | 'admin' | 'reader'>('member')
  const [selectedUser, setSelectedUser] = useState<UserOut | null>(null)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'accepted' | 'expired' | 'revoked' | 'declined'>('pending')
  const orgId = authStore.get().orgId

  const isEmail = useMemo(() => isEmailLike(query), [query])

  const orgsQ = useQuery({
    queryKey: ['orgs.mine'],
    queryFn: cleverdocs.listMyOrganizations,
    enabled: !orgId,
  })

  useEffect(() => {
    if (orgId) return
    const first = orgsQ.data?.[0]
    if (first?.id) authStore.setOrgId(first.id)
  }, [orgId, orgsQ.data])

  const directoryQ = useQuery({
    queryKey: ['users.directory', debounced],
    queryFn: async () => cleverdocs.directory(debounced, 8),
    enabled: tab === 'sent' && debounced.length >= 1 && !isEmail && !selectedUser,
  })

  const receivedQ = useQuery({
    queryKey: ['invitations.received', statusFilter],
    queryFn: async () => cleverdocs.listReceivedInvitations({ status: statusFilter, limit: 100 }),
  })

  const sentQ = useQuery({
    queryKey: ['invitations.sent', statusFilter, orgId],
    queryFn: async () => cleverdocs.listInvitations({ status: statusFilter, limit: 100 }),
    enabled: tab === 'sent',
  })

  const inviteByEmail = useMutation({
    mutationFn: async () => {
      const email = (selectedUser?.email || query).trim().toLowerCase()
      return cleverdocs.createInvitation(email, role)
    },
    onSuccess: async (r) => {
      const link = `${globalThis.location.origin}${r.accept_url}`
      await navigator.clipboard.writeText(link)
      toast({ kind: 'success', title: 'Invitation créée', message: 'Lien copié dans le presse-papiers.' })
      setSelectedUser(null)
      setQuery('')
      sentQ.refetch()
    },
    onError: (e: unknown) => {
      const detail = e instanceof ApiError ? e.detail : null
      const code = detail && typeof detail === 'object' && 'detail' in detail ? (detail as any).detail : detail
      if (code === 'INVITATION_ALREADY_PENDING') {
        toast({ kind: 'error', title: 'Invitation', message: 'Une invitation est déjà en attente pour cet email.' })
        return
      }
      if (code === 'SELF_INVITE_FORBIDDEN') {
        toast({ kind: 'error', title: 'Invitation', message: 'Tu ne peux pas t’inviter toi‑même.' })
        return
      }
      toast({ kind: 'error', title: 'Invitation', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' })
    },
  })

  const revoke = useMutation({
    mutationFn: async (invitationId: string) => cleverdocs.revokeInvitation(invitationId),
    onSuccess: () => sentQ.refetch(),
    onError: (e) => toast({ kind: 'error', title: 'Révoquer', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const resend = useMutation({
    mutationFn: async (invitationId: string) => cleverdocs.resendInvitation(invitationId),
    onSuccess: async (r) => {
      const link = `${globalThis.location.origin}${r.accept_url}`
      await navigator.clipboard.writeText(link)
      toast({ kind: 'success', title: 'Lien régénéré', message: 'Lien copié dans le presse-papiers.' })
      sentQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Renvoyer', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const actOnReceived = useMutation({
    mutationFn: async (args: { invitationId: string; action: 'accept' | 'decline' | 'copy' }) => {
      const r = await cleverdocs.issueInvitationToken(args.invitationId)
      const token = tokenFromAcceptUrl(r.accept_url)
      if (!token) throw new ApiError(500, 'Invalid accept_url', r)

      if (args.action === 'copy') {
        const link = `${globalThis.location.origin}${r.accept_url}`
        await navigator.clipboard.writeText(link)
        return { kind: 'copy' as const }
      }
      if (args.action === 'accept') {
        await cleverdocs.acceptInvitationLoggedIn(token)
        return { kind: 'accept' as const }
      }
      await cleverdocs.declineInvitation(token)
      return { kind: 'decline' as const }
    },
    onSuccess: async (r) => {
      if (r.kind === 'copy') toast({ kind: 'success', title: 'Lien copié', message: 'Lien d’acceptation copié.' })
      if (r.kind === 'accept') toast({ kind: 'success', title: 'Invitation acceptée', message: 'Tu as rejoint l’organisation.' })
      if (r.kind === 'decline') toast({ kind: 'success', title: 'Invitation refusée', message: 'Invitation refusée.' })
      await receivedQ.refetch()
      await orgsQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Invitations', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const canInvite = selectedUser != null || isEmail

  const suggestions = (directoryQ.data || []).filter((u) => u.id !== selectedUser?.id)

  const renderInvRow = (inv: InvitationOut) => (
    <div key={inv.id} className="grid items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[1.6fr_.7fr_.8fr_auto]">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{inv.email}</div>
        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="badge">{inv.role}</span>
          <span className="badge">{inv.status}</span>
          {inv.expires_at ? <span className="badge">expire: {new Date(inv.expires_at).toLocaleString()}</span> : null}
        </div>
      </div>
      <div className="text-xs text-slate-500">
        {inv.created_at ? <span>créée: {new Date(inv.created_at).toLocaleString()}</span> : <span>—</span>}
      </div>
      <div className="text-xs text-slate-500">{inv.created_by_user_id ? <span>par: {inv.created_by_user_id}</span> : <span />}</div>
      <div className="flex justify-end gap-2">
        <ConfirmButton
          className="btn-secondary"
          confirmText="Régénérer un lien d’invitation ? (l’ancien lien ne fonctionnera plus)"
          onConfirm={async () => {
            await resend.mutateAsync(inv.id)
          }}
        >
          Copier lien
        </ConfirmButton>
        <DropdownMenu label="Actions" buttonClassName="btn-ghost" align="right">
          <DropdownItem
            onClick={() => {
              resend.mutate(inv.id)
            }}
          >
            Renvoyer / régénérer
          </DropdownItem>
          <DropdownItem
            tone="danger"
            onClick={() => {
              revoke.mutate(inv.id)
            }}
          >
            Révoquer
          </DropdownItem>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="grid gap-6 isolate">
      <div className="card-soft relative z-20">
        <PageHeader
          title="Invitations"
          description="Invite des personnes comme sur GitHub/Slack: recherche, invitation en 1 clic, suivi et actions (copier lien, révoquer, renvoyer)."
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={tab === 'received' ? 'btn-secondary' : 'btn-ghost'}
            onClick={() => setTab('received')}
          >
            Reçues
          </button>
          <button
            type="button"
            className={tab === 'sent' ? 'btn-secondary' : 'btn-ghost'}
            onClick={() => setTab('sent')}
          >
            Envoyées
          </button>
        </div>

        {tab === 'sent' ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
              <div className="relative">
                <div className="label mb-1">Inviter</div>
                {selectedUser ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <span className="badge">@{selectedUser.username || selectedUser.email}</span>
                    <span className="text-xs text-slate-400">{selectedUser.email}</span>
                    <button className="btn-ghost ml-auto" onClick={() => setSelectedUser(null)}>
                      Changer
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      className="input"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Tape un @username, un nom, ou un email…"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {debounced && !isEmail && suggestions.length > 0 ? (
                      <div className="absolute z-50 mt-2 w-full overflow-auto rounded-2xl border border-white/10 bg-[hsl(var(--soft-bg)/0.98)] shadow-2xl max-h-80">
                        {suggestions.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-white/5"
                            onClick={() => {
                              setSelectedUser(u)
                              setQuery('')
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{u.username ? `@${u.username}` : u.email}</div>
                              <div className="truncate text-xs text-slate-400">{u.display_name || u.email}</div>
                            </div>
                            <span className="badge">{u.status}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {debounced && !isEmail && directoryQ.isFetching ? (
                      <div className="mt-2 text-xs text-slate-500">Recherche…</div>
                    ) : null}
                    {debounced && !isEmail && directoryQ.isError ? (
                      <div className="mt-2 text-xs text-amber-200/90">
                        {directoryQ.error instanceof ApiError && directoryQ.error.status === 403
                          ? 'Droits insuffisants: seuls les admins peuvent inviter des utilisateurs.'
                          : 'Impossible de charger l’annuaire.'}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div>
                <div className="label mb-1">Rôle</div>
                <select className="input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                  <option value="reader">reader</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  className="btn-primary"
                  disabled={!canInvite || inviteByEmail.isPending || (!isEmail && selectedUser == null)}
                  onClick={() => {
                    inviteByEmail.mutate()
                  }}
                >
                  {inviteByEmail.isPending ? 'Invitation…' : 'Inviter'}
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Pour les invitations par email, un lien d’acceptation est généré et copié automatiquement.
            </div>
            {sentQ.isError && sentQ.error instanceof ApiError && sentQ.error.status === 403 ? (
              <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100/90">
                Droits insuffisants: seuls les admins peuvent voir et envoyer des invitations.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative z-0">
        <TableShell
          title={tab === 'received' ? 'Invitations reçues' : 'Invitations envoyées'}
          hint="Suivi des invitations. Pour copier un lien, on régénère un lien (sécurisé) et on le copie."
          right={
            <div className="flex items-center gap-2">
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="pending">pending</option>
                <option value="accepted">accepted</option>
                <option value="expired">expired</option>
                <option value="revoked">revoked</option>
                <option value="declined">declined</option>
              </select>
              <button
                className="btn-ghost"
                onClick={() => {
                  if (tab === 'received') receivedQ.refetch()
                  else sentQ.refetch()
                }}
              >
                Rafraîchir
              </button>
            </div>
          }
        >
          {(tab === 'received' ? receivedQ.isLoading : sentQ.isLoading) ? (
            <div className="text-sm text-slate-400">Chargement…</div>
          ) : null}

          {(tab === 'received' ? receivedQ.isError : sentQ.isError) ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              Impossible de charger les invitations.
            </div>
          ) : null}

          {tab === 'received' && receivedQ.data && receivedQ.data.length === 0 ? (
            <EmptyState title="Aucune invitation" description="Tu n’as reçu aucune invitation pour le moment." />
          ) : null}

          {tab === 'sent' && sentQ.data && sentQ.data.length === 0 ? (
            <EmptyState title="Aucune invitation" description="Crée une invitation pour la voir apparaître ici." />
          ) : null}

          {tab === 'sent' && sentQ.data && sentQ.data.length > 0 ? <div className="grid gap-2">{sentQ.data.map(renderInvRow)}</div> : null}

          {tab === 'received' && receivedQ.data && receivedQ.data.length > 0 ? (
            <div className="grid gap-2">
              {receivedQ.data.map((inv) => (
                <div
                  key={inv.id}
                  className="grid items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[1.4fr_.8fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {inv.organization_name ? `${inv.organization_name} · ` : ''}
                      {inv.email}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="badge">{inv.role}</span>
                      <span className="badge">{inv.status}</span>
                      {inv.expires_at ? <span className="badge">expire: {new Date(inv.expires_at).toLocaleString()}</span> : null}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {inv.created_at ? <span>créée: {new Date(inv.created_at).toLocaleString()}</span> : <span>—</span>}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn-secondary"
                      disabled={actOnReceived.isPending || inv.status !== 'pending'}
                      onClick={() => actOnReceived.mutate({ invitationId: inv.id, action: 'copy' })}
                    >
                      Copier lien
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={actOnReceived.isPending || inv.status !== 'pending'}
                      onClick={() => actOnReceived.mutate({ invitationId: inv.id, action: 'decline' })}
                    >
                      Refuser
                    </button>
                    <button
                      className="btn-primary"
                      disabled={actOnReceived.isPending || inv.status !== 'pending'}
                      onClick={() => actOnReceived.mutate({ invitationId: inv.id, action: 'accept' })}
                    >
                      Accepter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </TableShell>
      </div>
    </div>
  )
}

