import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cleverdocs } from '../api/cleverdocs'
import { PageHeader } from '../components/PageHeader'

function formatDateFR(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTimeFR(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function StatCard(props: Readonly<{ label: string; value: string; hint?: string; to: string }>) {
  return (
    <Link
      to={props.to}
      className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/7 hover:ring-1 hover:ring-white/10"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{props.value}</div>
      {props.hint ? <div className="mt-1 text-xs text-slate-400">{props.hint}</div> : null}
    </Link>
  )
}

export function DashboardPage() {
  const meQ = useQuery({ queryKey: ['me'], queryFn: cleverdocs.me })
  const now = new Date()

  return (
    <div className="grid gap-4">
      {/* SIGIS-like hero banner */}
      <div className="card-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/25">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-indigo-200" fill="none" aria-hidden="true">
                <path d="M4 4h7v7H4V4Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 4h7v7h-7V4Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 13h7v7H4v-7Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M13 13h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tableau de bord</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight">Vue d’ensemble</div>
              <div className="mt-1 text-sm text-slate-400">
                Vue globale: accès rapide aux modules, documents et supervision.
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {meQ.isLoading ? 'Chargement…' : meQ.data?.display_name || meQ.data?.email || '—'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Aujourd’hui</div>
            <div className="mt-2 text-sm font-semibold">{formatDateFR(now)}</div>
            <div className="mt-1 text-xs text-slate-400">{formatTimeFR(now)}</div>
            <div className="mt-3 text-xs text-slate-500">Données: live backend</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm font-semibold">Indicateurs clés</div>
          <div className="mt-1 text-xs text-slate-400">Cartes cliquables — accès direct aux modules.</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Documents" value="—" hint="Liste & upload" to="/app/documents" />
            <StatCard label="Organisations" value="—" hint="Membres & rôles" to="/app/organizations" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-soft">
          <PageHeader title="Documents par statut" description="Vue rapide du pipeline OCR / indexation." />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="text-sm font-semibold">Aucun graphique pour l’instant</div>
            <div className="mt-1 text-sm text-slate-400">
              Les indicateurs seront alimentés quand on ajoutera l’endpoint stats.
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Link className="btn-primary" to="/app/documents">
                Aller aux documents
              </Link>
            </div>
          </div>
        </div>
        <div className="card-soft">
          <PageHeader title="Administration" description="Organisation, membres, invitations et supervision API." />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="text-sm font-semibold">Modules</div>
            <div className="mt-1 text-sm text-slate-400">Accès direct à l’administration.</div>
            <div className="mt-4 flex justify-center gap-2">
              <Link className="btn-primary" to="/app/organizations">
                Organisations
              </Link>
              <Link className="btn-ghost" to="/app/invitations">
                Invitations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

