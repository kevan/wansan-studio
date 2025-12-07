import React, { useState } from 'react'
import { useFileStore } from '../stores/useFileStore'
import { ChatInterface, ChatMessage } from './ChatInterface'
import { useAI } from '../hooks/useAI'
import { TableSchema } from '../../shared/types'

interface DataWorkspaceNewProps {
  onReset: () => void
}

export function DataWorkspace({ onReset }: DataWorkspaceNewProps) {
  const { files, activeFileId, setActiveFile, setShowSchemaConfirm } = useFileStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { handleQuery, loading, error } = useAI()

  const readyFiles = files.filter(f => f.status === 'ready')
  const currentFile = readyFiles.find(f => f.id === activeFileId) || readyFiles[0]

  // Map store files to TableSchema for AI
  const schemas: TableSchema[] = readyFiles.map(f => ({
    tableName: f.tableName || `table_${f.id}`,
    columns: f.columns
  }))

  const onQuerySubmit = (query: string) => {
    handleQuery(query, schemas, (msg) => {
      setMessages(prev => [...prev, msg])
    })
  }

  // Get current columns for autocomplete
  const currentColumns = currentFile?.columns.map(c => c.name) || []

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
      {/* 顶部工具栏 - 简化版 */}
      <div className="flex-shrink-0 h-14 bg-white border-b border-zinc-200 px-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {readyFiles.map(file => (
              <button
                key={file.id}
                onClick={() => setActiveFile(file.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  file.id === currentFile?.id
                    ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSchemaConfirm(true)}
            className="text-sm text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-md hover:bg-zinc-100"
          >
            Schema
          </button>
          <button 
            onClick={onReset} 
            className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-md hover:bg-red-50"
          >
            Reset
          </button>
        </div>
      </div>

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
        
        {/* Error Toast (Simple) */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-800 px-4 py-2 rounded-md shadow-lg text-sm border border-red-200">
            Error: {error.message}
          </div>
        )}
      </div>
    </div>
  )
}

