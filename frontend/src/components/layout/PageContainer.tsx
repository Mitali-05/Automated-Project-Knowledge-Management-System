import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function PageContainer({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`mx-auto w-full min-w-0 max-w-full space-y-6 sm:space-y-8 p-3.5 sm:p-6 md:p-8 ${narrow ? 'max-w-3xl' : 'max-w-7xl'}`}
    >
      {children}
    </motion.div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-xs sm:text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}
