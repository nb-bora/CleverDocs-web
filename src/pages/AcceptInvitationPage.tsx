import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cleverdocs } from '../api/cleverdocs'
import { toast } from '../components/Toast'
import { ApiError } from '../lib/api'

export function AcceptInvitationPage() {
  const [token, setToken] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const can = token.trim().length >= 20 && password.length >= 8 && !busy

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-lg">
        <div className="card">
          <div className="mb-1 text-lg font-semibold">Accepter une invitation</div>
          <div className="mb-6 text-sm text-slate-400">
            Colle le token et définis ton mot de passe (min 8 caractères).
          </div>
          <div className="space-y-4">
            <div>
              <div className="label mb-1">Token</div>
              <textarea className="input min-h-[92px]" value={token} onChange={(e) => setToken(e.target.value)} />
            </div>
            <div>
              <div className="label mb-1">Nom (optionnel)</div>
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <div className="label mb-1">Mot de passe</div>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
            <button
              className="btn-primary w-full"
              disabled={!can}
              onClick={async () => {
                setError(null)
                try {
                  setBusy(true)
                  await cleverdocs.acceptInvitation(token.trim(), password, displayName.trim() || undefined)
                  toast({ kind: 'success', title: 'Invitation acceptée', message: 'Tu peux maintenant te connecter.' })
                } catch (e) {
                  if (e instanceof ApiError) setError(`Erreur (${e.status})`)
                  else setError('Erreur inconnue')
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Validation…' : 'Accepter'}
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

