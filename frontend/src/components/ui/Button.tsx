import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-indigo ' +
  'disabled:opacity-50 disabled:pointer-events-none'

const variants = {
  primary:
    'bg-gradient-to-r from-primary-blue to-primary-indigo text-white hover:from-primary-indigo hover:to-primary-violet shadow-sm',
  secondary: 'bg-primary-light-indigo text-primary-blue hover:bg-primary-light-indigo/70',
  outline: 'border border-surface-border bg-transparent hover:bg-surface-background text-text-primary',
  ghost: 'bg-transparent hover:bg-surface-background text-text-secondary hover:text-text-primary',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 py-2 text-sm',
  lg: 'h-12 px-8 text-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, type = 'button', disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
