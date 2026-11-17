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
  MessageSquare,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react'
import type { JiraIssueSnapshot } from '../../api/jira'
import { formatDate, timeAgo, safeUrl } from '../../lib/format'

export type JiraIssue = JiraIssueSnapshot['issues'][0]

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
        className="h-full w-full max-w-2xl overflow-y-auto bg-surface-card p-6 md:p-8 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50/80 border border-blue-200/80 px-2.5 py-1 text-xs font-bold text-blue-800">
              {renderTypeIcon(issue.issue_type)}
              <span>{issue.issue_key}</span>
            </span>
            {renderStatusLozenge(issue.status)}
            {renderPriorityBadge(issue.priority)}
          </div>
          <div className="flex items-center gap-2">
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
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-background hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-text-primary leading-snug">
            {issue.summary}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              <span>Updated {timeAgo(issue.source_updated_at)} ({formatDate(issue.source_updated_at)})</span>
            </span>
            <span className="text-surface-border">•</span>
            <span className="capitalize">{issue.issue_type}</span>
          </div>
        </div>

        {/* PRISM Knowledge & Engineering Traceability Card */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-surface-card to-purple-50/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-indigo">
            <Sparkles size={14} />
            <span>PRISM Architectural Traceability</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            This Jira requirement is linked to the repository's verified architecture. PRISM uses imported acceptance criteria and issue specifications to validate technical implementation while keeping business requirements cleanly distinguished from inspected runtime code.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-text-muted">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>Requirements provenance tracked under Atlassian OAuth integration</span>
          </div>
        </div>

        {/* Acceptance Criteria */}
        {issue.acceptance_criteria ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <CheckCheck size={16} className="text-emerald-600" />
              <span>Acceptance Criteria</span>
            </div>
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap rounded-xl bg-surface-card/90 p-4 border border-emerald-200/50">
              {issue.acceptance_criteria}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-surface-border p-3 text-xs text-text-muted flex items-center gap-2">
            <CheckSquare size={14} className="text-text-muted" />
            <span>No explicit acceptance criteria recorded for this issue.</span>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <FileText size={14} />
            <span>Description</span>
          </h3>
          {issue.description ? (
            <div className="rounded-2xl border border-surface-border bg-surface-background/40 p-4 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
              {issue.description}
            </div>
          ) : (
            <p className="text-sm italic text-text-muted py-2">No description provided in Jira.</p>
          )}
        </div>

        {/* Discussions & Comments */}
        {issue.comments && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <MessageSquare size={14} />
              <span>Imported Discussions & Comments</span>
            </h3>
            <div className="rounded-2xl border border-surface-border bg-surface-card p-4 space-y-3 text-xs text-text-secondary whitespace-pre-wrap break-words leading-relaxed">
              {issue.comments}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="border-t border-surface-border/60 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
          <span>Key: <strong className="text-text-primary font-mono">{issue.issue_key}</strong></span>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary-indigo hover:underline"
            >
              View original issue on Atlassian <ExternalLink size={12} />
            </a>
          )}
        </div>
      </motion.aside>
    </motion.div>
  )
}
