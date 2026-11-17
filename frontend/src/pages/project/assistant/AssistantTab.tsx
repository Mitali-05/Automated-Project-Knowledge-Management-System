import { useState, useEffect, useRef, useCallback } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { Sparkles, PanelLeft } from 'lucide-react'
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
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    <div className="flex h-[calc(100vh-14rem)] min-h-[550px] w-full overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-sm">
      {sidebarOpen && (
        <fieldset disabled={loading} className="min-w-0 border-0 p-0">
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

      <div className="flex flex-1 flex-col h-full overflow-hidden bg-surface-card relative">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3 bg-surface-card z-10">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-1.5 text-text-muted hover:bg-surface-border/50 hover:text-text-primary transition-colors cursor-pointer"
              title="Toggle sidebar"
            >
              <PanelLeft size={18} aria-hidden />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
                <Sparkles size={14} aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {conversations.find((c) => c.id === activeId)?.title || 'Ask PRISM'}
                </h3>
                <p className="text-[11px] text-text-muted">{project.name} Knowledge Assistant</p>
              </div>
            </div>
          </div>
          {activeId && !sidebarOpen && (
            <button
              type="button"
              onClick={handleNewChat}
              disabled={loading}
              className="text-xs font-semibold text-primary-indigo hover:underline cursor-pointer"
            >
              Start New Chat
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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

        <div className="border-t border-surface-border bg-surface-card p-4">
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
