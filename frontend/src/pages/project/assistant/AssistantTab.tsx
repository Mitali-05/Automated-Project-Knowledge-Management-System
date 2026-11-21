import { useState, useEffect, useRef, useCallback } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { Sparkles, PanelLeft, Plus } from 'lucide-react'
import { assistantApi } from '../../../api/endpoints'
import type { ChatConversation, ChatMessage } from '../../../api/types'
import type { ProjectContext } from '../ProjectLayout'
import { ConversationSidebar } from './ConversationSidebar'
import { AssistantWelcome } from './AssistantWelcome'
import { ChatMessageView } from './ChatMessageView'
import { ChatInput } from './ChatInput'
import { AssistantLoadingState } from './AssistantLoadingState'
import { ErrorState, LoadingState } from '../../../components/ui/States'

export default function AssistantTab() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const { detail } = useOutletContext<ProjectContext>()
  const project = detail.project

  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingMessages, setFetchingMessages] = useState(false)
  const [fetchingConversations, setFetchingConversations] = useState(true)
  const [historyAttempt, setHistoryAttempt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true)
    }
  }, [])

  useEffect(() => {
    setActiveId(null)
    setMessages([])
    setError(null)
    setInput('')
    setLastFailedMessage(null)
  }, [id])

  const loadConversations = useCallback(async () => {
    setFetchingConversations(true)
    try {
      const list = await assistantApi.conversations(id)
      setConversations(list)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load conversations')
    } finally {
      setFetchingConversations(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      void loadConversations()
    }
  }, [id, loadConversations])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      setFetchingMessages(false)
      return
    }

    let cancelled = false
    setFetchingMessages(true)
    setMessages([])
    setError(null)

    assistantApi.messages(id, activeId)
      .then((msgs) => {
        if (!cancelled) {
          setMessages(msgs)
          setFetchingMessages(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load conversation')
          setFetchingMessages(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, activeId, historyAttempt])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (messageToSend?: string, isRetry = false) => {
    const text = (messageToSend || input).trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setLastFailedMessage(text)

    if (!isRetry) {
      const tempUserMsg: ChatMessage = {
        id: Date.now(),
        role: 'user',
        content: text,
        citations: [],
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempUserMsg])
    }
    setLoading(true)

    try {
      const res = await assistantApi.chat(id, text, activeId ?? undefined)

      if (!activeId || activeId !== res.conversationId) {
        setActiveId(res.conversationId)
      }

      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.message,
        citations: res.citations,
        freshnessWarning: res.freshnessWarning,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setLastFailedMessage(null)
      void loadConversations()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate response')
      void loadConversations()
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    setActiveId(null)
    setMessages([])
    setError(null)
    setInput('')
    setLastFailedMessage(null)
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const handleDeleteConversation = async (convId: number) => {
    try {
      await assistantApi.deleteConversation(id, convId)
      if (activeId === convId) {
        setActiveId(null)
        setMessages([])
        setError(null)
        setInput('')
        setLastFailedMessage(null)
      }
      void loadConversations()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete this conversation')
    }
  }

  const handleRenameConversation = async (convId: number, newTitle: string) => {
    try {
      await assistantApi.renameConversation(id, convId, newTitle)
      void loadConversations()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not rename this conversation')
    }
  }

  const handleRegenerate = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        void handleSend(messages[i].content, true)
        return
      }
    }
  }

  return (
    <div className="relative flex h-[calc(100dvh-13rem)] sm:h-[calc(100vh-14rem)] min-h-[460px] sm:min-h-[550px] w-full overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-sm">
      {sidebarOpen && (
        <div className="absolute inset-0 z-30 flex md:hidden">
          <div className="relative z-10 h-full w-72 max-w-[85vw] shadow-2xl">
            <ConversationSidebar
              loading={fetchingConversations}
              conversations={conversations}
              activeId={activeId}
              onSelect={(convId) => {
                setActiveId(convId)
                setSidebarOpen(false)
              }}
              onNewChat={handleNewChat}
              onDelete={handleDeleteConversation}
              onRename={handleRenameConversation}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
          <button
            type="button"
            className="flex-1 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
            aria-label="Close conversation list"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {sidebarOpen && (
        <fieldset disabled={loading} className="hidden md:block min-w-0 border-0 p-0 h-full">
          <ConversationSidebar
            loading={fetchingConversations}
            conversations={conversations}
            activeId={activeId}
            onSelect={(convId) => {
              setActiveId(convId)
            }}
            onNewChat={handleNewChat}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
          />
        </fieldset>
      )}

      <div className="flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-surface-card relative">
        <div className="flex items-center justify-between border-b border-surface-border px-3 sm:px-4 py-3 bg-surface-card z-10">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl p-1.5 text-text-muted hover:bg-surface-border/50 hover:text-text-primary transition-colors cursor-pointer shrink-0"
              title="Toggle conversations"
              aria-label="Toggle conversations"
            >
              <PanelLeft size={18} aria-hidden />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
                <Sparkles size={14} aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-text-primary truncate max-w-[130px] sm:max-w-xs md:max-w-md">
                  {conversations.find((c) => c.id === activeId)?.title || 'Ask PRISM'}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-text-muted truncate">{project.name} Knowledge Assistant</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleNewChat}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-background px-2.5 py-1 text-xs font-semibold text-primary-indigo hover:bg-primary-light-indigo/50 transition-colors cursor-pointer"
            >
              <Plus size={13} aria-hidden />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4">
          {error && (
            <div className="mb-4">
              <ErrorState
                message={error}
                onRetry={() => {
                  const retryText = lastFailedMessage || input
                  if (retryText) {
                    void handleSend(retryText, true)
                  } else if (activeId) setHistoryAttempt((n) => n + 1)
                  else void loadConversations()
                }}
              />
            </div>
          )}

          {messages.length === 0 && !loading && !fetchingMessages && (
            <AssistantWelcome
              projectName={project.name}
              onSelectQuestion={(q) => void handleSend(q)}
            />
          )}

          {fetchingMessages && (
            <LoadingState rows={2} label="Loading conversation history..." />
          )}

          {messages.map((m, idx) => (
            <ChatMessageView
              key={m.id}
              message={m}
              isLast={idx === messages.length - 1}
              onRegenerate={handleRegenerate}
            />
          ))}

          {loading && <AssistantLoadingState />}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-surface-border bg-surface-card p-2.5 sm:p-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => void handleSend()}
              disabled={loading}
              placeholder={`Ask anything about ${project.name}...`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
