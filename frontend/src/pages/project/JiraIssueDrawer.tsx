import { jiraStatusGroup } from '../../lib/jiraStatus'
import { motion } from 'framer-motion'
import {
  X,
  ExternalLink,
  CheckSquare,
  Bookmark,
  Bug,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import type { JiraIssueSnapshot } from '../../api/jira'
import { safeUrl } from '../../lib/format'

export type JiraIssue = JiraIssueSnapshot['issues'][0] & {
  epic_key?: string
  epic_name?: string
  reporter?: string
  assignee?: string
  project_name?: string
  project_key?: string
}

interface JiraIssueDrawerProps {
  issue: JiraIssue
  onClose: () => void
}

export function JiraIssueDrawer({ issue, onClose }: JiraIssueDrawerProps) {
  const url = safeUrl(issue.source_url)

  const renderTypeIcon = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('bug')) return <Bug size={14} className="text-red-600" />
    if (t.includes('story')) return <Bookmark size={14} className="text-emerald-600" />
    if (t.includes('epic')) return <Layers size={14} className="text-purple-600" />
    return <CheckSquare size={14} className="text-blue-600" />
  }

  const renderPriorityBadge = (priority: string) => {
    const p = (priority || '').toLowerCase()
    if (p.includes('highest') || p.includes('high') || p.includes('critical') || p.includes('blocker')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-700">
          <ArrowUp size={12} className="text-red-600" />
          <span>{priority || 'High'}</span>
        </span>
      )
    }
    if (p.includes('low') || p.includes('lowest') || p.includes('minor')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700">
          <ArrowDown size={12} className="text-blue-600" />
          <span>{priority || 'Low'}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
        <Minus size={12} className="text-amber-600" />
        <span>{priority || 'Medium'}</span>
      </span>
    )
  }

  const renderStatusLozenge = (status: string) => {
    const s = (status || '').toLowerCase()
    if (jiraStatusGroup(s) === 'Done') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
          <CheckCircle2 size={12} />
          <span>{status}</span>
        </span>
      )
    }
    if (jiraStatusGroup(s) === 'In Progress') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700">
          <Clock size={12} />
          <span>{status}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700">
        <span>{status || 'To Do'}</span>
      </span>
    )
  }

  return (
    <motion.div
      key="jira-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={issue.summary}
        initial={{ x: 50, opacity: 0.9 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className="h-full w-full max-w-full sm:max-w-xl md:max-w-2xl overflow-y-auto bg-surface-card p-4 sm:p-6 md:p-8 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50/80 border border-blue-200/80 px-2.5 py-1 text-xs font-bold text-blue-800">
              {renderTypeIcon(issue.issue_type)}
              <span>{issue.issue_key}</span>
            </span>
            {renderStatusLozenge(issue.status)}
            {renderPriorityBadge(issue.priority)}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-background px-3 py-1 text-xs font-semibold text-primary-indigo hover:bg-surface-border/40 transition-colors"
              >
                <span>Open in Jira</span>
                <ExternalLink size={13} aria-hidden />
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-surface-background hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-bold text-text-primary leading-snug break-words">
            {issue.summary}
          </h3>
          {issue.epic_key && (
            <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
              <span className="font-semibold text-text-muted uppercase tracking-wider text-[10px]">Epic:</span>
              <span className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 font-mono font-semibold">
                {issue.epic_key}
              </span>
              {issue.epic_name && <span className="text-text-muted">({issue.epic_name})</span>}
            </div>
          )}
        </div>

        {issue.description && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Description</h4>
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line bg-surface-background/60 p-4 rounded-xl border border-surface-border break-words">
              {issue.description}
            </div>
          </div>
        )}

        {issue.acceptance_criteria && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Acceptance Criteria</span>
            </h4>
            <div className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80 break-words font-mono">
              {issue.acceptance_criteria}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-surface-border p-4 bg-surface-background/40 space-y-2.5 text-xs text-text-secondary">
          <div className="flex justify-between items-center py-1 border-b border-surface-border/50">
            <span className="text-text-muted">Reporter</span>
            <span className="font-medium text-text-primary">{issue.reporter || 'Unassigned'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-surface-border/50">
            <span className="text-text-muted">Assignee</span>
            <span className="font-medium text-text-primary">{issue.assignee || 'Unassigned'}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-text-muted">Source Jira Project</span>
            <span className="font-medium text-text-primary">{issue.project_name || issue.project_key}</span>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  )
}
