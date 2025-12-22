import React from 'react'
import { useFileStore } from '../stores/useFileStore'
import { ChatInterface } from './ChatInterface'
import { TableSchema, RelationSuggestion } from '../../shared/types'
import { useChatStore } from '../stores/useChatStore'
import { useProjectStore } from '../stores/useProjectStore'
import { SmartFilterModal } from './modals/SmartFilterModal'

export function ChatStream() {
  const { files, relations } = useFileStore()
  const activeFileId = useProjectStore(s => s.activeFileId)
  const messages = useChatStore(state => state.messages)
  const sendMessage = useChatStore(state => state.sendMessage)
  const smartFilterRequest = useProjectStore(s => s.smartFilterRequest)
  
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

      if (!fileA || !fileB || fileA.status !== 'ready' || fileB.status !== 'ready') return null

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
    sendMessage(query, schemas, apiRelations)
  }

  // Get current columns for autocomplete
  const currentColumns = currentFile?.columns.map(c => c.name) || []

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 min-h-0">
      {/* 聊天主界面 */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <ChatInterface
          tableName={currentFile?.tableName}
          columns={currentColumns}
          messages={messages}
          onQuerySubmit={onQuerySubmit}
          loading={
            messages.some(m => m.status === 'thinking')
              ? 'thinking'
              : messages.some(
                    m => m.status === 'planning' || m.status === 'executing'
                  )
                ? 'crunching'
                : null
          }
          className="h-full"
        />
        
        {smartFilterRequest && (
          <SmartFilterModal
            isOpen={smartFilterRequest.isOpen}
            onOpenChange={(open) => {
              if (!open) {
                smartFilterRequest.reject()
              }
            }}
            params={smartFilterRequest.params}
            templateSql={smartFilterRequest.templateSql}
            onConfirm={(sql) => smartFilterRequest.resolve(sql)}
          />
        )}
      </div>
    </div>
  )
}
