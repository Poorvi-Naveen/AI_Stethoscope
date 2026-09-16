import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, backTo, backLabel = 'Back', action }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-2">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
      </div>
    </div>
  )
}
