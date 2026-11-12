import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/cn'

interface FieldProps {
  label?: string
  error?: string
  hint?: ReactNode
}

const fieldClass =
  'flex w-full rounded-lg border bg-surface-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-indigo transition-shadow disabled:cursor-not-allowed disabled:opacity-60'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, type = 'text', ...props }, ref) => {
    const id = useId()
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-primary">
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</div>}
          <input
            id={id}
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            aria-invalid={!!error}
            className={cn(fieldClass, 'h-10', icon && 'pl-9', isPassword && 'pr-10', error ? 'border-danger focus:ring-danger' : 'border-surface-border', className)}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
      </div>
    )
  },
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    const id = useId()
    return (
      <div className="w-full space-y-1.5">
        {label && <label htmlFor={id} className="block text-sm font-medium text-text-primary">{label}</label>}
        <textarea
          id={id}
          ref={ref}
          aria-invalid={!!error}
          className={cn(fieldClass, error ? 'border-danger focus:ring-danger' : 'border-surface-border', className)}
          {...props}
        />
        {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
