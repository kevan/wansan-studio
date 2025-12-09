import React, { useState } from 'react'
import { useFileStore } from '../stores/useFileStore'
import { ChatInterface, ChatMessage } from './ChatInterface'
import { useAI } from '../hooks/useAI'
import { TableSchema, RelationSuggestion } from '../../shared/types'

export function DataWorkspace() {
  const {
    files,
    relations,
    activeFileId,
  } = useFileStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { handleQuery, loading } = useAI()

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
    // Find context (last SQL and last User Query)
    let context: { lastSql: string; lastQuery: string } | undefined = undefined

    // Reverse iterate to find the last successful AI response
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.type === 'assistant' && msg.reportData?.sql) {
        // Found last SQL, now find the user query that triggered it (usually the one before)
        // We assume the structure is User -> Assistant
        // But we need to be careful if there are error messages
        const prevMsg = messages[i - 1]
        if (prevMsg && prevMsg.type === 'user') {
          context = {
            lastSql: msg.reportData.sql,
            lastQuery: prevMsg.content,
          }
          break // Found the pair, stop
        }
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
