import React, { useState } from 'react'
import { AlertTriangle, Check, Copy, Sparkles, User as UserIcon, RotateCw } from 'lucide-react'
import type { ChatMessage } from '../../../api/types'
import { SourceCitationCard } from './SourceCitationCard'
import { cn } from '../../../lib/cn'

interface ChatMessageViewProps {
  message: ChatMessage
  onRegenerate?: () => void
  isLast?: boolean
}

export function ChatMessageView({ message, onRegenerate, isLast }: ChatMessageViewProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const copyContent = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const renderContent = (content: string) => {
    const lines = content.split('\n')
    let inCodeBlock = false
    let codeLanguage = ''
    let codeBuffer: string[] = []
    let inTable = false
    let tableBuffer: string[] = []
    const renderedNodes: React.ReactNode[] = []

    const flushTable = (key: string) => {
      if (tableBuffer.length === 0) return
      const rows = tableBuffer.map(r =>
        r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
      )
      if (rows.length >= 2) {
        const headerRow = rows[0]
        const dataRows = rows.slice(rows[1].every(c => /^:?-+:?$/.test(c)) ? 2 : 1)
        renderedNodes.push(
          <div key={key} className="my-3 max-w-full overflow-x-auto rounded-xl border border-surface-border bg-surface-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-primary-light-indigo/50 text-text-primary border-b border-surface-border font-semibold">
                <tr>
                  {headerRow.map((h, hi) => (
                    <th key={hi} className="px-3.5 py-2.5 whitespace-nowrap">{renderInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {dataRows.map((dr, ri) => (
                  <tr key={ri} className="hover:bg-surface-border/20 transition-colors">
                    {dr.map((c, ci) => (
                      <td key={ci} className="px-3.5 py-2 text-text-secondary">{renderInline(c)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      tableBuffer = []
      inTable = false
    }

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (inTable) flushTable(`tbl-${idx}`)
        if (inCodeBlock) {
          const codeText = codeBuffer.join('\n')
          renderedNodes.push(
            <div key={`code-${idx}`} className="my-3 max-w-full overflow-hidden rounded-xl border border-surface-border bg-slate-900 text-slate-100 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-3.5 py-1.5 text-[11px] font-mono text-slate-400">
                <span>{codeLanguage || 'code'}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(codeText)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  <Copy size={12} />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3.5 text-xs font-mono max-w-full overflow-x-auto whitespace-pre leading-relaxed">
                <code>{codeText}</code>
              </pre>
            </div>
          )
          codeBuffer = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
          codeLanguage = line.slice(3).trim()
        }
        return
      }

      if (inCodeBlock) {
        codeBuffer.push(line)
        return
      }

      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        inTable = true
        tableBuffer.push(line)
        return
      } else if (inTable) {
        flushTable(`tbl-${idx}`)
      }

      if (line.startsWith('### ')) {
        renderedNodes.push(
          <h4 key={idx} className="mt-3.5 mb-1.5 text-sm font-bold text-text-primary">
            {line.slice(4)}
          </h4>
        )
        return
      }

      if (line.startsWith('## ')) {
        renderedNodes.push(
          <h3 key={idx} className="mt-4 mb-2 text-base font-bold text-text-primary border-b border-surface-border/50 pb-1">
            {line.slice(3)}
          </h3>
        )
        return
      }

      if (line.startsWith('# ')) {
        renderedNodes.push(
          <h2 key={idx} className="mt-5 mb-2.5 text-lg font-bold text-text-primary">
            {line.slice(2)}
          </h2>
        )
        return
      }

      if (line.startsWith('> ')) {
        renderedNodes.push(
          <blockquote key={idx} className="my-2 border-l-3 border-primary-indigo pl-3.5 py-1 text-xs italic text-text-secondary bg-primary-light-indigo/20 rounded-r-lg">
            {renderInline(line.slice(2))}
          </blockquote>
        )
        return
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        renderedNodes.push(
          <li key={idx} className="ml-4 list-disc text-sm text-text-secondary leading-relaxed">
            {renderInline(line.slice(2))}
          </li>
        )
        return
      }

      if (/^\d+\.\s/.test(line)) {
        const itemText = line.replace(/^\d+\.\s/, '')
        renderedNodes.push(
          <li key={idx} className="ml-4 list-decimal text-sm text-text-secondary leading-relaxed">
            {renderInline(itemText)}
          </li>
        )
        return
      }

      if (line.trim() === '') {
        renderedNodes.push(<div key={idx} className="h-2" />)
        return
      }

      renderedNodes.push(
        <p key={idx} className="text-sm text-text-secondary leading-relaxed break-words">
          {renderInline(line)}
        </p>
      )
    })

    if (inTable) {
      flushTable(`tbl-end`)
    }

    return renderedNodes
  }

  const renderInline = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[\d+\])/g)
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="rounded bg-surface-background px-1.5 py-0.5 font-mono text-xs text-primary-indigo font-semibold border border-surface-border break-all">
            {part.slice(1, -1)}
          </code>
        )
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-text-primary">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (/^\[\d+\]$/.test(part)) {
        const num = part.slice(1, -1)
        return (
          <span key={i} className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.2 rounded-md bg-primary-light-indigo font-bold text-[11px] text-primary-indigo shadow-2xs">
            {num}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className={cn('flex gap-2.5 sm:gap-3.5 mb-5 sm:mb-6 group', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-sm mt-0.5">
          <Sparkles size={15} aria-hidden />
        </div>
      )}

      <div className={cn('min-w-0 max-w-full sm:max-w-3xl space-y-2', isUser ? 'items-end' : 'items-start flex-1')}>
        <div
          className={cn(
            'rounded-2xl p-3.5 sm:p-4 transition-all duration-200 break-words',
            isUser
              ? 'bg-primary-indigo text-white shadow-xs ml-auto rounded-tr-xs max-w-[90%] sm:max-w-[80%]'
              : 'bg-surface-card border border-surface-border/80 text-text-primary shadow-xs rounded-tl-xs w-full'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
          ) : (
            <div className="space-y-1">{renderContent(message.content)}</div>
          )}
        </div>

        {!isUser && message.freshnessWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 shadow-xs">
            <AlertTriangle size={15} className="shrink-0 text-amber-600 mt-0.5" aria-hidden />
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold">Freshness Advisory:</span>
              <p className="text-amber-800 leading-normal break-words">{message.freshnessWarning}</p>
            </div>
          </div>
        )}

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              Sources & Evidence ({message.citations.length})
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {message.citations.map((c) => (
                <SourceCitationCard key={c.index} citation={c} />
              ))}
            </div>
          </div>
        )}

        {!isUser && (
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-text-muted opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={copyContent}
              className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-border/60 hover:text-text-primary transition-colors cursor-pointer"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied answer' : 'Copy answer'}</span>
            </button>
            {isLast && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-border/60 hover:text-text-primary transition-colors cursor-pointer"
              >
                <RotateCw size={12} />
                <span>Regenerate response</span>
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-surface-border/80 text-text-secondary shadow-xs mt-0.5">
          <UserIcon size={15} aria-hidden />
        </div>
      )}
    </div>
  )
}
