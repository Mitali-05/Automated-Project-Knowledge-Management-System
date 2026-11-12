import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Standard padded, animated wrapper for app pages. */
export function PageContainer({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className={`mx-auto w-full space-y-8 p-6 md:p-8 ${narrow ? 'max-w-3xl' : 'max-w-7xl'}`}>
      {children}
    </motion.div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
