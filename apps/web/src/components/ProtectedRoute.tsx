// apps/web/src/components/ProtectedRoute.tsx
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const location = useLocation()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace state={{ from: location }} />
}
