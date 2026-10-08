import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'

export function AuthLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2"><section className="hidden bg-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-white font-bold text-brand-800">S</div><span className="text-xl font-bold">StethAI</span></div><div><p className="text-4xl font-bold leading-tight">Clarity for every heartbeat.</p><p className="mt-4 max-w-md text-brand-100">Capture, analyze, and follow cardiac sound recordings in one secure clinical workspace.</p><div className="mt-10 h-44 rounded-2xl border border-brand-600 bg-brand-700/50 p-6"><div className="flex h-full items-center gap-1"><span className="h-8 w-1 rounded bg-brand-100" /><span className="h-20 w-1 rounded bg-white" /><span className="h-12 w-1 rounded bg-brand-200" /><span className="h-28 w-1 rounded bg-white" /><span className="h-16 w-1 rounded bg-brand-100" /><span className="h-10 w-1 rounded bg-brand-200" /></div></div></div><p className="text-sm text-brand-200">Clinical decision support for care teams.</p></section><section className="grid min-h-screen place-items-center p-5 sm:p-10">{children}</section></main>
}
