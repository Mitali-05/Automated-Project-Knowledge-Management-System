import { forwardRef, type HTMLAttributes } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../lib/cn'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-xl border border-surface-border bg-surface-card text-text-primary shadow-sm', className)}
    {...props}
  />
))
Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
))
CardTitle.displayName = 'CardTitle'

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

/** Card that lifts slightly on hover. Uses framer-motion's own prop types to avoid the onDrag clash. */
export const AnimatedCard = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    whileHover={{ scale: 1.01, y: -2 }}
    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    className={cn(
      'rounded-xl border border-surface-border bg-surface-card text-text-primary shadow-sm transition-shadow hover:border-primary-indigo/30 hover:shadow-md',
      className,
    )}
    {...props}
  />
))
AnimatedCard.displayName = 'AnimatedCard'
