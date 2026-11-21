import { useState, useEffect } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, RefreshCw, Terminal, AlertCircle, ShieldAlert, Sparkles, Layers, Cpu } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExtractionSyncStatus } from '../../api/types'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/cn'

interface SyncProgressSectionProps {
  status: ExtractionSyncStatus | null
  onRetry: () => void
  isRetrying?: boolean
}

interface StageDef {
  key: string
  label: string
  desc: string
  minProgress: number
  icon: typeof RefreshCw
}

const STAGES: StageDef[] = [
  { key: 'init', label: 'Initialization', desc: 'Starting extraction pipeline and worker', minProgress: 0, icon: Sparkles },
  { key: 'connect', label: 'GitHub Connection', desc: 'Validating authorization and fetching tree', minProgress: 20, icon: Cpu },
  { key: 'extract', label: 'Knowledge Extraction', desc: 'AI agent synthesizing architecture & decisions', minProgress: 35, icon: Layers },
  { key: 'embeddings', label: 'Vector Indexing', desc: 'Generating Gemini embeddings and storage', minProgress: 70, icon: RefreshCw },
  { key: 'drift', label: 'Drift & Freshness', desc: 'Comparing baseline commits and references', minProgress: 85, icon: ShieldAlert },
  { key: 'complete', label: 'Finalization', desc: 'Sync completed and blueprints ready', minProgress: 100, icon: CheckCircle2 },
]

