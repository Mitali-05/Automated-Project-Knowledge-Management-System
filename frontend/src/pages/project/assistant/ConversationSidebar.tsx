import { useState } from 'react'
import { Plus, MessageSquare, Trash2, Clock, Edit2, Check, X } from 'lucide-react'
import type { ChatConversation } from '../../../api/types'
import { formatDate } from '../../../lib/format'
import { cn } from '../../../lib/cn'
import { LoadingState } from '../../../components/ui/States'

interface ConversationSidebarProps {
  conversations: ChatConversation[]
  activeId: number | null
  onSelect: (id: number) => void
  onNewChat: () => void
  onDelete: (id: number) => void
  onRename?: (id: number, newTitle: string) => void
  loading?: boolean
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  loading = false,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const startEditing = (e: React.MouseEvent, c: ChatConversation) => {
    e.stopPropagation()
    setEditingId(c.id)
    setEditTitle(c.title || '')
  }

  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingId(null)
    setEditTitle('')
  }

  const submitEditing = (e: React.MouseEvent | React.FormEvent, id: number) => {
    e.stopPropagation()
    if (editTitle.trim() && onRename) {
      onRename(id, editTitle.trim())
    }
    setEditingId(null)
    setEditTitle('')
  }

  return (
    <div className="flex flex-col h-full border-r border-surface-border bg-surface-background/40 w-72 shrink-0">
      <div className="p-3 border-b border-surface-border">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-indigo px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-indigo/90 transition-all cursor-pointer"
        >
          <Plus size={16} aria-hidden />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Recent Conversations
        </div>

        {loading && conversations.length === 0 && <LoadingState rows={1} label="Loading conversations..." />}
        {conversations.length === 0 && !loading && (
          <div className="p-4 text-center text-xs text-text-muted">
            No past conversations yet.
          </div>
        )}

        {conversations.map((c) => {
          const isActive = c.id === activeId
          const isEditing = c.id === editingId

          if (isEditing) {
            return (
              <div
                key={c.id}
                className="flex items-center gap-1.5 rounded-xl p-2 bg-surface-card border border-primary-indigo/60 shadow-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitEditing(e, c.id)
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  autoFocus
                  className="flex-1 rounded-md px-2 py-1 text-xs border border-surface-border bg-surface-background focus:outline-hidden focus:ring-1 focus:ring-primary-indigo"
                />
                <button
                  type="button"
                  onClick={(e) => submitEditing(e, c.id)}
                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                  title="Save"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="rounded p-1 text-text-muted hover:bg-surface-border cursor-pointer"
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            )
          }

          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                'group flex items-center justify-between gap-2 rounded-xl p-2.5 text-left text-xs transition-all cursor-pointer',
                isActive
                  ? 'bg-primary-light-indigo/60 text-primary-indigo font-semibold shadow-xs'
                  : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MessageSquare size={14} className={isActive ? 'text-primary-indigo shrink-0' : 'text-text-muted shrink-0'} aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.title || 'Conversation'}</p>
                  <p className="text-[10px] text-text-muted flex items-center gap-1">
                    <Clock size={10} aria-hidden />
                    <span>{formatDate(c.updatedAt)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onRename && (
                  <button
                    type="button"
                    onClick={(e) => startEditing(e, c)}
                    className="rounded p-1 text-text-muted hover:text-primary-indigo hover:bg-surface-border/60 transition-colors"
                    title="Rename"
                  >
                    <Edit2 size={12} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this conversation?')) {
                      onDelete(c.id)
                    }
                  }}
                  className="rounded p-1 text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete conversation"
                >
                  <Trash2 size={12} aria-hidden />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
