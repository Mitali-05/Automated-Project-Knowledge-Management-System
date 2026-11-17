import { Sparkles } from 'lucide-react'

export function AssistantLoadingState() {
  return (
    <div className="flex gap-3.5 mb-6 justify-start items-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-sm mt-0.5 animate-pulse">
        <Sparkles size={16} aria-hidden />
      </div>
      <div className="rounded-2xl rounded-tl-xs border border-surface-border/80 bg-surface-card px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-muted">PRISM is synthesizing answer...</span>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-indigo animate-bounce [animation-delay:-0.3s]"></span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary-indigo animate-bounce [animation-delay:-0.15s]"></span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary-indigo animate-bounce"></span>
          </div>
        </div>
      </div>
    </div>
  )
}
