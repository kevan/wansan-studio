import React, { useState, useEffect } from 'react'
import { QueryPanel } from './query-panel'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTranslation } from 'react-i18next'
import { format } from 'sql-formatter'
import { Loader2, AlertCircle, CloudUpload } from 'lucide-react'

export function DataPreviewPanel() {
  const { activeFileId, files, isRestoring } = useProjectStore()
  const file = files.find(f => f.id === activeFileId)
  const { t } = useTranslation('common')
  const [sql, setSql] = useState('')

  useEffect(() => {
    if (file) {
      const initialSql = `SELECT * FROM "${file.tableName}" LIMIT 100`
      try {
        const formatted = format(initialSql, {
          language: 'postgresql',
          tabWidth: 2,
          keywordCase: 'upper',
        })
        setSql(formatted)
      } catch (e) {
        setSql(initialSql)
      }
    }
  }, [file])

  if (isRestoring) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-zinc-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">
          {t('restoring_session', { ns: 'chat' })}...
        </span>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-400 text-sm">
        {t('select_table')}
      </div>
    )
  }

  // Handle Uploading State
  if (file.status === 'uploading') {
    return (
      <div className="h-full w-full bg-zinc-50/30 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
        <div className="p-4 bg-indigo-50 rounded-full">
          <CloudUpload className="w-8 h-8 text-indigo-500 animate-bounce" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-zinc-900">
            {t('sidebar.uploading')}
          </span>
          <span className="text-xs text-zinc-400 font-mono">{file.name}</span>
        </div>
      </div>
    )
  }

  // Handle Processing State (New file being ingested)
  if (file.status === 'processing') {
    return (
      <div className="h-full w-full bg-zinc-50/30 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold text-zinc-900">
            {t('importing')}
          </span>
          <span className="text-xs text-zinc-400 font-mono italic">
            {file.name}
          </span>
        </div>
      </div>
    )
  }

  // Handle Error State
  if (file.status === 'error') {
    return (
      <div className="h-full w-full bg-red-50/10 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-sm font-bold text-red-900 mb-2">
          {t('sidebar.import_failed_title')}
        </h3>
        <p className="text-xs text-red-600/80 max-w-xs mb-6 line-clamp-4 leading-relaxed font-mono">
          {file.error || t('import_failed')}
        </p>
        <div className="flex gap-3">
          <span className="text-[10px] text-zinc-400 italic">
            {t('sidebar.delete_and_retry')}
          </span>
        </div>
      </div>
    )
  }

  if (!file.tableName) {
    return (
      <div className="h-full w-full flex items-center justify-center text-red-400 text-sm">
        {t('invalid_metadata_table')}
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-white flex flex-col p-4 overflow-hidden">
      <QueryPanel
        key={file.id} // Reset state on file change
        sql={sql}
        onChange={setSql}
        initialSql={`SELECT * FROM "${file.tableName}" LIMIT 100`}
        runOnMount={true}
      />
    </div>
  )
}
