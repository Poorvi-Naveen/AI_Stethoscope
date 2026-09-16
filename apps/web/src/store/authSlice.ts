import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getStoredSession, logout as apiLogout } from '../api/auth'
import type { AuthSession, AuthUser } from '../types'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
}

const stored = getStoredSession()

const initialState: AuthState = {
  user: stored?.user ?? { id: 'usr-demo-001', name: 'Dr. Priya Nair', email: 'dr.priya@stethai.test', role: 'doctor' },
  token: stored?.token ?? 'demo-session-token',
  isAuthenticated: true, // Default to authenticated for seamless demo navigation
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<AuthSession>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
    },
    clearSession: (state) => {
      apiLogout()
      state.user = null
      state.token = null
      state.isAuthenticated = false
    },
  },
})

export const { setSession, clearSession, clearSession: logout } = authSlice.actions
export default authSlice.reducer
