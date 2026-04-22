import { apiBaseUrl } from '../lib/config'
import { apiFetch, buildAuthHeaders, ApiError } from '../lib/api'

export type DocumentOut = {
  id: string
  organization_id: string | null
  filename: string
  status: string
  storage_key: string
  failed_reason: string | null
  text_preview: string | null
  created_at: string
  updated_at: string
}

export type UploadDocumentResponse = { document: DocumentOut }
export type ProcessDocumentResponse = { document: DocumentOut }

export type SearchResultItem = {
  document_id: string
  filename: string
  score: number
  preview: string | null
}

export type SearchResponse = { query: string; results: SearchResultItem[] }

export type OrganizationOut = { id: string; name: string; status: string }
export type MembershipOut = { id: string; user_id: string; organization_id: string; role: string; status: string }
export type UserOut = {
  id: string
  email: string
  display_name: string | null
  avatar_storage_key: string | null
  status: string
}

export type InvitationOut = {
  id: string
  organization_id: string
  email: string
  role: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export type CreateInvitationResponse = { invitation: InvitationOut; token: string }

export type MeResponse = {
  user_id: string
  email: string
  display_name?: string | null
  avatar_storage_key?: string | null
}

export const cleverdocs = {
  // auth
  me: () => apiFetch<MeResponse>('/v1/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    apiFetch('/v1/auth/me/change_password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password }),
    }),

  uploadAvatar: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${apiBaseUrl()}/v1/auth/me/avatar`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: fd,
    })
    const ct = res.headers.get('content-type') || ''
    const data = ct.includes('application/json') ? await res.json() : null
    if (!res.ok) throw new ApiError(res.status, 'Avatar upload failed', data)
    return data as { status: string; avatar_storage_key: string }
  },
  avatarUrl: () => `${apiBaseUrl()}/v1/auth/me/avatar`,

  // orgs
  listMyOrganizations: () => apiFetch<OrganizationOut[]>('/v1/organizations'),
  createOrganization: (name: string) =>
    apiFetch<OrganizationOut>('/v1/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  getOrganization: (organizationId: string) => apiFetch<OrganizationOut>(`/v1/organizations/${organizationId}`),
  updateOrganization: (organizationId: string, name: string) =>
    apiFetch<OrganizationOut>(`/v1/organizations/${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  suspendOrganization: (organizationId: string) =>
    apiFetch<OrganizationOut>(`/v1/organizations/${organizationId}/suspend`, { method: 'POST' }),
  activateOrganization: (organizationId: string) =>
    apiFetch<OrganizationOut>(`/v1/organizations/${organizationId}/activate`, { method: 'POST' }),
  deleteOrganization: (organizationId: string) =>
    apiFetch(`/v1/organizations/${organizationId}`, { method: 'DELETE' }),

  // members
  listMembers: (organizationId: string) =>
    apiFetch<MembershipOut[]>(`/v1/organizations/${organizationId}/members`),
  addMember: (organizationId: string, user_email: string, role: string) =>
    apiFetch<MembershipOut>(`/v1/organizations/${organizationId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email, role }),
    }),
  updateMember: (organizationId: string, membershipId: string, body: { role?: string | null; status?: string | null }) =>
    apiFetch<MembershipOut>(`/v1/organizations/${organizationId}/members/${membershipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  removeMember: (organizationId: string, membershipId: string) =>
    apiFetch(`/v1/organizations/${organizationId}/members/${membershipId}`, { method: 'DELETE' }),
  suspendMember: (organizationId: string, membershipId: string) =>
    apiFetch<MembershipOut>(`/v1/organizations/${organizationId}/members/${membershipId}/suspend`, { method: 'POST' }),
  activateMember: (organizationId: string, membershipId: string) =>
    apiFetch<MembershipOut>(`/v1/organizations/${organizationId}/members/${membershipId}/activate`, { method: 'POST' }),
  transferOwnership: (organizationId: string, new_owner_user_id: string) =>
    apiFetch(`/v1/organizations/${organizationId}/transfer_ownership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_owner_user_id }),
    }),

  // invitations
  createInvitation: (email: string, role: string) =>
    apiFetch<CreateInvitationResponse>('/v1/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    }),
  acceptInvitation: (token: string, password: string, display_name?: string) =>
    apiFetch('/v1/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, display_name }),
    }),
  revokeInvitation: (invitationId: string) => apiFetch(`/v1/invitations/${invitationId}/revoke`, { method: 'POST' }),

  // documents
  listDocuments: (include_archived: boolean) =>
    apiFetch<DocumentOut[]>(`/v1/documents?include_archived=${include_archived ? 'true' : 'false'}`),
  listMyDocumentsGrouped: () => apiFetch<any>('/v1/documents/mine'),
  uploadDocument: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${apiBaseUrl()}/v1/documents`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: fd,
    })
    const ct = res.headers.get('content-type') || ''
    const data = ct.includes('application/json') ? await res.json() : null
    if (!res.ok) throw new ApiError(res.status, 'Upload failed', data)
    return data as UploadDocumentResponse
  },
  getDocument: (documentId: string) => apiFetch<DocumentOut>(`/v1/documents/${documentId}`),
  renameDocument: (documentId: string, filename: string) =>
    apiFetch<DocumentOut>(`/v1/documents/${documentId}?filename=${encodeURIComponent(filename)}`, { method: 'PATCH' }),
  deleteDocument: (documentId: string) => apiFetch(`/v1/documents/${documentId}`, { method: 'DELETE' }),
  archiveDocument: (documentId: string) => apiFetch<DocumentOut>(`/v1/documents/${documentId}/archive`, { method: 'POST' }),
  unarchiveDocument: (documentId: string) =>
    apiFetch<DocumentOut>(`/v1/documents/${documentId}/unarchive`, { method: 'POST' }),
  processDocument: (documentId: string) =>
    apiFetch<ProcessDocumentResponse>(`/v1/documents/${documentId}/process`, { method: 'POST' }),
  reindexDocument: (documentId: string) => apiFetch(`/v1/documents/${documentId}/reindex`, { method: 'POST' }),
  addDocumentVersion: async (documentId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${apiBaseUrl()}/v1/documents/${documentId}/versions`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: fd,
    })
    const ct = res.headers.get('content-type') || ''
    const data = ct.includes('application/json') ? await res.json() : null
    if (!res.ok) throw new ApiError(res.status, 'Version upload failed', data)
    return data as DocumentOut
  },
  downloadDocumentUrl: (documentId: string) => `${apiBaseUrl()}/v1/documents/${documentId}/file`,

  // search
  search: (q: string) => apiFetch<SearchResponse>(`/v1/search?q=${encodeURIComponent(q)}`),
  searchMine: (q: string) => apiFetch<SearchResponse>(`/v1/search/mine?q=${encodeURIComponent(q)}`),

  // jobs
  listJobs: (limit: number) => apiFetch<any[]>(`/v1/jobs?limit=${limit}`),
  getJob: (jobId: string) => apiFetch<any>(`/v1/jobs/${jobId}`),
  cancelJob: (jobId: string) => apiFetch(`/v1/jobs/${jobId}/cancel`, { method: 'POST' }),
  retryJob: (jobId: string, reset_attempts: boolean) =>
    apiFetch(`/v1/jobs/${jobId}/retry?reset_attempts=${reset_attempts ? 'true' : 'false'}`, { method: 'POST' }),
  retryFailedJobs: (type: string | null, limit: number, reset_attempts: boolean) => {
    const qs = new URLSearchParams()
    if (type) qs.set('type', type)
    qs.set('limit', String(limit))
    qs.set('reset_attempts', reset_attempts ? 'true' : 'false')
    return apiFetch(`/v1/jobs/retry_failed?${qs.toString()}`, { method: 'POST' })
  },
  listDeadJobs: (limit: number) => apiFetch<any[]>(`/v1/jobs/dead?limit=${limit}`),
  retryDeadJobs: (type: string | null, limit: number, reset_attempts: boolean) => {
    const qs = new URLSearchParams()
    if (type) qs.set('type', type)
    qs.set('limit', String(limit))
    qs.set('reset_attempts', reset_attempts ? 'true' : 'false')
    return apiFetch(`/v1/jobs/retry_dead?${qs.toString()}`, { method: 'POST' })
  },
}

