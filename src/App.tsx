import { authStore } from './lib/authStore'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ToastHost } from './components/Toast'
import { AppLayout } from './layouts/AppLayout'
import { AcceptInvitationPage } from './pages/AcceptInvitationPage'
import { DashboardPage } from './pages/DashboardPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { InvitationsPage } from './pages/InvitationsPage'
import { LoginPage } from './pages/LoginPage'
import { OrganizationDetailPage } from './pages/OrganizationDetailPage'
import { OrganizationsPage } from './pages/OrganizationsPage'
import { ProfilePage } from './pages/ProfilePage'

function RequireAuth() {
  const loc = useLocation()
  const token = authStore.get().accessToken
  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <Outlet />
}

export default function App() {
  return (
    <>
      <ToastHost />
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/profile" element={<ProfilePage />} />
            <Route path="/app/organizations" element={<OrganizationsPage />} />
            <Route path="/app/organizations/:organizationId" element={<OrganizationDetailPage />} />
            <Route path="/app/documents" element={<DocumentsPage />} />
            <Route path="/app/invitations" element={<InvitationsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </>
  )
}
