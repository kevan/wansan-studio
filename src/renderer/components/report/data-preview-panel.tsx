import React, { useState, useEffect } from 'react'
import { QueryPanel } from './query-panel'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTranslation } from 'react-i18next'
import { format } from 'sql-formatter'
import { Loader2 } from 'lucide-react'

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
        <span className="text-sm">{t('restoring_session', { ns: 'chat' })}...</span>
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
