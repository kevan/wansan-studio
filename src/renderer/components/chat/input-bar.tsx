import React, { useState, useRef, useEffect } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Database, ArrowUp, X, CornerDownRight } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useChatStore } from '../../stores/useChatStore'
import type { ChatMessage } from '../ChatInterface'

interface InputBarProps {
  onSubmit: (value: string) => void
  loading?: boolean
  placeholder?: string
  tableName?: string
  columns?: string[]
  messages: ChatMessage[]
}

export function InputBar({
  onSubmit,
  loading,
  placeholder = 'Ask data...',
  tableName,
  columns = [],
  messages,
}: InputBarProps) {
  const [value, setValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const replyToId = useChatStore(state => state.replyToId)
  const setReplyTo = useChatStore(state => state.setReplyTo)

  const replyMessage = messages.find(m => m.id === replyToId)
  const replyPreview =
    replyMessage?.content ||
    replyMessage?.reportData?.title ||
    replyMessage?.reportData?.summary ||
    (replyMessage ? 'Chart Analysis' : '')

  // Filter columns based on text after '@'
  const getSearchTerm = () => {
    const textBeforeCursor = value.slice(0, cursorPosition)
    const lastAt = textBeforeCursor.lastIndexOf('@')
    if (lastAt === -1) return null
    return textBeforeCursor.slice(lastAt + 1)
  }

  const searchTerm = getSearchTerm()

  const filteredColumns = columns.filter(
    col =>
      searchTerm !== null &&
      col.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (searchTerm !== null && filteredColumns.length > 0) {
      setShowSuggestions(true)
      setSuggestionIndex(0)
    } else {
      setShowSuggestions(false)
    }
  }, [value, cursorPosition])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggestionIndex(i => (i + 1) % filteredColumns.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggestionIndex(
          i => (i - 1 + filteredColumns.length) % filteredColumns.length
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertColumn(filteredColumns[suggestionIndex])
        return
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const insertColumn = (colName: string) => {
    const textBeforeCursor = value.slice(0, cursorPosition)
    const textAfterCursor = value.slice(cursorPosition)
    const lastAt = textBeforeCursor.lastIndexOf('@')

    if (lastAt !== -1) {
      const newValue =
        textBeforeCursor.slice(0, lastAt) + `[${colName}] ` + textAfterCursor
      setValue(newValue)
      // Focus will be lost on re-render, need to handle it if strictly required,
      // but for now relying on state update.
      setShowSuggestions(false)

      // Need to defer focus restore and cursor move
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const newPos = lastAt + colName.length + 3 // [ + ] + space
          textareaRef.current.setSelectionRange(newPos, newPos)
        }
      }, 0)
    }
  }

  const handleSubmit = () => {
    if (!value.trim() || loading) return
    onSubmit(value)
    setValue('')
  }

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasContent = value.trim().length > 0

  return (
    <div className="relative w-full flex justify-center" ref={containerRef}>
      {/* Replying banner */}
      {replyToId && replyMessage && (
        <div className="absolute -top-14 w-[80%] max-w-3xl bg-zinc-50 border border-b-0 rounded-t-2xl px-3 py-2 text-xs flex items-center justify-between z-[55] shadow-sm">
          <div className="flex items-center gap-2 text-zinc-600 min-w-0">
            <CornerDownRight className="h-3 w-3" />
            <span className="font-medium text-zinc-700">Refining Analysis:</span>
            <span className="truncate max-w-[240px] italic">
              {replyPreview}
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="hover:bg-zinc-200 p-1 rounded transition-colors"
            aria-label="Cancel reply"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Suggestions Popover */}
      {showSuggestions && (
        <div className="absolute bottom-full left-[10%] mb-2 w-64 bg-white rounded-lg shadow-xl border border-zinc-200 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-medium text-zinc-500 flex items-center gap-2">
            <Database className="w-3 h-3" />
            可用列名
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredColumns.map((col, idx) => (
              <button
                key={col}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors',
                  idx === suggestionIndex
                    ? 'bg-orange-50 text-orange-900'
                    : 'hover:bg-zinc-100 text-zinc-700'
                )}
                onClick={() => insertColumn(col)}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />
                {col}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Container */}
      <div
        className={cn(
          'w-[80%] max-w-3xl mb-6 rounded-3xl border border-zinc-200 shadow-xl bg-white z-50 flex items-end gap-2 transition-all duration-200 outline-none',
          replyToId && replyMessage && 'rounded-t-none border-t-0 mt-12'
        )}
      >
        <div className="flex-1 min-w-0 py-4 pl-6">
          <TextareaAutosize
            ref={textareaRef}
            minRows={1}
            maxRows={8}
            placeholder={placeholder}
            className="w-full resize-none bg-transparent border-none shadow-none outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base text-zinc-900 placeholder:text-zinc-400 leading-relaxed"
            value={value}
            onChange={e => {
              setValue(e.target.value)
              setCursorPosition(e.target.selectionStart)
            }}
            onSelect={e => setCursorPosition(e.currentTarget.selectionStart)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>

        {/* Send Button - Only show when there is content or loading */}
        {(hasContent || loading) && (
          <div className="pr-2 pb-2 animate-in fade-in zoom-in duration-200">
            <button
              onClick={handleSubmit}
              disabled={!hasContent || loading}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200',
                hasContent && !loading
                  ? 'bg-black text-white hover:bg-zinc-800 shadow-md active:scale-95'
                  : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
              )}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[3]" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
