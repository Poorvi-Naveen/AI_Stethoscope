import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store'

export function AuthLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Left Column: Original Greenish Brand Layout with Simple Travelling ECG Wave */}
      <section className="hidden bg-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white font-bold text-brand-800">
            S
          </div>
          <span className="text-xl font-bold">StethAI</span>
        </div>

        {/* Center Content */}
        <div>
          <p className="text-4xl font-bold leading-tight">Clarity for every heartbeat.</p>
          <p className="mt-4 max-w-md text-brand-100">
            Capture, analyze, and follow cardiac sound recordings in one secure clinical workspace.
          </p>

          {/* Simple Travelling ECG Wave Visual Art */}
          <div className="mt-10 h-44 rounded-2xl border border-brand-600 bg-brand-700/50 p-6 flex items-center justify-center relative overflow-hidden">
            {/* Subtle Clinical Grid */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* SVG Travelling ECG Wave */}
            <svg
              viewBox="0 0 500 100"
              className="w-full h-24 relative z-10 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="ecgGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Faint static guide ECG line */}
              <path
                d="M 0 50 L 40 50 L 50 50 Q 60 40 70 50 L 85 50 L 92 58 L 105 10 L 118 85 L 125 50 L 140 50 Q 155 35 170 50 L 210 50 L 250 50 Q 260 40 270 50 L 285 50 L 292 58 L 305 10 L 318 85 L 325 50 L 340 50 Q 355 35 370 50 L 410 50 L 450 50 Q 460 40 470 50 L 485 50 L 492 58 L 500 10"
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Bright animated travelling ECG pulse wave */}
              <path
                d="M 0 50 L 40 50 L 50 50 Q 60 40 70 50 L 85 50 L 92 58 L 105 10 L 118 85 L 125 50 L 140 50 Q 155 35 170 50 L 210 50 L 250 50 Q 260 40 270 50 L 285 50 L 292 58 L 305 10 L 318 85 L 325 50 L 340 50 Q 355 35 370 50 L 410 50 L 450 50 Q 460 40 470 50 L 485 50 L 492 58 L 500 10"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-ecg-travel"
                filter="url(#ecgGlow)"
              />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-brand-200">Clinical decision support for care teams.</p>
      </section>

      {/* Right Column: Form Container */}
      <section className="grid min-h-screen place-items-center p-5 sm:p-10">{children}</section>
    </main>
  )
}