export function SyncProgressSection({ status, onRetry, isRetrying = false }: SyncProgressSectionProps) {
  const [logsExpanded, setLogsExpanded] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const isActive = status?.active ?? false
  const isFailed = status?.status === 'FAILED'
  const isCompleted = status?.status === 'COMPLETED'
  const progress = Math.min(100, Math.max(0, status?.progress ?? (isActive ? 15 : 0)))

  useEffect(() => {
    if (!status?.startedAt) {
      setElapsed(0)
      return
    }
    const startTime = new Date(status.startedAt).getTime()
    const updateElapsed = () => {
      const endTime = status.completedAt ? new Date(status.completedAt).getTime() : Date.now()
      setElapsed(Math.max(0, Math.floor((endTime - startTime) / 1000)))
    }
    updateElapsed()

    if (isActive) {
      const interval = setInterval(updateElapsed, 1000)
      return () => clearInterval(interval)
    }
  }, [status?.startedAt, status?.completedAt, isActive])

  const getCurrentStageIndex = () => {
    if (isCompleted) return STAGES.length - 1
    if (isFailed) {
      for (let i = STAGES.length - 1; i >= 0; i--) {
        if (progress >= STAGES[i].minProgress) return i
      }
      return 0
    }
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (progress >= STAGES[i].minProgress) return i
    }
    return 0
  }

  const currentStageIdx = getCurrentStageIndex()

  return (
    <CardContainer>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-surface-border/70 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors',
            isActive ? 'bg-primary-light-indigo text-primary-indigo animate-pulse' :
            isCompleted ? 'bg-emerald-50 text-emerald-600' :
            isFailed ? 'bg-red-50 text-red-600' : 'bg-surface-border/50 text-text-muted'
          )}>
            {isActive ? (
              <RefreshCw size={20} className="animate-spin text-primary-indigo" />
            ) : isCompleted ? (
              <CheckCircle2 size={22} className="text-emerald-600" />
            ) : isFailed ? (
              <AlertCircle size={22} className="text-red-600" />
            ) : (
              <Layers size={20} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-text-primary">
                {isActive ? 'Repository Knowledge Extraction in Progress' :
                 isCompleted ? 'Knowledge Synchronization Completed' :
                 isFailed ? 'Repository Extraction Failed' : 'Knowledge Synchronization'}
              </h3>
              <Badge variant={
                isActive ? 'primary' :
                isCompleted ? 'success' :
                isFailed ? 'danger' : 'default'
              }>
                {status?.status || 'IDLE'}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5 truncate">
              {status?.statusMessage || (isActive ? 'Autonomous agents analyzing repository...' : 'Pipeline idle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary self-start sm:self-center">
          <div className="flex items-center gap-1.5 font-mono">
            <Clock size={14} className="text-text-muted" />
            <span>{elapsed}s elapsed</span>
          </div>
          {status?.itemsExtracted != null && status.itemsExtracted > 0 && (
            <div className="rounded-lg bg-surface-border/60 px-2.5 py-1 font-semibold text-text-primary">
              {status.itemsExtracted} items extracted
            </div>
          )}
          {isFailed && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 text-xs h-8"
              onClick={onRetry}
              isLoading={isRetrying}
            >
              <RefreshCw size={12} className="mr-1" /> Retry Extraction
            </Button>
          )}
        </div>
      </div>

      <div className="py-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-text-secondary">{status?.stage || 'Extraction Progress'}</span>
          <span className="font-mono text-primary-indigo font-bold">{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-border/70 relative">
          <motion.div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-primary-indigo via-indigo-600 to-purple-600'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-2 pb-4">
        {STAGES.map((s, idx) => {
          const isPassed = !isFailed && (currentStageIdx > idx || isCompleted)
          const isCurrent = !isCompleted && !isFailed && currentStageIdx === idx
          const isStageFailed = isFailed && currentStageIdx === idx
          const Icon = s.icon

          return (
            <div
              key={s.key}
              className={cn(
                'flex flex-col justify-between rounded-xl p-2.5 sm:p-3 border transition-all text-left min-w-0',
                isCurrent ? 'border-primary-indigo bg-indigo-50/50 shadow-xs ring-1 ring-primary-indigo/30' :
                isPassed ? 'border-emerald-200 bg-emerald-50/30' :
                isStageFailed ? 'border-red-300 bg-red-50/50' :
                'border-surface-border/60 bg-surface-card opacity-60'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold shrink-0',
                  isCurrent ? 'bg-primary-indigo text-white animate-spin' :
                  isPassed ? 'bg-emerald-600 text-white' :
                  isStageFailed ? 'bg-red-600 text-white' :
                  'bg-surface-border text-text-muted'
                )}>
                  {isCurrent ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : isPassed ? (
                    <CheckCircle2 size={13} />
                  ) : isStageFailed ? (
                    <AlertCircle size={13} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </span>
                <Icon size={14} className={cn(
                  'shrink-0',
                  isCurrent ? 'text-primary-indigo' :
                  isPassed ? 'text-emerald-600' :
                  isStageFailed ? 'text-red-600' : 'text-text-muted'
                )} />
              </div>
              <div className="min-w-0">
                <p className={cn(
                  'text-xs font-bold truncate',
                  isCurrent ? 'text-primary-indigo' :
                  isPassed ? 'text-emerald-800' :
                  isStageFailed ? 'text-red-800' : 'text-text-secondary'
                )}>
                  {s.label}
                </p>
                <p className="text-[10px] text-text-muted line-clamp-2 mt-0.5 leading-tight">
                  {s.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {isFailed && status?.errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-900 mb-2">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold">Extraction Error Details:</span>
              <p className="mt-0.5 font-mono text-[11px] text-red-800 whitespace-pre-wrap break-words">{status.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {status?.logs && (
        <div className="border-t border-surface-border/70 pt-3">
          <button
            type="button"
            onClick={() => setLogsExpanded(!logsExpanded)}
            className="flex w-full items-center justify-between text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-mono">
              <Terminal size={14} className="text-primary-indigo" />
              <span>Live Execution Logs</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              {logsExpanded ? 'Hide' : 'Show'} details
              {logsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          <AnimatePresence>
            {logsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-slate-100 shadow-inner"
              >
                <pre className="max-h-56 overflow-y-auto overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-300">
                  {status.logs}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </CardContainer>
  )
}

function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-surface-card via-surface-card to-indigo-50/40 p-4 sm:p-5 shadow-sm space-y-2">
      {children}
    </div>
  )
}
