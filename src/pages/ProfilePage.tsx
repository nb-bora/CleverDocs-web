import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { cleverdocs } from '../api/cleverdocs'
import { PageHeader } from '../components/PageHeader'
import { toast } from '../components/Toast'
import { ApiError, buildAuthHeaders } from '../lib/api'

function SkeletonLine({ w = 'w-40' }: Readonly<{ w?: string }>) {
  return <div className={`h-4 ${w} animate-pulse rounded bg-white/5`} />
}

function clampFileLabel(name: string) {
  if (name.length <= 42) return name
  return `${name.slice(0, 22)}…${name.slice(-16)}`
}

export function ProfilePage() {
  const meQ = useQuery({ queryKey: ['me'], queryFn: cleverdocs.me })
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null)

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

  const passwordOk = cur.length >= 8 && next.length >= 8

  const changePwd = useMutation({
    mutationFn: async () => cleverdocs.changePassword(cur, next),
    onSuccess: () => {
      setCur('')
      setNext('')
      toast({ kind: 'success', title: 'Mot de passe modifié' })
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur'
      toast({ kind: 'error', title: 'Changement de mot de passe', message: msg })
    },
  })

  const uploadAvatar = useMutation({
    mutationFn: async () => {
      if (!file) return
      return cleverdocs.uploadAvatar(file)
    },
    onSuccess: () => {
      toast({ kind: 'success', title: 'Avatar mis à jour' })
      meQ.refetch()
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur'
      toast({ kind: 'error', title: 'Upload avatar', message: msg })
    },
  })

  return (
    <div className="grid gap-6">
      <div className="card-soft">
        <PageHeader
          title="Profil"
          description="Ton identité, ton avatar et les réglages de sécurité."
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="hidden md:block text-xs text-slate-400">
                API: <code className="badge">GET /v1/auth/me</code>
              </div>
            </div>
          }
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
            <div className="relative">
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
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-2xl font-semibold tracking-tight">{meQ.data.display_name || '—'}</div>
                  <div className="truncate text-sm text-slate-400">{meQ.data.email}</div>
                  {meQ.data.avatar_storage_key ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="badge">Avatar actif</span>
                      <span className="text-slate-500">Servi via</span>
                      <code className="badge">GET /v1/auth/me/avatar</code>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">
                      Astuce: ajoute un avatar (PNG/JPG) pour un rendu plus pro.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Photo de profil</div>
                      <div className="mt-0.5 text-xs text-slate-500">Jusqu’à ~5MB. Formats courants: PNG, JPG.</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                        <span className="btn-secondary">Choisir un fichier</span>
                      </label>
                      <button
                        className="btn-primary"
                        disabled={!file || uploadAvatar.isPending}
                        onClick={() => uploadAvatar.mutate()}
                      >
                        {uploadAvatar.isPending ? 'Upload…' : 'Mettre à jour'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {file ? (
                      <span>
                        Sélectionné: <span className="text-slate-200">{clampFileLabel(file.name)}</span>
                      </span>
                    ) : (
                      <span>Aucun fichier sélectionné</span>
                    )}
                  </div>
                </div>
              </div>
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
        <PageHeader title="Sécurité" description="Change ton mot de passe en toute sécurité." />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold">Mot de passe actuel</div>
            <div className="mt-2">
              <input
                className="input"
                type="password"
                value={cur}
                onChange={(e) => setCur(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">Saisis ton mot de passe actuel pour confirmer l’action.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold">Nouveau mot de passe</div>
            <div className="mt-2">
              <input
                className="input"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">Minimum 8 caractères.</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {passwordOk ? (
              <span className="text-emerald-300">Prêt à modifier</span>
            ) : (
              <span>Renseigne les 2 champs (8+ caractères).</span>
            )}
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

