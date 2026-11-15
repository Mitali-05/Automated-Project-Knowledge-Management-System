import { useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/cn'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ value, onChange, onSend, disabled = false, placeholder = 'Ask PRISM about project architecture, modules, or decisions...' }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`
    }
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSend()
      }
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="relative rounded-2xl border border-surface-border bg-surface-card p-2 shadow-sm transition-all focus-within:border-primary-indigo/80 focus-within:ring-2 focus-within:ring-primary-indigo/20">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden disabled:opacity-50"
      />
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
        <span className="text-[11px] text-text-muted">
          <kbd className="rounded border border-surface-border px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send, <kbd className="rounded border border-surface-border px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> for newline
        </span>
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
            value.trim() && !disabled
              ? 'bg-primary-indigo text-white shadow-xs hover:bg-primary-indigo/90 cursor-pointer scale-100'
              : 'bg-surface-border/50 text-text-muted cursor-not-allowed scale-95'
          )}
          aria-label="Send message"
        >
          {disabled ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <ArrowUp size={16} strokeWidth={2.5} aria-hidden />
          )}
        </button>
      </div>
    </div>
  )
}
