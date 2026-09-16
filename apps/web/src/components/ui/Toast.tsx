import { createContext, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'warning' | 'error' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
            warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
            info: <Info className="h-5 w-5 text-sky-600 shrink-0" />,
          }

          const borderColors = {
            success: 'border-emerald-200 bg-emerald-50/95 text-emerald-950',
            warning: 'border-amber-200 bg-amber-50/95 text-amber-950',
            error: 'border-rose-200 bg-rose-50/95 text-rose-950',
            info: 'border-sky-200 bg-sky-50/95 text-sky-950',
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all duration-300 ${borderColors[toast.type]}`}
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                {icons[toast.type]}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
