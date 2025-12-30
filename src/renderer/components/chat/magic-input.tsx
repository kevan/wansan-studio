import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
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
  Lock,
  RefreshCw,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useProjectStore } from '../../stores/useProjectStore'
import { useChatStore } from '../../stores/useChatStore'
import { useToastStore } from '../../stores/useToastStore'
import { useSettingsStore } from '../../stores/useSettingsStore'

import type { ChatMessage } from '../ChatInterface'
import { useTranslation } from 'react-i18next'
import { exportDebugLog } from '../../utils/debug-exporter'
import { generateMarkdown } from '../../utils/markdown-exporter'
import { useProGate } from '@/hooks/use-pro-gate'

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
  const activeSessionId = useProjectStore(state => state.activeSessionId)
  const activeSession = useProjectStore(state =>
    state.sessions.find(s => s.id === state.activeSessionId)
  )
  const setInputDraft = useProjectStore(state => state.setInputDraft)
  
  // 1. Local state for all typing interaction (prevents global re-renders)
  const [value, setValue] = useState(activeSession?.inputDraft ?? '')
  
  // 2. Ref to track the latest value for the unmount sync logic
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  // 3. Sync to store ONLY on unmount or session switch
  useEffect(() => {
    return () => {
      // Save draft when switching sessions or unmounting the component
      if (valueRef.current !== undefined) {
        useProjectStore.getState().setInputDraft(valueRef.current)
      }
    }
  }, [activeSessionId])

  // 4. Initialize local state when session changes
  useEffect(() => {
    setValue(activeSession?.inputDraft ?? '')
  }, [activeSessionId])

  const [cursorPosition, setCursorPosition] = useState(0)
  const [mention, setMention] = useState<MentionState>({ active: false })
  const [mentionIndex, setMentionIndex] = useState(0)
  const [triggerType, setTriggerType] = useState<'table' | 'command' | null>(
    null
  )
  const [popoverOpen, setPopoverOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const replyToId = useChatStore(state => state.replyToId)
  const setReplyTo = useChatStore(state => state.setReplyTo)
  const resetChat = useChatStore(state => state.reset)
  const removeMessage = useChatStore(state => state.removeMessage)
  const stopGeneration = useChatStore(state => state.stopGeneration)
  const addToast = useToastStore(state => state.addToast)
  const files = useProjectStore(state => state.files)
  const isRestoring = useProjectStore(state => state.isRestoring)
  const suggestedPrompts = useProjectStore(state => state.suggestedPrompts)
  const { isActivated } = useSettingsStore()
  const { t } = useTranslation('chat')
  const { t: tCommon } = useTranslation('common')
  const refreshSessionWidgets = useProjectStore(
    state => state.refreshSessionWidgets
  )
  const setRefreshing = useProjectStore(state => state.setRefreshing)
  const { checkGate, gateNode } = useProGate()

  const handleStop = () => {
    stopGeneration()

    const lastUserMsgIndex = [...messages]
      .reverse()
      .findIndex(m => m.type === 'user')

    if (lastUserMsgIndex !== -1) {
      const actualIndex = messages.length - 1 - lastUserMsgIndex
      const userMsg = messages[actualIndex]

      setValue(userMsg.content)
      valueRef.current = userMsg.content
      setInputDraft(userMsg.content)

      removeMessage(userMsg.id)

      if (actualIndex + 1 < messages.length) {
        const nextMsg = messages[actualIndex + 1]
        if (nextMsg.type === 'assistant') {
          removeMessage(nextMsg.id)
        }
      }

      textareaRef.current?.focus()
    }
  }

  const handleExportMarkdown = async () => {
    checkGate('Markdown Export', async () => {
      try {
        addToast({
          title: t('export_triggered'),
          description: t('export_desc'),
          type: 'info',
          duration: 2000,
        })

        const content = generateMarkdown(messages)
        const fileName = `Chat_Export_${new Date().toISOString().slice(0, 10)}.md`

        // @ts-ignore
        const result = await window.electronAPI.saveFile(
          content,
          'md',
          fileName
        )

        if (result.success) {
          addToast({
            title: t('export_success_title'),
            // @ts-ignore
            description: `Saved to ${result.filePath}`,
            type: 'success',
          })
        } else if (result.error !== 'Cancelled') {
          throw new Error(result.error)
        }
      } catch (error) {
        console.error('Export failed', error)
        addToast({
          title: t('export_failed_title'),
          description: String(error),
          type: 'error',
        })
      }
    })
  }

  const readyTables = useMemo(
    () => files.filter(f => f.status === 'ready'),
    [files]
  )

  const replyMessage = messages.find(m => m.id === replyToId)
  const replyPreview =
    replyMessage?.content ||
    replyMessage?.reportData?.title ||
    replyMessage?.reportData?.summary ||
    (replyMessage ? t('reply_fallback') : '')

  const contextPrompts = useMemo(() => {
    const raw = messages
      .filter(m => m.type === 'assistant' && m.reportData?.suggestions)
      .slice(-5)
      .flatMap(m => m.reportData?.suggestions || [])
    return Array.from(new Set(raw))
  }, [messages])

  const allPrompts = useMemo(() => {
    return Array.from(new Set([...suggestedPrompts, ...contextPrompts]))
  }, [suggestedPrompts, contextPrompts])

  const filteredTables = useMemo(() => {
    if (!mention.active) return []
    const q = mention.query.toLowerCase()
    return readyTables
      .filter(file => (file.name || '').toLowerCase().includes(q))
      .map(
        file => file.name || file.tableName || `table_${file.id.slice(0, 6)}`
      )
  }, [mention, readyTables])

  const commandQuery = value.startsWith('/') ? value.slice(1).toLowerCase() : ''

  const filteredCommands = useMemo(() => {
    if (!value.startsWith('/')) return []

    const cmds = [
      {
        id: 'clear',
        label: t('command_clear'),
        icon: Eraser,
        action: () => {
          resetChat()
          addToast({ title: t('chat_cleared'), type: 'info', duration: 2500 })
          setPopoverOpen(false)
          setValue('')
          setInputDraft('')
          valueRef.current = ''
        },
      },
      {
        id: 'refresh',
        label: t('command_refresh', 'Refresh Data'),
        icon: RefreshCw,
        action: async () => {
          setPopoverOpen(false)
          setValue('')
          setInputDraft('')
          valueRef.current = ''

          try {
            setRefreshing(true)
            await refreshSessionWidgets()
            addToast({
              title: tCommon('refresh_success'),
              type: 'success',
              duration: 2000,
            })
          } catch (e) {
            addToast({
              title: tCommon('reload_failed'),
              description: tCommon('refresh_failed_desc'),
              type: 'error',
            })
          } finally {
            setRefreshing(false)
          }
        },
      },
      {
        id: 'export',
        label: t('export_markdown'),
        icon: isActivated ? Download : Lock,
        action: () => {
          handleExportMarkdown()
          setPopoverOpen(false)
          setValue('')
          setInputDraft('')
          valueRef.current = ''
        },
        className: !isActivated ? 'text-zinc-400' : '',
      },
      {
        id: 'debug',
        label: t('debug_export_command'),
        icon: Bug,
        action: async () => {
          setPopoverOpen(false)
          setValue('')
          setInputDraft('')
          valueRef.current = ''
          await exportDebugLog()
          addToast({ title: t('debug_export_success_toast'), type: 'success' })
        },
      },
    ]
    return cmds.filter(
      c =>
        c.id.includes(commandQuery) ||
        c.label.toLowerCase().includes(commandQuery)
    )
  }, [
    value,
    commandQuery,
    t,
    resetChat,
    addToast,
    messages,
    handleExportMarkdown,
    isActivated,
    setInputDraft,
    tCommon,
    refreshSessionWidgets,
    setRefreshing
  ])

  const filteredCommandPrompts = useMemo(() => {
    if (!value.startsWith('/')) return []
    return allPrompts
      .filter(p => p.toLowerCase().includes(commandQuery))
      .slice(0, 10)
  }, [value, allPrompts, commandQuery])

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
      if (['clear', 'export', 'debug', 'refresh'].includes(cmd)) {
        if (cmd === 'clear') {
          resetChat()
          addToast({ title: t('chat_cleared'), type: 'info', duration: 2500 })
        }
        if (cmd === 'refresh') {
          try {
            setRefreshing(true)
            await refreshSessionWidgets()
            addToast({
              title: tCommon('refresh_success'),
              type: 'success',
              duration: 2000,
            })
          } catch (e) {
            addToast({
              title: tCommon('reload_failed'),
              description: tCommon('refresh_failed_desc'),
              type: 'error',
            })
          } finally {
            setRefreshing(false)
          }
        }
        if (cmd === 'export') {
          handleExportMarkdown()
        }
        if (cmd === 'debug') {
          await exportDebugLog()
          addToast({ title: t('debug_export_success_toast'), type: 'success' })
        }
        setValue('')
        setInputDraft('')
        valueRef.current = ''
        return
      }
    }

    onSubmit(trimmed)
    setValue('')
    setInputDraft('')
    valueRef.current = ''
  }

  const detectMention = (text: string, caret: number): MentionState => {
    const before = text.slice(0, caret)
    const match = before.match(/(?:^|\s)@([\w\-]*)$/)
    if (!match) return { active: false }
    const query = match[1] || ''
    const start =
      match.index !== undefined ? match.index + match[0].indexOf('@') : caret
    return { active: true, start, query }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return

    if (triggerType === 'table' && filteredTables.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % filteredTables.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(
          i => (i - 1 + filteredTables.length) % filteredTables.length
        )
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

    if (triggerType === 'command' && commandListItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % commandListItems.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(
          i => (i - 1 + commandListItems.length) % commandListItems.length
        )
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

    if (lastChar === '@' || nextMention.active) {
      setTriggerType('table')
      setPopoverOpen(true)
      return
    }

    if (value.startsWith('/')) {
      setTriggerType('command')
      setPopoverOpen(true)
      return
    }

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
      {gateNode}
      <div ref={containerRef} className="relative w-full max-w-2xl">
        {replyToId && replyMessage && (
          <div className="absolute -top-12 left-4 right-4 bg-zinc-50 border border-b-0 rounded-t-2xl px-3 py-2 text-xs flex items-center justify-between z-[55] shadow-sm">
            <div className="flex items-center gap-2 text-zinc-600 min-w-0">
              <CornerDownRight className="h-3 w-3" />
              <span className="font-medium text-zinc-700">
                Refining Analysis:
              </span>
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
                  {t('command_suggestions')}
                </>
              ) : (
                <>
                  <Database className="w-3 h-3" />
                  {tCommon('select_table')}
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

                  {filteredCommands.length > 0 &&
                    filteredCommandPrompts.length > 0 && (
                      <div className="h-px bg-zinc-100 my-1 mx-2" />
                    )}

                  {filteredCommandPrompts.map((prompt, idx) => {
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

        <div
          className={cn(
            'w-full rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur-xl flex items-end gap-3 px-4 py-3 transition-all duration-300 shadow-sm',
            'focus-within:shadow-xl focus-within:border-indigo-200 focus-within:ring-1 focus-within:ring-indigo-100',
            className
          )}
        >
          <div className="flex-1 min-w-0 relative">
            <TextareaAutosize
              ref={textareaRef}
              minRows={1}
              maxRows={6}
              placeholder={placeholder}
              className="w-full resize-none bg-transparent border-none shadow-none outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 pr-12 text-base text-zinc-900 placeholder:text-zinc-400 leading-relaxed"
              value={value}
              onChange={e => {
                setValue(e.target.value)
                setCursorPosition(e.target.selectionStart)
              }}
              onSelect={e => setCursorPosition(e.currentTarget.selectionStart)}
              onKeyDown={handleKeyDown}
              disabled={loading || isRestoring}
            />
            <div className="absolute bottom-0 right-0 text-[10px] text-zinc-400 font-medium opacity-0 focus-within:opacity-50 transition-opacity select-none pointer-events-none mb-1">
              ⏎ Enter
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
              <span>
                {isRestoring ? t('restoring_session') : t('input_hint')}
              </span>
              <span className="font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded">
                {t('table_count', { count: readyTables.length })}
              </span>
            </div>
          </div>

          <div className="pb-1">
            {loading ? (
              <button
                onClick={handleStop}
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
