import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { cleverdocs } from '../api/cleverdocs'
import { PageHeader } from '../components/PageHeader'
import { toast } from '../components/Toast'
import { ApiError, buildAuthHeaders } from '../lib/api'
import { useDebouncedValue } from '../lib/useDebouncedValue'

function SkeletonLine({ w = 'w-40' }: Readonly<{ w?: string }>) {
  return <div className={`h-4 ${w} animate-pulse rounded bg-white/5`} />
}

function humanizeApiError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Une erreur est survenue. Réessaie.'
  if (e.status === 0) return 'Impossible de contacter le serveur. Vérifie ta connexion.'
  if (e.status === 400) return 'Requête invalide. Vérifie les champs puis réessaie.'
  if (e.status === 401) return 'Ta session a expiré. Reconnecte-toi puis réessaie.'
  if (e.status === 403) return 'Action non autorisée.'
  if (e.status === 413) return 'Fichier trop volumineux.'
  if (e.status >= 500) return 'Le serveur a rencontré un problème. Réessaie dans un instant.'

  const detail = e.detail
  if (detail === 'CURRENT_PASSWORD_INCORRECT') return 'Mot de passe actuel incorrect.'
  if (detail === 'PASSWORD_NOT_SET') return 'Aucun mot de passe n’est défini sur ce compte.'
  if (detail === 'PASSWORD_SAME_AS_CURRENT') return 'Le nouveau mot de passe doit être différent de l’actuel.'
  if (typeof detail === 'string' && detail.trim()) return detail
  if (detail && typeof detail === 'object' && 'detail' in (detail as any) && typeof (detail as any).detail === 'string') {
    return String((detail as any).detail)
  }
  return 'Une erreur est survenue. Réessaie.'
}

function EyeIcon({ slashed }: Readonly<{ slashed: boolean }>) {
  return slashed ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.4 6.6C4.3 8.2 3 10.5 3 12c0 0 3.2 7 9 7 1.8 0 3.4-.6 4.8-1.5M9.2 5.2C10.1 5 11 5 12 5c5.8 0 9 7 9 7 0 1.1-.7 2.9-2.2 4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M3 12s3.2-7 9-7 9 7 9 7-3.2 7-9 7-9-7-9-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function validateUsernameGitHubLike(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
  const u = raw.trim()
  if (!u) return { ok: false, reason: 'Choisis un nom d’utilisateur.' }
  if (u.length > 39) return { ok: false, reason: '39 caractères maximum.' }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/.test(u)) {
    return { ok: false, reason: 'Utilise uniquement a-z, 0-9 et - (pas de - au début/fin).' }
  }
  if (u.includes('--')) return { ok: false, reason: 'Évite les doubles tirets (--)' }
  return { ok: true, value: u }
}

