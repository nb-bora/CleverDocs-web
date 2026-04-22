import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { cleverdocs } from '../api/cleverdocs'
import { PageHeader } from '../components/PageHeader'
import { TableShell } from '../components/TableShell'
import { toast } from '../components/Toast'
import { ApiError } from '../lib/api'

export function InvitationsPage() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [token, setToken] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: async () => cleverdocs.createInvitation(email.trim().toLowerCase(), role),
    onSuccess: (r: any) => {
      setToken(r.token)
      toast({ kind: 'success', title: 'Invitation créée', message: r.invitation.email })
    },
    onError: (e: unknown) =>
      toast({
        kind: 'error',
        title: 'Create invitation',
        message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur',
      }),
  })

  return (
    <div className="grid gap-4">
      <div className="card-soft">
        <PageHeader
          title="Invitations"
          description="Créer et partager un token. (Le backend ne liste pas encore les invitations, donc on affiche le token créé.)"
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="label mb-1">Email</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@exemple.com" />
          </div>
          <div>
            <div className="label mb-1">Rôle</div>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="reader">reader</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn-primary" disabled={create.isPending || email.trim().length < 3} onClick={() => create.mutate()}>
            {create.isPending ? 'Création…' : 'Créer invitation'}
          </button>
          {token ? (
            <button
              className="btn-ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(token)
                toast({ kind: 'success', title: 'Copié', message: 'Token copié dans le presse-papiers.' })
              }}
            >
              Copier token
            </button>
          ) : null}
        </div>
      </div>

      <TableShell title="Token" hint="À fournir à l’utilisateur (page Accept invitation).">
        {token ? (
          <div className="grid gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-slate-200 break-all">{token}</div>
            <div className="text-xs text-slate-400">
              L’utilisateur doit aller sur <code className="badge">/accept-invitation</code> et coller ce token.
            </div>
            <div className="text-xs text-slate-500">
              Note: pour révoquer via backend, il faut l’<code className="badge">invitation_id</code> (non exposé ici car l’API ne liste
              pas encore les invitations).
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">Crée une invitation pour afficher un token.</div>
        )}
      </TableShell>
    </div>
  )
}

