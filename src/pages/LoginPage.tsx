import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiLogin, ApiError } from '../lib/api'
import { toast } from '../components/Toast'

function IconMail(props: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} fill="none" aria-hidden="true">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 7.5 12 12l5.5-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconLock(props: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8.5a4.5 4.5 0 1 1 9 0V10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.5 10h11A2.5 2.5 0 0 1 20 12.5v5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-5A2.5 2.5 0 0 1 6.5 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function IconEye(props: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function LoginPage() {
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null | undefined)?.from || '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const can = email.trim().length > 2 && password.length >= 8 && !busy

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {/* grid background */}
        <div className="absolute inset-0 opacity-[0.45] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:64px_64px]" />
        {/* soft gradients */}
        <div className="absolute -left-48 -top-52 h-[520px] w-[520px] rounded-full bg-indigo-500/18 blur-3xl" />
        <div className="absolute -bottom-60 right-[-140px] h-[640px] w-[640px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent_55%)]" />
      </div>

      <div className="container-page relative flex min-h-[calc(100vh-0px)] items-center justify-center py-14">
        <div className="w-full max-w-md">
          {/* brand header (like reference) */}
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-lg shadow-black/20">
              <img src="/logo.png" alt="CleverDocs" className="h-10 w-10 object-contain" />
            </div>
            <div className="mt-3 text-xl font-semibold tracking-tight text-slate-100">CleverDocs</div>
            <div className="mt-1 text-sm text-slate-300/80">Système d'archivage multi-organisation</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/7 p-6 shadow-xl shadow-black/25 backdrop-blur">
            <div className="text-center">
              <div className="text-lg font-semibold">Connexion</div>
              <div className="mt-1 text-sm text-slate-400">Identifiez-vous pour accéder au tableau de bord.</div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <div className="label mb-1">Adresse e-mail</div>
                <div className="relative">
                  <IconMail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="label mb-1">Mot de passe</div>
                <div className="relative">
                  <IconLock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-10 pr-10"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    <IconEye className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    className="text-xs text-slate-300 hover:text-white"
                    onClick={() =>
                      toast({
                        kind: 'info',
                        title: 'Mot de passe oublié',
                        message: 'Le flow reset n’est pas encore implémenté côté backend.',
                      })
                    }
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                className="btn-primary w-full rounded-2xl py-2.5 text-[15px]"
                disabled={!can}
                onClick={async () => {
                  setError(null)
                  try {
                    setBusy(true)
                    await apiLogin(email.trim().toLowerCase(), password)
                    toast({ kind: 'success', title: 'Connecté', message: 'Bienvenue.' })
                    globalThis.location.assign(from)
                  } catch (e) {
                    if (e instanceof ApiError) {
                      setError(`Erreur (${e.status}). Vérifie tes identifiants.`)
                    } else {
                      setError('Erreur inconnue')
                    }
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? 'Connexion…' : 'Se connecter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

