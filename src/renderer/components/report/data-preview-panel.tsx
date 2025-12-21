import React, { useState, useEffect } from 'react'
import { QueryPanel } from './query-panel'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTranslation } from 'react-i18next'

export function DataPreviewPanel() {
  const { activeFileId, files } = useProjectStore()
  const file = files.find(f => f.id === activeFileId)
  const { t } = useTranslation('common')
  const [sql, setSql] = useState('')

  useEffect(() => {
    if (file) {
      setSql(`SELECT * FROM "${file.tableName}" LIMIT 100`)
    }
  }, [file])

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
