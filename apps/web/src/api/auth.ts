import type { AuthSession } from '../types'

const SESSION_KEY = 'stethai.auth.session'

export interface LoginInput { email: string; password: string; rememberMe: boolean }
export interface SignupInput { name: string; email: string; password: string }

function persist(session: AuthSession, rememberMe: boolean) {
  const storage = rememberMe ? localStorage : sessionStorage
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_KEY)
  storage.setItem(SESSION_KEY, JSON.stringify(session))
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const session: AuthSession = { user: { id: 'usr-demo-001', name: 'Dr. Priya Nair', email: input.email, role: 'doctor' }, token: `mock-token-${crypto.randomUUID()}` }
  persist(session, input.rememberMe)
  return session
}

export async function signup(input: SignupInput): Promise<AuthSession> {
  const session: AuthSession = { user: { id: 'usr-demo-001', name: input.name, email: input.email, role: 'doctor' }, token: `mock-token-${crypto.randomUUID()}` }
  persist(session, true)
  return session
}

export function getStoredSession(): AuthSession | null {
  const value = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
  if (!value) return null
  try { return JSON.parse(value) as AuthSession } catch { return null }
}

export function logout() { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY) }