export function ProfilePage() {
  const meQ = useQuery({ queryKey: ['me'], queryFn: cleverdocs.me })
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    let active = true
    let urlToRevoke: string | null = null

    async function load() {
      setAvatarBlobUrl(null)
      if (!meQ.data?.avatar_storage_key) return
      try {
        const res = await fetch(cleverdocs.avatarUrl(), { headers: buildAuthHeaders() })
        if (!res.ok) return
        const blob = await res.blob()
        urlToRevoke = URL.createObjectURL(blob)
        if (active) setAvatarBlobUrl(urlToRevoke)
      } catch {
        // ignore
      }
    }

    void load()
    return () => {
      active = false
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke)
    }
  }, [meQ.data?.avatar_storage_key])

  useEffect(() => {
    if (!meQ.data) return
    setUsername(meQ.data.username || '')
  }, [meQ.data?.username])

  useEffect(() => {
    if (!meQ.data) return
    setDisplayName(meQ.data.display_name || '')
  }, [meQ.data?.display_name])

  const passwordOk = cur.length >= 8 && next.length >= 8
  const uname = validateUsernameGitHubLike(username)
  const curUsername = meQ.data?.username || ''
  const needsCheck = useMemo(() => uname.ok && uname.value !== curUsername, [uname, curUsername])
  const debouncedUname = useDebouncedValue(uname.ok ? uname.value : '', 250)

  const unameAvailQ = useQuery({
    queryKey: ['username.available', debouncedUname],
    queryFn: async () => cleverdocs.usernameAvailable(debouncedUname),
    enabled: !!debouncedUname && needsCheck,
  })

  const isAvailable = !needsCheck ? true : (unameAvailQ.data?.available ?? false)

  const saveUsername = useMutation({
    mutationFn: async () => {
      if (!uname.ok) throw new ApiError(400, 'Invalid username', { detail: 'USERNAME_INVALID' })
      if (needsCheck && !isAvailable) throw new ApiError(409, 'Username taken', { detail: 'USERNAME_TAKEN' })
      return cleverdocs.updateMe({ username: uname.value })
    },
    onSuccess: () => {
      toast({ kind: 'success', title: 'Nom d’utilisateur mis à jour' })
      meQ.refetch()
    },
    onError: (e) => {
      const msg = humanizeApiError(e)
      const detail = e instanceof ApiError ? e.detail : null
      if (detail === 'USERNAME_TAKEN') {
        toast({ kind: 'error', title: 'Nom d’utilisateur', message: 'Ce nom est déjà pris. Essaie une variante.' })
        return
      }
      if (detail === 'USERNAME_INVALID' || detail === 'USERNAME_TOO_LONG' || detail === 'USERNAME_EMPTY') {
        toast({ kind: 'error', title: 'Nom d’utilisateur', message: uname.ok === false ? uname.reason : msg })
        return
      }
      toast({ kind: 'error', title: 'Nom d’utilisateur', message: msg })
    },
  })

  const trimmedDisplayName = displayName.trim()
  const curDisplayName = (meQ.data?.display_name || '').trim()
  const canSaveDisplayName =
    !meQ.isLoading && trimmedDisplayName !== curDisplayName && trimmedDisplayName.length <= 255

  const saveDisplayName = useMutation({
    mutationFn: async () => {
      if (trimmedDisplayName.length > 255) throw new ApiError(400, 'Display name too long', { detail: 'DISPLAY_NAME_TOO_LONG' })
      return cleverdocs.updateMe({ display_name: trimmedDisplayName || null })
    },
    onSuccess: () => {
      toast({ kind: 'success', title: 'Nom affiché mis à jour' })
      meQ.refetch()
    },
    onError: (e) => {
      toast({ kind: 'error', title: 'Nom affiché', message: humanizeApiError(e) })
    },
  })

  const changePwd = useMutation({
    mutationFn: async () => cleverdocs.changePassword(cur, next),
    onSuccess: () => {
      setCur('')
      setNext('')
      toast({ kind: 'success', title: 'Mot de passe modifié' })
    },
    onError: (e) => {
      toast({ kind: 'error', title: 'Changement de mot de passe', message: humanizeApiError(e) })
    },
  })

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => cleverdocs.uploadAvatar(file),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Avatar mis à jour' })
      meQ.refetch()
    },
    onError: (e) => {
      toast({ kind: 'error', title: 'Upload avatar', message: humanizeApiError(e) })
    },
  })

  return (
    <div className="grid gap-6">
      <div className="card-soft">
        <PageHeader
          title="Profil"
          description="Ton identité, ton avatar et les réglages de sécurité."
        />

        {meQ.isLoading ? (
          <div className="grid gap-4 md:grid-cols-[128px_1fr]">
            <div className="h-32 w-32 rounded-3xl border border-white/10 bg-white/5" />
            <div className="grid gap-2">
              <SkeletonLine w="w-52" />
              <SkeletonLine w="w-72" />
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="h-10 w-44 animate-pulse rounded-xl bg-white/5" />
                <div className="h-10 w-40 animate-pulse rounded-xl bg-white/5" />
              </div>
            </div>
          </div>
        ) : null}

        {meQ.data ? (
          <div className="grid gap-5 md:grid-cols-[128px_1fr]">
            <div className="relative h-fit w-fit self-start">
              <div className="absolute inset-0 -z-10 rounded-[28px] bg-gradient-to-b from-indigo-500/20 via-cyan-500/10 to-transparent blur-xl" />
              <div className="h-32 w-32 overflow-hidden rounded-[28px] border border-white/12 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
                {avatarBlobUrl ? (
                  <img src={avatarBlobUrl} className="h-full w-full object-cover" alt="" />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-white/90">
                        {(meQ.data.display_name || meQ.data.email || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">Aucun avatar</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera quick-upload */}
              <label
                className="absolute -bottom-2 -right-2 grid h-10 w-10 cursor-pointer place-items-center rounded-2xl border border-white/15 bg-white/15 shadow-lg shadow-black/20 backdrop-blur transition hover:bg-white/20"
                title="Changer la photo"
                aria-label="Changer la photo"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    uploadAvatar.mutate(f)
                    // Allow selecting the same file again later.
                    e.currentTarget.value = ''
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white/95" fill="none" aria-hidden="true">
                  <path
                    d="M8 7 9.2 5.6A2 2 0 0 1 10.7 5h2.6a2 2 0 0 1 1.5.6L16 7h2.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-8A2.5 2.5 0 0 1 5.5 7H8Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 17a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 17Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </label>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-2xl font-semibold tracking-tight">{meQ.data.display_name || '—'}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm text-slate-400">{meQ.data.email}</div>
                    {meQ.data.username ? <span className="badge">@{meQ.data.username}</span> : null}
                  </div>
                  {meQ.data.avatar_storage_key ? null : (
                    <div className="mt-2 text-xs text-slate-500">Astuce: ajoute un avatar (PNG/JPG) pour un rendu plus pro.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">Clique sur l’icône caméra pour changer ta photo.</div>

            </div>
          </div>
        ) : null}

        {meQ.isError ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            Erreur lors du chargement de <code className="badge">/v1/auth/me</code>
          </div>
        ) : null}
      </div>

      <div className="card-soft">
        <PageHeader title="Identité" description="Ton nom affiché et ton nom d’utilisateur." />

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Nom affiché</div>
              <div className="mt-1 text-xs text-slate-500">Visible dans l’application. 255 caractères max.</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="min-w-[240px] flex-1">
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Brice Nanyang"
                maxLength={255}
                autoComplete="name"
              />
            </div>
            <button
              className="btn-secondary"
              disabled={!canSaveDisplayName || saveDisplayName.isPending}
              onClick={() => saveDisplayName.mutate()}
            >
              {saveDisplayName.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">Laisse vide pour effacer.</div>
        </div>
      </div>

      <div className="card-soft">
        <PageHeader title="Sécurité" description="Change ton mot de passe en toute sécurité." />


        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Nom d’utilisateur</div>
              <div className="mt-1 text-xs text-slate-500">
                Public et unique. Format GitHub: <span className="badge">a-z</span> <span className="badge">0-9</span>{' '}
                <span className="badge">-</span>, 1–39 caractères.
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">@</span>
              <input
                className="input pl-8"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="ton-nom"
                inputMode="text"
                maxLength={39}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {needsCheck ? (
              <span className="badge">{unameAvailQ.isFetching ? 'Vérification…' : isAvailable ? 'Disponible' : 'Déjà pris'}</span>
            ) : curUsername ? (
              <span className="badge">Actuel</span>
            ) : null}
            <button
              className="btn-secondary"
              disabled={!uname.ok || saveUsername.isPending || (meQ.data?.username || '') === uname.value || !isAvailable}
              onClick={() => saveUsername.mutate()}
            >
              {saveUsername.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>

          {uname.ok === true ? (
            <div className="mt-2 text-xs text-slate-500">
              Ton profil sera visible comme <span className="badge">@{uname.value}</span>
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-500">
              <span className="text-amber-200/90">{uname.reason}</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold">Mot de passe actuel</div>
            <div className="relative mt-2">
              <input
                className="input pr-11"
                type={showCur ? 'text' : 'password'}
                value={cur}
                onChange={(e) => setCur(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface)/var(--surface-alpha))] hover:text-[hsl(var(--foreground))]"
                aria-label={showCur ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={showCur ? 'Masquer' : 'Afficher'}
                onClick={() => setShowCur((v) => !v)}
              >
                <EyeIcon slashed={showCur} />
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">Saisis ton mot de passe actuel pour confirmer l’action.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold">Nouveau mot de passe</div>
            <div className="relative mt-2">
              <input
                className="input pr-11"
                type={showNext ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--surface)/var(--surface-alpha))] hover:text-[hsl(var(--foreground))]"
                aria-label={showNext ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={showNext ? 'Masquer' : 'Afficher'}
                onClick={() => setShowNext((v) => !v)}
              >
                <EyeIcon slashed={showNext} />
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500">Minimum 8 caractères.</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
          </div>
          <button
            className="btn-primary"
            disabled={changePwd.isPending || !passwordOk}
            onClick={() => changePwd.mutate()}
          >
            {changePwd.isPending ? 'Mise à jour…' : 'Modifier le mot de passe'}
          </button>
        </div>
      </div>
    </div>
  )
}

