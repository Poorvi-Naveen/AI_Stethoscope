import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 grid place-items-center text-slate-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg border bg-white py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
              leftIcon ? 'pl-9' : 'pl-3.5'
            } ${rightIcon ? 'pr-9' : 'pr-3.5'} ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-300 focus:border-brand-600 focus:ring-brand-100'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 grid place-items-center text-slate-400">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <p className="text-xs font-medium text-red-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
