import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'
}

const variants = {
  default: 'bg-surface-border text-text-secondary',
  primary: 'bg-primary-light-indigo text-primary-indigo',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  outline: 'border border-surface-border bg-transparent text-text-secondary',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = 'default', ...props }, ref) => (
  <span
    ref={ref}
    className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)}
    {...props}
  />
))
Badge.displayName = 'Badge'

export type BadgeVariant = NonNullable<BadgeProps['variant']>
