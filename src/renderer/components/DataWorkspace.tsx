import React, { useState } from 'react'
import { useFileStore } from '../stores/useFileStore'
import { ChatInterface, ChatMessage } from './ChatInterface'
import { useAI } from '../hooks/useAI'
import { TableSchema, RelationSuggestion } from '../../shared/types'
import { useChatStore } from '../stores/useChatStore'

export function DataWorkspace() {
  const {
    files,
    relations,
    activeFileId,
  } = useFileStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { handleQuery, loading } = useAI()
  const replyToId = useChatStore(state => state.replyToId)
  const setReplyTo = useChatStore(state => state.setReplyTo)

  const readyFiles = files.filter(f => f.status === 'ready')
  const currentFile =
    readyFiles.find(f => f.id === activeFileId) || readyFiles[0]

  // Map store files to TableSchema for AI
  const schemas: TableSchema[] = readyFiles.map(f => ({
    tableName: f.tableName || `table_${f.id}`,
    columns: f.columns,
  }))

  // Convert internal relations to API expected format
  const apiRelations: RelationSuggestion[] = relations
    .map(r => {
      const fileA = files.find(f => f.id === r.fileAId)
      const fileB = files.find(f => f.id === r.fileBId)

      if (!fileA || !fileB) return null

      return {
        sourceTable: fileA.tableName,
        sourceColumn: r.columnA,
        targetTable: fileB.tableName,
        targetColumn: r.columnB,
        confidence: 1.0, // Existing confirmed relations are treated as 100% confidence
        reason: 'User confirmed or auto-detected in session',
      }
    })
    .filter((r): r is RelationSuggestion => r !== null)

  const onQuerySubmit = (query: string) => {
    // Find context (manual reply first, otherwise last AI reply)
    let context:
      | {
          lastSql: string
          lastQuery: string
        }
      | undefined

    const manualContextMsg =
      replyToId && messages.find(m => m.id === replyToId)
    const autoContextMsg =
      !manualContextMsg &&
      [...messages].reverse().find(
        m => m.type === 'assistant' && m.reportData?.sql
      )

    const selectedContext = manualContextMsg || autoContextMsg
    if (selectedContext?.type === 'assistant' && selectedContext.reportData?.sql) {
      const selectedIndex = messages.findIndex(m => m.id === selectedContext.id)
      const precedingUser = [...messages]
        .slice(0, selectedIndex)
        .reverse()
        .find(m => m.type === 'user')

      context = {
        lastSql: selectedContext.reportData.sql,
        lastQuery: precedingUser?.content || '',
      }
    }

    handleQuery(
      query,
      schemas,
      apiRelations,
      msg => {
        setMessages(prev => [...prev, msg])
      },
      context
    )

    // Clear manual reply lock after dispatch
    if (replyToId) {
      setReplyTo(null)
    }
  }

  // Get current columns for autocomplete
  const currentColumns = currentFile?.columns.map(c => c.name) || []

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
      {/* 聊天主界面 */}
      <div className="flex-1 overflow-hidden relative">
        <ChatInterface
          tableName={currentFile?.tableName}
          columns={currentColumns}
          messages={messages}
          onQuerySubmit={onQuerySubmit}
          loading={loading}
          className="h-full"
        />
      </div>
    </div>
  )
}
