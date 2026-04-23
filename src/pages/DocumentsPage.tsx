import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { cleverdocs, type DocumentOut } from '../api/cleverdocs'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ConfirmButton } from '../components/ConfirmButton'
import { TableShell } from '../components/TableShell'
import { StatusBadge } from '../components/StatusBadge'
import { toast } from '../components/Toast'
import { DropdownItem, DropdownMenu } from '../components/DropdownMenu'
import { ApiError, buildAuthHeaders } from '../lib/api'
import { useDebouncedValue } from '../lib/useDebouncedValue'

function clampFileLabel(name: string) {
  if (name.length <= 42) return name
  return `${name.slice(0, 22)}…${name.slice(-16)}`
}

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

function statusKind(s: string) {
  if (s === 'indexed') return 'success'
  if (s === 'processed') return 'info'
  if (s === 'processing' || s === 'uploaded') return 'warning'
  if (s.includes('failed')) return 'danger'
  if (s === 'archived') return 'neutral'
  return 'neutral'
}

export function DocumentsPage() {
  const [includeArchived, setIncludeArchived] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'archived' | 'failed' | 'pending' | 'indexed'>('all')
  const [sort, setSort] = useState<'updated_desc' | 'created_desc' | 'name_asc'>('updated_desc')
  const qDebounced = useDebouncedValue(q.trim(), 250)
  const meQ = useQuery({ queryKey: ['me'], queryFn: cleverdocs.me })
  const docsQ = useQuery({
    queryKey: ['documents', includeArchived, qDebounced, status, sort],
    queryFn: () =>
      cleverdocs.listDocumentsMine({
        include_archived: includeArchived,
        q: qDebounced || undefined,
        sort,
        // We keep the richer "active/pending/failed" filtering client-side (status is coarse server-side).
        status: status === 'archived' ? 'archived' : undefined,
        limit: 500,
      }),
  })

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) return
      return cleverdocs.uploadDocument(file)
    },
    onSuccess: async (r) => {
      toast({ kind: 'success', title: 'Document uploadé', message: r?.document.filename })
      setFile(null)
      docsQ.refetch()

      const docId = r?.document?.id
      if (!docId) return

      // Enterprise UX: start OCR immediately, then try to index if it finishes synchronously.
      try {
        const processed = await cleverdocs.processDocument(docId)
        const st = processed?.document?.status
        if (st && st !== 'indexed' && st !== 'processing') {
          await cleverdocs.reindexDocument(docId)
        }
      } catch (e) {
        toast({
          kind: 'error',
          title: 'Post-upload',
          message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur',
        })
      } finally {
        docsQ.refetch()
      }
    },
    onError: (e) => toast({ kind: 'error', title: 'Upload', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const items = useMemo(() => docsQ.data || [], [docsQ.data])
  const filtered = useMemo(() => {
    let next = items
    if (status !== 'all') {
      next = next.filter((d) => {
        const failed = Boolean((d.failed_reason || '').length > 0 || (d.status || '').includes('failed'))
        const pending = d.status === 'uploaded' || d.status === 'processing'
        if (status === 'archived') return d.status === 'archived'
        if (status === 'active') return d.status !== 'archived'
        if (status === 'failed') return failed
        if (status === 'pending') return pending
        if (status === 'indexed') return d.status === 'indexed'
        return true
      })
    }
    next = [...next].sort((a, b) => {
      if (sort === 'name_asc') return a.filename.localeCompare(b.filename)
      if (sort === 'created_desc') return +new Date(b.created_at) - +new Date(a.created_at)
      return +new Date(b.updated_at) - +new Date(a.updated_at)
    })
    return next
  }, [items, sort, status])

  const grouped = useMemo(() => {
    const by: Record<string, { orgId: string; orgName: string; docs: DocumentOut[] }> = {}
    for (const d of filtered) {
      const oid = d.organization_id || 'personal'
      const name = d.organization_name || (d.organization_id ? `Organisation ${d.organization_id.slice(0, 8)}…` : 'Sans organisation')
      if (!by[oid]) by[oid] = { orgId: oid, orgName: name, docs: [] }
      by[oid].docs.push(d)
    }
    return Object.values(by).sort((a, b) => a.orgName.localeCompare(b.orgName))
  }, [filtered])
  const stats = useMemo(() => {
    const all = items.length
    const archived = items.filter((d) => d.status === 'archived').length
    const failed = items.filter((d) => (d.failed_reason || '').length > 0 || (d.status || '').includes('failed')).length
    const pending = items.filter((d) => d.status === 'uploaded' || d.status === 'processing').length
    return { all, archived, failed, pending }
  }, [items])

  return (
    <div className="grid gap-6">
      <div className="card-soft">
        <PageHeader
          title="Documents"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <StatPill label="Total" value={String(stats.all)} />
          <StatPill label="En attente" value={String(stats.pending)} tone={stats.pending > 0 ? 'warn' : 'neutral'} />
          <StatPill label="Échecs" value={String(stats.failed)} tone={stats.failed > 0 ? 'warn' : 'neutral'} />
          <StatPill label="Archivés" value={String(stats.archived)} />
        </div>

        <div
          className="mt-4 rounded-2xl border p-4"
          style={{
            borderColor: 'hsl(var(--surface) / var(--divider-alpha))',
            background: 'hsl(var(--surface) / 0.02)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Uploader</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <input
                  type="file"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <span className="btn-secondary">Choisir un fichier</span>
              </label>
              <button className="btn-primary" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
                {upload.isPending ? 'Upload…' : 'Uploader'}
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            {file ? (
              <span>
                Sélectionné: <span className="font-medium text-[hsl(var(--foreground))]">{clampFileLabel(file.name)}</span>
              </span>
            ) : (
              <span>Aucun fichier sélectionné</span>
            )}
          </div>
        </div>
      </div>

      {docsQ.isLoading ? (
        <div className="card-soft">
          <div className="grid gap-2">
            <div className="h-5 w-44 animate-pulse rounded bg-white/5" />
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>
      ) : null}

      {docsQ.isError ? (
        <div className="card-soft">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            Erreur lors du chargement de <code className="badge">/v1/documents</code>
          </div>
        </div>
      ) : null}

      <TableShell
        right={
          <div className="flex w-full flex-wrap items-center gap-2">
            <input
              className="input w-[400px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (nom)…"
            />
            <select className="input w-[220px]" value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="archived">Archivés</option>
              <option value="indexed">Indexés</option>
              <option value="pending">En attente</option>
              <option value="failed">Échecs</option>
            </select>
            <select className="input w-[250px]" value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="updated_desc">Tri: modifiés (récent)</option>
              <option value="created_desc">Tri: créés (récent)</option>
              <option value="name_asc">Tri: nom (A→Z)</option>
            </select>
            <label
              className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs"
              style={{
                borderColor: 'hsl(var(--surface) / var(--divider-alpha))',
                background: 'hsl(var(--surface) / var(--surface-alpha))',
                color: 'hsl(var(--foreground))',
              }}
            >
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="accent-indigo-500"
              />
              <span>Inclure archivés</span>
            </label>
          </div>
        }
      >
        {docsQ.data?.length === 0 ? (
          <EmptyState title="Aucun document" description="Uploade un document, puis lance la recherche dans l’onglet Recherche." />
        ) : (
          <>
            {grouped.length === 0 ? (
              <EmptyState
                title="Aucun résultat"
                description="Essaie un autre mot-clé, change le filtre statut, ou active “Inclure archivés”."
              />
            ) : (
              <div className="grid gap-4">
                {grouped.map((g) => (
                  <div key={g.orgId} className="rounded-3xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 px-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{g.orgName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{g.docs.length} document(s)</div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {g.docs.map((d) => (
                        <DocumentRow
                          key={d.id}
                          doc={d}
                          meUserId={meQ.data?.user_id || null}
                          onChanged={() => docsQ.refetch()}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </TableShell>
    </div>
  )
}

function DocumentRow(props: Readonly<{ doc: DocumentOut; meUserId: string | null; onChanged: () => void }>) {
  const d = props.doc
  const isUploader = Boolean(props.meUserId && d.uploaded_by_user_id && props.meUserId === d.uploaded_by_user_id)

  const archive = useMutation({
    mutationFn: async () => cleverdocs.archiveDocument(d.id),
    onSuccess: () => props.onChanged(),
    onError: (e) => toast({ kind: 'error', title: 'Archive', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const unarchive = useMutation({
    mutationFn: async () => cleverdocs.unarchiveDocument(d.id),
    onSuccess: () => props.onChanged(),
    onError: (e) => toast({ kind: 'error', title: 'Unarchive', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const del = useMutation({
    mutationFn: async () => cleverdocs.deleteDocument(d.id),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Supprimé' })
      props.onChanged()
    },
    onError: (e) => toast({ kind: 'error', title: 'Delete', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const process = useMutation({
    mutationFn: async () => cleverdocs.processDocument(d.id),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Job OCR lancé' })
      props.onChanged()
    },
    onError: (e) => toast({ kind: 'error', title: 'Process', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
  const reindex = useMutation({
    mutationFn: async () => cleverdocs.reindexDocument(d.id),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Job INDEX lancé' })
      props.onChanged()
    },
    onError: (e) => toast({ kind: 'error', title: 'Reindex', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  return (
    <div
      className="group rounded-2xl border p-4 transition"
      style={{
        borderColor: 'hsl(var(--surface) / var(--divider-alpha))',
        background: 'hsl(var(--surface) / var(--surface-alpha))',
      }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 truncate text-sm font-semibold tracking-tight">{d.filename}</div>
            <StatusBadge kind={statusKind(d.status) as any}>{d.status}</StatusBadge>
            {d.failed_reason ? <StatusBadge kind="danger">échec</StatusBadge> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
            <span>
              id: <span className="font-mono">{d.id}</span>
            </span>
            <span className="opacity-60">•</span>
            <span>créé: {new Date(d.created_at).toLocaleString()}</span>
            <span className="opacity-60">•</span>
            <span>maj: {new Date(d.updated_at).toLocaleString()}</span>
          </div>
          {d.failed_reason ? (
            <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {d.failed_reason}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu label="Actions" buttonClassName="btn-secondary" align="right">
            <DropdownItem
              onClick={() => {
                void (async () => {
                  const res = await fetch(cleverdocs.downloadDocumentUrl(d.id), { headers: buildAuthHeaders() })
                  if (!res.ok) {
                    toast({ kind: 'error', title: 'Téléchargement', message: `Erreur (${res.status})` })
                    return
                  }
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = d.filename
                  a.click()
                  URL.revokeObjectURL(url)
                })()
              }}
            >
              Télécharger
            </DropdownItem>
            {d.status === 'uploaded' || d.status === 'processing' ? (
              <DropdownItem disabled={process.isPending} onClick={() => process.mutate()}>
                OCR
              </DropdownItem>
            ) : null}
            <DropdownItem disabled={reindex.isPending} onClick={() => reindex.mutate()}>
              Reindex
            </DropdownItem>
            {isUploader ? (
              d.status === 'archived' ? (
                <DropdownItem disabled={unarchive.isPending} onClick={() => unarchive.mutate()}>
                  Désarchiver
                </DropdownItem>
              ) : (
                <DropdownItem disabled={archive.isPending} onClick={() => archive.mutate()}>
                  Archiver
                </DropdownItem>
              )
            ) : null}
            <div className="my-1 h-px" style={{ background: 'hsl(var(--surface) / var(--divider-alpha))' }} />
            {isUploader ? (
              <ConfirmButton
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-[hsl(var(--surface)/var(--surface-alpha))]"
                confirmText="Supprimer ce document ?"
                onConfirm={async () => {
                  await del.mutateAsync()
                }}
              >
                Supprimer
              </ConfirmButton>
            ) : null}
          </DropdownMenu>
        </div>
      </div>

    </div>
  )
}

