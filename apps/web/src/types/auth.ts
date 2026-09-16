export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'doctor' | 'admin'
}

export interface AuthSession {
  user: AuthUser
  token: string
}
