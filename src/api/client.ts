import { apiFetch } from '../lib/api'

// OpenAPI types (generated)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { paths } from './openapi'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

type PathFor<M extends HttpMethod> = {
  [P in keyof paths]: M extends keyof paths[P] ? P : never
}[keyof paths]

type ReqBody<M extends HttpMethod, P extends keyof paths> =
  M extends keyof paths[P]
    ? paths[P][M] extends { requestBody: { content: { 'application/json': infer B } } }
      ? B
      : undefined
    : undefined

type ResBody<M extends HttpMethod, P extends keyof paths> =
  M extends keyof paths[P]
    ? paths[P][M] extends { responses: { 200: { content: { 'application/json': infer R } } } }
      ? R
      : unknown
    : unknown

export async function apiCall<M extends HttpMethod, P extends PathFor<M>>(
  method: M,
  path: P,
  body?: ReqBody<M, P>
): Promise<ResBody<M, P>> {
  const init: RequestInit = { method: method.toUpperCase() }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  return await apiFetch(String(path), init)
}

