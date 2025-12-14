import React, { useEffect, useMemo, useRef, useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import {
  ArrowUp,
  CornerDownRight,
  Database,
  Download,
  Eraser,
  FileSpreadsheet,
  Hash,
  X,
  Square,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useFileStore } from '../../stores/useFileStore'
import { useChatStore } from '../../stores/useChatStore'
import { useToastStore } from '../../stores/useToastStore'
import type { ChatMessage } from '../ChatInterface'
import { useTranslation } from 'react-i18next'

interface MagicInputProps {
  onSubmit: (value: string) => void
  loading?: boolean
  placeholder?: string
  messages: ChatMessage[]
  className?: string
}

type MentionState =
  | {
      active: true
      start: number
      query: string
    }
  | { active: false }

export function MagicInput({
  onSubmit,
  loading = false,
  placeholder = 'Ask about your data...',
  messages,
  className,
}: MagicInputProps) {
  const [value, setValue] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [mention, setMention] = useState<MentionState>({ active: false })
  const [mentionIndex, setMentionIndex] = useState(0)
  const [triggerType, setTriggerType] = useState<'table' | 'command' | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const replyToId = useChatStore(state => state.replyToId)
  const setReplyTo = useChatStore(state => state.setReplyTo)
  const rerunAnalysis = useChatStore(state => state.rerunAnalysis)
  const resetChat = useChatStore(state => state.reset)
  const stopGeneration = useChatStore(state => state.stopGeneration)
  const addToast = useToastStore(state => state.addToast)
  const files = useFileStore(state => state.files)
  const { t } = useTranslation('chat')

  const readyTables = useMemo(() => files.filter(f => f.status === 'ready'), [files])

  const replyMessage = messages.find(m => m.id === replyToId)
  const replyPreview =
    replyMessage?.content ||
    replyMessage?.reportData?.title ||
    replyMessage?.reportData?.summary ||
    (replyMessage ? t('reply_fallback') : '')

  const filteredTables = useMemo(() => {
    if (!mention.active) return []
    const q = mention.query.toLowerCase()
    return readyTables
      .filter(file => (file.name || '').toLowerCase().includes(q))
      .map(file => file.name || file.tableName || `table_${file.id.slice(0, 6)}`)
  }, [mention, readyTables])

  const handleCommand = (commandRaw: string) => {
    const command = commandRaw.trim().slice(1).toLowerCase()
    switch (command) {
      case 'clear':
        resetChat()
        addToast({
          title: t('chat_cleared'),
          type: 'info',
          duration: 2500,
        })
        return
      case 'export':
        addToast({
          title: t('export_triggered'),
          description: t('export_desc'),
          type: 'info',
          duration: 3000,
        })
        return
      case 'rerun': {
        const lastAssistant = [...messages]
          .reverse()
          .find(m => m.type === 'assistant' && m.originalQuery)
        if (lastAssistant) {
          rerunAnalysis(lastAssistant)
          addToast({
            title: t('rerun_last'),
            type: 'info',
            duration: 2500,
          })
        } else {
          addToast({
            title: t('no_rerun'),
            type: 'warning',
            duration: 2500,
          })
        }
        return
      }
      default:
        addToast({
          title: t('unknown_command'),
          description: t('unknown_command_desc'),
          type: 'warning',
          duration: 3000,
        })
    }
  }

  const insertTableMention = (tableName: string) => {
    if (!mention.active) return
    const before = value.slice(0, mention.start)
    const after = value.slice(cursorPosition)
    const insertion = `@${tableName} `
    const nextValue = `${before}${insertion}${after}`
    const newCursor = before.length + insertion.length
    setValue(nextValue)
    setMention({ active: false })
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursor, newCursor)
      setCursorPosition(newCursor)
    }, 0)
  }

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || loading) return

    if (trimmed.startsWith('/')) {
      handleCommand(trimmed)
      setValue('')
      return
    }

    onSubmit(trimmed)
    setValue('')
  }

  const detectMention = (text: string, caret: number): MentionState => {
    const before = text.slice(0, caret)
    const match = before.match(/(?:^|\\s)@([\\w\\-]*)$/)
    if (!match) return { active: false }
    const query = match[1] || ''
    const start = match.index !== undefined ? match.index + match[0].indexOf('@') : caret
    return { active: true, start, query }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.active && filteredTables.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % filteredTables.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => (i - 1 + filteredTables.length) % filteredTables.length)
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        insertTableMention(filteredTables[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        setMention({ active: false })
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    const nextMention = detectMention(value, cursorPosition)
    setMention(nextMention)
    setMentionIndex(0)

    const lastChar = value[value.length - 1]
    if (lastChar === '@') {
      setTriggerType('table')
      setPopoverOpen(true)
    } else if (lastChar === '/') {
      setTriggerType('command')
      setPopoverOpen(true)
    } else if (!nextMention.active) {
      setTriggerType(null)
      setPopoverOpen(false)
    } else {
      setTriggerType('table')
      setPopoverOpen(true)
    }
  }, [value, cursorPosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMention({ active: false })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasContent = value.trim().length > 0

  return (
    <div className={cn('relative w-full flex justify-center', className)}>
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl"
      >
        {replyToId && replyMessage && (
          <div className="absolute -top-12 left-4 right-4 bg-zinc-50 border border-b-0 rounded-t-2xl px-3 py-2 text-xs flex items-center justify-between z-[55] shadow-sm">
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

        {popoverOpen && (
          <div className="absolute -top-2 left-4 right-4 transform -translate-y-full mb-2 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden z-[60]">
            <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-medium text-zinc-500 flex items-center gap-2">
              {triggerType === 'command' ? (
                <>
                  <Database className="w-3 h-3" />
                  Commands
                </>
              ) : (
                <>
                  <Database className="w-3 h-3" />
                  选择表
                </>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {triggerType === 'table' &&
                filteredTables.map((table, idx) => (
                  <button
                    key={table}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors',
                      idx === mentionIndex
                        ? 'bg-orange-50 text-orange-900'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    )}
                    onClick={() => insertTableMention(table)}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-orange-400" />
                    <span className="truncate">{table}</span>
                  </button>
                ))}

              {triggerType === 'command' && (
                <>
                  <button
                    className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors hover:bg-zinc-100 text-zinc-700"
                    onClick={() => {
                      handleCommand('/clear')
                      setPopoverOpen(false)
                      setValue('')
                    }}
                  >
                    <Eraser className="w-4 h-4 text-zinc-500" />
                    Clear Chat
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors hover:bg-zinc-100 text-zinc-700"
                    onClick={() => {
                      handleCommand('/export')
                      setPopoverOpen(false)
                      setValue('')
                    }}
                  >
                    <Download className="w-4 h-4 text-zinc-500" />
                    {t('export_markdown')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="w-full rounded-2xl border border-zinc-200 shadow-md bg-white/90 backdrop-blur flex items-end gap-3 px-4 py-3 transition-all duration-200">
          <div className="flex-1 min-w-0">
            <TextareaAutosize
              ref={textareaRef}
              minRows={1}
              maxRows={6}
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
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
              <span>{t('input_hint')}</span>
              <span className="font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded">
                {t('table_count', { count: readyTables.length })}
              </span>
            </div>
          </div>

          <div className="pb-1">
            {loading ? (
              <button
                onClick={stopGeneration}
                className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 bg-red-50 hover:bg-red-100 active:scale-95"
                aria-label="Stop generation"
                title={t('stop_generation')}
              >
                <Square className="w-4 h-4 fill-current text-red-500" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!hasContent}
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200',
                  hasContent
                    ? 'bg-black text-white hover:bg-zinc-800 shadow-md active:scale-95'
                    : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[3]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
