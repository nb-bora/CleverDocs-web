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

  return (
    <div className="grid gap-4">
      <div className="card-soft">
        <PageHeader
          title="Documents"
          description="Liste, upload, versions, archive, OCR et indexation."
          actions={
            <>
              <Link className="btn-ghost" to="/app/search">
                Recherche
              </Link>
              <Link className="btn-ghost" to="/app/profile">
                Profil
              </Link>
            </>
          }
        />

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
            Inclure les archivés
          </label>
          <input type="file" className="text-sm text-slate-300" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn-primary" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? 'Upload…' : 'Uploader'}
          </button>
        </div>
      </div>

      {docsQ.isLoading ? <div className="card-soft text-sm text-slate-400">Chargement…</div> : null}
      {docsQ.isError ? <div className="card-soft text-sm text-red-300">Erreur /v1/documents</div> : null}

      {docsQ.data && docsQ.data.length === 0 ? (
        <EmptyState
          title="Aucun document"
          description="Uploade un document pour lancer OCR et indexation, puis utilise Recherche."
        />
      ) : (
        <TableShell
          title="Liste"
          hint="Actions: process/reindex, rename, archive, delete, download et upload version."
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

function DocumentRow(props: { doc: DocumentOut; onChanged: () => void }) {
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold">{d.filename}</div>
            <StatusBadge kind={statusKind(d.status) as any}>{d.status}</StatusBadge>
            {d.failed_reason ? <StatusBadge kind="danger">failed</StatusBadge> : null}
          </div>
          <div className="mt-1 text-xs text-slate-400">id: {d.id}</div>
          {d.failed_reason ? <div className="mt-1 text-xs text-red-200">reason: {d.failed_reason}</div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            className="btn-ghost"
            href={cleverdocs.downloadDocumentUrl(d.id)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              // ensure auth headers are present -> open in same window won't include Authorization
              // So we fallback to fetch+blob download when needed.
              e.preventDefault()
              void (async () => {
                const res = await fetch(cleverdocs.downloadDocumentUrl(d.id), { headers: buildAuthHeaders() })
                if (!res.ok) {
                  toast({ kind: 'error', title: 'Download', message: `Erreur (${res.status})` })
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
          </a>
          <button className="btn-ghost" disabled={process.isPending} onClick={() => process.mutate()}>
            OCR
          </button>
          <button className="btn-ghost" disabled={reindex.isPending} onClick={() => reindex.mutate()}>
            Reindex
          </button>
          {d.status === 'archived' ? (
            <button className="btn-ghost" disabled={unarchive.isPending} onClick={() => unarchive.mutate()}>
              Unarchive
            </button>
          ) : (
            <button className="btn-ghost" disabled={archive.isPending} onClick={() => archive.mutate()}>
              Archive
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
        <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary" disabled={rename.isPending || newName.trim().length < 1} onClick={() => rename.mutate()}>
          Renommer
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" className="text-sm text-slate-300" onChange={(e) => setVersionFile(e.target.files?.[0] || null)} />
        <button className="btn-ghost" disabled={!versionFile || addVersion.isPending} onClick={() => addVersion.mutate()}>
          {addVersion.isPending ? '…' : 'Ajouter version'}
        </button>
      </div>
    </div>
  )
}

