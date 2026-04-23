import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cleverdocs } from '../api/cleverdocs'
import { toast } from '../components/Toast'
import { ApiError } from '../lib/api'
import { authStore } from '../lib/authStore'

export function AcceptInvitationPage() {
  const [token, setToken] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLoggedIn = !!authStore.get().accessToken

  useEffect(() => {
    const qs = new URLSearchParams(globalThis.location.search)
    const t = qs.get('token')
    if (t && t.trim().length >= 10) setToken(t.trim())
  }, [])

  const can = useMemo(() => {
    if (busy) return false
    if (token.trim().length < 20) return false
    if (isLoggedIn) return true
    return password.length >= 8
  }, [busy, token, password, isLoggedIn])

  const canDecline = useMemo(() => !busy && token.trim().length >= 20, [busy, token])

  function humanizeAcceptError(e: unknown): string {
    if (!(e instanceof ApiError)) return 'Erreur inconnue.'
    const d = e.detail
    if (d === 'INVITATION_NOT_FOUND') return "Invitation introuvable. Vérifie le lien / token."
    if (d === 'INVITATION_REVOKED') return 'Cette invitation a été révoquée.'
    if (d === 'INVITATION_ALREADY_ACCEPTED') return 'Cette invitation a déjà été acceptée.'
    if (d === 'INVITATION_EXPIRED') return 'Cette invitation a expiré.'
    if (d === 'INVITATION_EMAIL_MISMATCH') return "Cette invitation ne correspond pas à l'email de ton compte."
    if (e.status === 401) return 'Tu dois être connecté.'
    if (e.status === 403) return 'Action non autorisée.'
    if (e.status >= 500) return 'Le serveur a rencontré un problème. Réessaie.'
    return `Erreur (${e.status})`
  }

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-lg">
        <div className="card">
          <div className="mb-1 text-lg font-semibold">Accepter une invitation</div>
          <div className="mb-6 text-sm text-slate-400">
            {isLoggedIn
              ? 'Tu es connecté. Accepte pour rejoindre l’organisation avec ce compte.'
              : 'Colle le token et définis ton mot de passe (min 8 caractères).'}
          </div>
          <div className="space-y-4">
            <div>
              <div className="label mb-1">Token</div>
              <textarea className="input min-h-[92px]" value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            {!isLoggedIn ? (
              <>
                <div>
                  <div className="label mb-1">Nom (optionnel)</div>
                  <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div>
                  <div className="label mb-1">Mot de passe</div>
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </>
            ) : null}
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            <button
              className="btn-primary w-full"
              disabled={!can}
              onClick={async () => {
                setError(null)
                try {
                  setBusy(true)
                  if (isLoggedIn) {
                    await cleverdocs.acceptInvitationLoggedIn(token.trim())
                    toast({ kind: 'success', title: 'Invitation acceptée', message: 'Organisation ajoutée à ton compte.' })
                  } else {
                    await cleverdocs.acceptInvitation(token.trim(), password, displayName.trim() || undefined)
                    toast({ kind: 'success', title: 'Invitation acceptée', message: 'Tu peux maintenant te connecter.' })
                  }
                } catch (e) {
                  setError(humanizeAcceptError(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Validation…' : 'Accepter'}
            </button>
            <button
              className="btn-secondary w-full"
              disabled={!canDecline}
              onClick={async () => {
                setError(null)
                try {
                  setBusy(true)
                  await cleverdocs.declineInvitation(token.trim())
                  toast({ kind: 'success', title: 'Invitation déclinée', message: 'Tu peux fermer cette page.' })
                } catch (e) {
                  setError(humanizeAcceptError(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Traitement…' : 'Décliner'}
            </button>
            <div className="text-xs text-slate-500">
              <Link className="link" to="/login">
                Retour connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

