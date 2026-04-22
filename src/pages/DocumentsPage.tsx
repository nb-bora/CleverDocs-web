import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cleverdocs, type DocumentOut } from '../api/cleverdocs'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ConfirmButton } from '../components/ConfirmButton'
import { TableShell } from '../components/TableShell'
import { StatusBadge } from '../components/StatusBadge'
import { toast } from '../components/Toast'
import { ApiError, buildAuthHeaders } from '../lib/api'

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
  const docsQ = useQuery({
    queryKey: ['documents', includeArchived],
    queryFn: () => cleverdocs.listDocuments(includeArchived),
  })

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) return
      return cleverdocs.uploadDocument(file)
    },
    onSuccess: (r) => {
      toast({ kind: 'success', title: 'Document uploadé', message: r?.document.filename })
      setFile(null)
      docsQ.refetch()
    },
    onError: (e) => toast({ kind: 'error', title: 'Upload', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  const items = useMemo(() => docsQ.data || [], [docsQ.data])
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
          description="Upload, versions, archive, OCR et indexation — le centre de contrôle."
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link className="btn-ghost" to="/app/search">
                Recherche
              </Link>
              <Link className="btn-ghost" to="/app/jobs">
                Jobs
              </Link>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <StatPill label="Total" value={String(stats.all)} />
          <StatPill label="En attente" value={String(stats.pending)} tone={stats.pending > 0 ? 'warn' : 'neutral'} />
          <StatPill label="Échecs" value={String(stats.failed)} tone={stats.failed > 0 ? 'warn' : 'neutral'} />
          <StatPill label="Archivés" value={String(stats.archived)} />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Uploader un document</div>
              <div className="mt-0.5 text-xs text-slate-500">
                Le document sera ensuite OCR + indexé. Tu peux aussi ajouter une version à un document existant.
              </div>
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

      {docsQ.data?.length === 0 ? (
        <EmptyState title="Aucun document" description="Uploade un document, puis lance la recherche dans l’onglet Recherche." />
      ) : (
        <TableShell
          title="Liste"
          hint="Astuce: Télécharger via fetch (token), OCR / Reindex, archiver, renommer, supprimer, versionner."
          right={
            <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="accent-indigo-400" />
              <span>Inclure les archivés</span>
            </label>
          }
        >
          <div className="grid gap-2">
            {items.map((d) => (
              <DocumentRow key={d.id} doc={d} onChanged={() => docsQ.refetch()} />
            ))}
          </div>
        </TableShell>
      )}
    </div>
  )
}

function DocumentRow(props: Readonly<{ doc: DocumentOut; onChanged: () => void }>) {
  const d = props.doc
  const [newName, setNewName] = useState(d.filename)
  const [versionFile, setVersionFile] = useState<File | null>(null)

  const rename = useMutation({
    mutationFn: async () => cleverdocs.renameDocument(d.id, newName),
    onSuccess: () => {
      toast({ kind: 'success', title: 'Renommé' })
      props.onChanged()
    },
    onError: (e) => toast({ kind: 'error', title: 'Rename', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })
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
  const addVersion = useMutation({
    mutationFn: async () => {
      if (!versionFile) return
      return cleverdocs.addDocumentVersion(d.id, versionFile)
    },
    onSuccess: () => {
      toast({ kind: 'success', title: 'Version ajoutée' })
      setVersionFile(null)
      props.onChanged()
    },
    onError: (e) => toast({ kind: 'error', title: 'Add version', message: e instanceof ApiError ? `Erreur (${e.status})` : 'Erreur' }),
  })

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/15 hover:bg-white/[0.06]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 truncate text-sm font-semibold tracking-tight">{d.filename}</div>
            <StatusBadge kind={statusKind(d.status) as any}>{d.status}</StatusBadge>
            {d.failed_reason ? <StatusBadge kind="danger">échec</StatusBadge> : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            id: <span className="text-slate-400">{d.id}</span>
          </div>
          {d.failed_reason ? (
            <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {d.failed_reason}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn-ghost"
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
          </button>
          <button className="btn-ghost" disabled={process.isPending} onClick={() => process.mutate()}>
            OCR
          </button>
          <button className="btn-ghost" disabled={reindex.isPending} onClick={() => reindex.mutate()}>
            Reindex
          </button>
          {d.status === 'archived' ? (
            <button className="btn-ghost" disabled={unarchive.isPending} onClick={() => unarchive.mutate()}>
              Désarchiver
            </button>
          ) : (
            <button className="btn-ghost" disabled={archive.isPending} onClick={() => archive.mutate()}>
              Archiver
            </button>
          )}
          <ConfirmButton
            className="btn-danger"
            confirmText="Supprimer ce document ?"
            onConfirm={async () => {
              await del.mutateAsync()
            }}
          >
            Supprimer
          </ConfirmButton>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-xs font-semibold text-slate-300">Renommer</div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button
              className="btn-primary"
              disabled={rename.isPending || newName.trim().length < 1 || newName.trim() === d.filename.trim()}
              onClick={() => rename.mutate()}
            >
              {rename.isPending ? '…' : 'Appliquer'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-300">Ajouter une version</div>
            <div className="mt-0.5 text-xs text-slate-500">Uploade un nouveau fichier pour remplacer le contenu.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <input
                type="file"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
              />
              <span className="btn-secondary">Choisir</span>
            </label>
            <button className="btn-ghost" disabled={!versionFile || addVersion.isPending} onClick={() => addVersion.mutate()}>
              {addVersion.isPending ? 'Upload…' : 'Uploader version'}
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          {versionFile ? (
            <span>
              Sélectionné: <span className="text-slate-200">{clampFileLabel(versionFile.name)}</span>
            </span>
          ) : (
            <span>Aucun fichier sélectionné</span>
          )}
        </div>
      </div>
    </div>
  )
}

