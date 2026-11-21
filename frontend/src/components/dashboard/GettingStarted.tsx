import { Check, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GettingStartedStep } from '../../lib/gettingStarted'
import { Card } from '../ui/Card'

export function GettingStarted({ steps }: { steps: GettingStartedStep[] }) {
  const done = steps.filter((s) => s.done).length
  return (
    <Card className="border-primary-indigo/20 bg-gradient-to-br from-primary-light-indigo/60 to-surface-card p-4 sm:p-6">
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold">Getting started</h2>
        <span className="text-xs sm:text-sm text-text-secondary">{done} of {steps.length} done</span>
      </div>
      <div className="mb-4 sm:mb-5 h-1.5 overflow-hidden rounded-full bg-surface-border" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary-blue to-primary-violet transition-all duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm">
            {s.done
              ? <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-success text-white"><Check size={12} className="sm:w-[14px] sm:h-[14px]" aria-hidden /></span>
              : <Circle size={20} className="sm:w-6 sm:h-6 shrink-0 text-text-muted" aria-hidden />}
            <span className={s.done ? 'text-text-muted line-through truncate' : 'font-medium text-text-primary truncate'}>{s.label}</span>
            {!s.done && <Link to={s.to} className="ml-auto shrink-0 text-xs font-semibold text-primary-indigo hover:text-primary-violet">{s.cta}</Link>}
          </li>
        ))}
      </ul>
    </Card>
  )
}
