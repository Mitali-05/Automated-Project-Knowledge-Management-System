import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-surface-border/50', className)} {...props} />
}
