import type { ReactNode } from 'react'
import { Card } from './ui'

export interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
  trend?: {
    value: string
    isUp?: boolean
  }
}

export function StatCard({ label, value, hint, icon, trend }: StatCardProps) {
  return (
    <Card className="hover:border-brand-200 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
        </div>
        {icon && (
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
            {icon}
          </div>
        )}
      </div>

      {(hint || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>{hint}</span>
          {trend && (
            <span
              className={`font-semibold ${
                trend.isUp ? 'text-emerald-600' : 'text-slate-600'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
