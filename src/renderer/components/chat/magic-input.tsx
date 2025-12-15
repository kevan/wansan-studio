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
  Sparkles,
  Loader2,
  Bug,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useFileStore } from '../../stores/useFileStore'
import { useChatStore } from '../../stores/useChatStore'
import { useToastStore } from '../../stores/useToastStore'
import type { ChatMessage } from '../ChatInterface'
import { useTranslation } from 'react-i18next'
import { exportDebugLog } from '../../utils/debug-exporter'

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
  const isRestoring = useFileStore(state => state.isRestoring)
  const suggestedPrompts = useFileStore(state => state.suggestedPrompts)
  const { t } = useTranslation('chat')

  const readyTables = useMemo(() => files.filter(f => f.status === 'ready'), [files])

  const replyMessage = messages.find(m => m.id === replyToId)
  const replyPreview =
    replyMessage?.content ||
    replyMessage?.reportData?.title ||
    replyMessage?.reportData?.summary ||
    (replyMessage ? t('reply_fallback') : '')

  // 1. Context Prompts from recent messages
  const contextPrompts = useMemo(() => {
    const raw = messages
      .filter(m => m.type === 'assistant' && m.reportData?.suggestions)
      .slice(-5) // Look at last 5 assistant messages
      .flatMap(m => m.reportData?.suggestions || [])
    return Array.from(new Set(raw))
  }, [messages])

  // 2. All Prompts (Global + Context), unique
  const allPrompts = useMemo(() => {
    return Array.from(new Set([...suggestedPrompts, ...contextPrompts]))
  }, [suggestedPrompts, contextPrompts])

  // 3. Filtered Tables
  const filteredTables = useMemo(() => {
    if (!mention.active) return []
    const q = mention.query.toLowerCase()
    return readyTables
      .filter(file => (file.name || '').toLowerCase().includes(q))
      .map(file => file.name || file.tableName || `table_${file.id.slice(0, 6)}`)
  }, [mention, readyTables])

  // 4. Command Query (content after /)
  const commandQuery = value.startsWith('/') ? value.slice(1).toLowerCase() : ''

  // 5. Filtered Commands
  const filteredCommands = useMemo(() => {
    if (!value.startsWith('/')) return []
    
    const cmds = [
      {
        id: 'clear',
        label: 'Clear Chat',
        icon: Eraser,
        action: () => {
          resetChat()
          addToast({ title: t('chat_cleared'), type: 'info', duration: 2500 })
          setPopoverOpen(false)
          setValue('')
        }
      },
      {
        id: 'export',
        label: t('export_markdown'),
        icon: Download,
        action: () => {
          addToast({ title: t('export_triggered'), description: t('export_desc'), type: 'info', duration: 3000 })
          setPopoverOpen(false)
          setValue('')
        }
      },
      {
        id: 'debug',
        label: t('debug_export_command'),
        icon: Bug,
        action: async () => {
          setPopoverOpen(false)
          setValue('')
          await exportDebugLog()
          addToast({ title: t('debug_export_success_toast'), type: 'success' })
        }
      }
    ]
    return cmds.filter(c => c.id.includes(commandQuery) || c.label.toLowerCase().includes(commandQuery))
  }, [value, commandQuery, t, resetChat, addToast])

  // 6. Filtered Prompts for Command Mode
  const filteredCommandPrompts = useMemo(() => {
    if (!value.startsWith('/')) return []
    return allPrompts.filter(p => p.toLowerCase().includes(commandQuery)).slice(0, 10)
  }, [value, allPrompts, commandQuery])

  // Combined list for navigation in command mode
  const commandListItems = useMemo(() => {
    return [...filteredCommands, ...filteredCommandPrompts]
  }, [filteredCommands, filteredCommandPrompts])

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

  const insertPrompt = (prompt: string) => {
    setValue(prompt)
    setTriggerType(null)
    setPopoverOpen(false)
    textareaRef.current?.focus()
  }

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed || loading) return

    if (trimmed.startsWith('/')) {
      const cmd = trimmed.slice(1).toLowerCase()
      if (['clear', 'export', 'debug'].includes(cmd)) {
         if (cmd === 'clear') { 
            resetChat()
            addToast({ title: t('chat_cleared'), type: 'info', duration: 2500 })
         }
         if (cmd === 'export') { 
            addToast({ title: t('export_triggered'), description: t('export_desc'), type: 'info', duration: 3000 })
         }
         if (cmd === 'debug') {
            await exportDebugLog()
            addToast({ title: t('debug_export_success_toast'), type: 'success' })
         }
         setValue('')
         return
      }
    }

    onSubmit(trimmed)
    setValue('')
  }

  const detectMention = (text: string, caret: number): MentionState => {
    const before = text.slice(0, caret)
    const match = before.match(/(?:^|\s)@([\w\-]*)$/)
    if (!match) return { active: false }
    const query = match[1] || ''
    const start = match.index !== undefined ? match.index + match[0].indexOf('@') : caret
    return { active: true, start, query }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // TABLE TRIGGER
    if (triggerType === 'table' && filteredTables.length > 0) {
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
        setPopoverOpen(false)
        return
      }
    }

    // COMMAND TRIGGER (Commands + Prompts)
    if (triggerType === 'command' && commandListItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % commandListItems.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => (i - 1 + commandListItems.length) % commandListItems.length)
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const item = commandListItems[mentionIndex]
        if (typeof item === 'string') {
            insertPrompt(item)
        } else {
            item.action()
        }
        return
      }
      if (e.key === 'Escape') {
        setTriggerType(null)
        setPopoverOpen(false)
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
    
    // Priority 1: Table Mention (@)
    if (lastChar === '@' || nextMention.active) {
      setTriggerType('table')
      setPopoverOpen(true)
      return
    } 
    
    // Priority 2: Commands (/) - Now includes prompts
    if (value.startsWith('/')) {
      setTriggerType('command')
      setPopoverOpen(true)
      return
    }

    // Default: Close popover
    setTriggerType(null)
    setPopoverOpen(false)
  }, [value, cursorPosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMention({ active: false })
        setPopoverOpen(false)
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
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Commands & Suggestions
                </>
              ) : (
                <>
                  <Database className="w-3 h-3" />
                  选择表
                </>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
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
                  {filteredCommands.map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors',
                        idx === mentionIndex
                          ? 'bg-zinc-100 text-zinc-900'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      )}
                      onClick={cmd.action}
                    >
                      <cmd.icon className="w-4 h-4 text-zinc-500" />
                      {cmd.label}
                    </button>
                  ))}
                  
                  {filteredCommands.length > 0 && filteredCommandPrompts.length > 0 && (
                    <div className="h-px bg-zinc-100 my-1 mx-2" />
                  )}

                  {filteredCommandPrompts.map((prompt, idx) => {
                    // Adjust index based on commands length
                    const realIdx = idx + filteredCommands.length
                    return (
                        <button
                        key={prompt}
                        className={cn(
                            'w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors',
                            realIdx === mentionIndex
                            ? 'bg-indigo-50 text-indigo-900'
                            : 'hover:bg-zinc-50 text-zinc-700'
                        )}
                        onClick={() => insertPrompt(prompt)}
                        >
                        <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="truncate">{prompt}</span>
                        </button>
                    )
                  })}
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
              disabled={loading || isRestoring}
            />
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
              <span>{isRestoring ? 'Restoring session...' : t('input_hint')}</span>
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
            ) : isRestoring ? (
              <div className="h-10 w-10 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
              </div>
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