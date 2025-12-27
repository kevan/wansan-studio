import React, { useState } from 'react'
import { ChatInterface } from './ChatInterface'
import { TableSchema, RelationSuggestion } from '../../shared/types'
import { useChatStore } from '../stores/useChatStore'
import { useProjectStore } from '../stores/useProjectStore'
import { SmartFilterModal } from './modals/SmartFilterModal'
import { useToastStore } from '../stores/useToastStore'
import { FilterParam } from '@shared/schemas/analysis'
import { useTranslation } from 'react-i18next'
import { mapFileToSchema } from '../utils/schema-mapper'

export function ChatStream() {
  const { t } = useTranslation('chat')
  const files = useProjectStore(s => s.files)
  const relations = files.flatMap(f => (f.relations || []).map(r => ({
    id: r.id,
    fileAId: f.id,
    columnA: r.sourceColumn,
    fileBId: r.targetFileId,
    columnB: r.targetColumn,
    autoDetected: r.autoDetected
  })))
  const activeFileId = useProjectStore(s => s.activeFileId)
  const messages = useChatStore(state => state.messages)
  const sendMessage = useChatStore(state => state.sendMessage)
  const runTemplateSQL = useChatStore(state => state.runTemplateSQL)
  const smartFilterRequest = useProjectStore(s => s.smartFilterRequest)
  const { addToast } = useToastStore()
  const [activeTemplate, setActiveTemplate] = useState<{
    messageId: string
    templateSql: string
    params: FilterParam[]
    initialValues?: Record<string, string[]>
  } | null>(null)
  
  const readyFiles = files.filter(f => f.status === 'ready')
  const currentFile =
    readyFiles.find(f => f.id === activeFileId) || readyFiles[0]

  // Map store files to TableSchema for AI
  const schemas: TableSchema[] = readyFiles.map(mapFileToSchema)

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
    sendMessage(query, undefined, schemas, apiRelations)
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
          onConfigureTemplate={(messageId, templateSql, params, initialValues) => {
            setActiveTemplate({ messageId, templateSql, params, initialValues })
          }}
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
            onCancel={() => {
               smartFilterRequest.reject(new Error('Cancelled'))
               addToast({
                   type: 'info',
                   title: t('analysis_cancelled_title'),
                   description: t('analysis_cancelled_desc'),
                   duration: 3000
               })
            }}
            params={smartFilterRequest.params}
            templateSql={smartFilterRequest.templateSql}
            onConfirm={(sql, params) => smartFilterRequest.resolve({ sql, params })}
          />
        )}

        {activeTemplate && (
          <SmartFilterModal
            isOpen={true}
            onCancel={() => setActiveTemplate(null)}
            params={activeTemplate.params}
            templateSql={activeTemplate.templateSql}
            initialValues={activeTemplate.initialValues}
            onConfirm={(sql, params) => {
              runTemplateSQL(activeTemplate.messageId, sql, params)
              setActiveTemplate(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
