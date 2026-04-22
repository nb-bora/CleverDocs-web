import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authStore } from '../lib/authStore'
import { apiLogout } from '../lib/api'
import { cleverdocs } from '../api/cleverdocs'

function NavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition',
          isActive ? 'bg-white/10 text-white ring-1 ring-white/10' : 'text-slate-300 hover:bg-white/5 hover:text-white',
        ].join(' ')
      }
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/0 text-slate-300">{icon}</span>
      <span className="flex-1">{label}</span>
    </NavLink>
  )
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M4 4h7v7H4V4Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 4h7v7h-7V4Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 13h7v7H4v-7Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 13h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function IconUser() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M4 20V5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5V20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 10h2.5A1.5 1.5 0 0 1 20 11.5V20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7h2M7 10h2M7 13h2M12 7h1M12 10h1M12 13h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconFile() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
function IconTicket() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M5 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 9h6M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconPulse() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function AppLayout() {
  const nav = useNavigate()
  const loc = useLocation()
  const orgId = authStore.get().orgId
  const meQ = useQuery({ queryKey: ['me'], queryFn: cleverdocs.me })

  return (
    <div className="app-surface min-h-full">
      <div className="app-bg">
        <div className="app-bg-grid" />
        <div className="app-bg-halo-left" />
        <div className="app-bg-halo-right" />
        <div className="app-bg-vignette" />
      </div>

      <div className="relative">
        <div className="mx-auto flex min-h-screen w-full max-w-[1400px] items-start gap-4 px-4 py-6">
          {/* Sidebar (SIGIS-like) */}
          <aside className="hidden w-[280px] shrink-0 lg:block">
            <div className="card-soft sticky top-6 flex h-[calc(100vh-3rem)] flex-col p-4">
              <Link to="/app" className="mb-4 flex items-center gap-3 px-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-400/25">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-indigo-200" fill="none" aria-hidden="true">
                    <path
                      d="M12 2.5 19 6v7.2c0 4.2-3 7.7-7 8.8-4-1.1-7-4.6-7-8.8V6l7-3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-slate-100">CleverDocs</div>
                  <div className="text-xs text-slate-400">Admin</div>
                </div>
              </Link>

              <div className="space-y-1">
                <NavItem to="/app" label="Tableau de bord" icon={<IconGrid />} />
                <NavItem to="/app/documents" label="Documents" icon={<IconFile />} />
                <NavItem to="/app/search" label="Recherche" icon={<IconSearch />} />
                <NavItem to="/app/organizations" label="Organisations" icon={<IconBuilding />} />
                <NavItem to="/app/invitations" label="Invitations" icon={<IconTicket />} />
                <NavItem to="/app/jobs" label="Jobs" icon={<IconBolt />} />
                <NavItem to="/app/health" label="Observabilité" icon={<IconPulse />} />
                <NavItem to="/app/profile" label="Profil" icon={<IconUser />} />
              </div>

              <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
                <Link className="btn-ghost w-full" to="/app/organizations">
                  <span className="badge w-full justify-center">{orgId ? `Org: ${orgId.slice(0, 8)}…` : 'Org: auto'}</span>
                </Link>
                <button
                  className="btn-ghost w-full"
                  onClick={() => {
                    authStore.setOrgId(null)
                    window.location.reload()
                  }}
                >
                  Réinitialiser l’org
                </button>
                <button
                  className="btn-ghost w-full"
                  onClick={async () => {
                    await apiLogout()
                    nav('/login')
                  }}
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0 flex-1">
            {/* User bar (SIGIS-like) */}
            <div className="card-soft mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  Bonjour, <span className="text-slate-100">{meQ.data?.display_name || '—'}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-400">{meQ.data?.email || ''}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge">{loc.pathname.replace('/app', '') || '/dashboard'}</span>
                <Link className="btn-ghost" to="/app/profile">
                  Mon compte
                </Link>
              </div>
            </div>

            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

