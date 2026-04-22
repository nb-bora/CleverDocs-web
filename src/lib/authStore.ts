type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  orgId: string | null
}

const KEY = 'cleverdocs.auth.v1'

function read(): AuthState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { accessToken: null, refreshToken: null, orgId: null }
    const parsed = JSON.parse(raw) as Partial<AuthState>
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      orgId: parsed.orgId ?? null,
    }
  } catch {
    return { accessToken: null, refreshToken: null, orgId: null }
  }
}

function write(next: AuthState) {
  localStorage.setItem(KEY, JSON.stringify(next))
}

export const authStore = {
  get(): AuthState {
    return read()
  },
  setTokens(accessToken: string, refreshToken: string) {
    const cur = read()
    write({ ...cur, accessToken, refreshToken })
  },
  setOrgId(orgId: string | null) {
    const cur = read()
    write({ ...cur, orgId })
  },
  clear() {
    write({ accessToken: null, refreshToken: null, orgId: null })
  },
}

