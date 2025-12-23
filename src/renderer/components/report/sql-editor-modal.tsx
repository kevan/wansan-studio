import React, { useState, useRef } from 'react'
import { BarChart, FileSpreadsheet, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useProGate } from '@/hooks/use-pro-gate'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QueryPanel, QueryPanelRef } from './query-panel'

interface SqlEditorModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'file' | 'widget'
  targetTitle?: string
  initialSql: string
  reasoning?: string
  onSave?: (sql: string) => Promise<void>
}

export function SqlEditorModal({
  isOpen,
  onClose,
  mode = 'widget',
  targetTitle,
  initialSql,
  reasoning,
  onSave,
}: SqlEditorModalProps) {
  const { t } = useTranslation('analysis')
  const [sql, setSql] = useState(initialSql)
  const { checkGate, gateNode } = useProGate()
  const [isSaving, setIsSaving] = useState(false)
  const queryPanelRef = useRef<QueryPanelRef>(null)

  const isFileMode = mode === 'file'

  // Sync state when initialSql changes or modal opens
  // Note: Formatting is now handled by QueryPanel on mount
  React.useEffect(() => {
    if (isOpen) {
      setSql(initialSql)
      setIsSaving(false)
    }
  }, [isOpen, initialSql])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      // 1. Run the query in QueryPanel to check validity and show error in preview if fails
      const isOk = await queryPanelRef.current?.runQuery()
      if (!isOk) {
        // If query failed (error shown in QueryPanel), stop saving
        setIsSaving(false)
        return
      }

      // 2. If OK, call parent save
      await onSave(sql)
      onClose()
    } catch (e: any) {
      console.error('SQL validation failed during save:', e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        onPointerDownOutside={e => e.preventDefault()}
      >
        {gateNode}
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {isFileMode ? (
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
              ) : (
                <BarChart className="w-5 h-5 text-indigo-600" />
              )}
              {targetTitle ||
                (isFileMode
                  ? t('sql_editor.file_preview')
                  : t('sql_editor.widget_edit'))}
            </DialogTitle>

            <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
              {isFileMode
                ? t('sql_editor.mode_read_only')
                : t('sql_editor.mode_editing')}
            </p>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
          <QueryPanel
            ref={queryPanelRef}
            sql={sql}
            onChange={setSql}
            initialSql={initialSql}
            reasoning={reasoning}
            runOnMount={true}
          />
        </div>

        <DialogFooter className="p-4 border-t bg-zinc-50/50 flex items-center justify-end shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              {onSave ? t('sql_editor.cancel') : t('sql_editor.close')}
            </Button>
            {onSave && (
              <Button
                disabled={isSaving}
                onClick={() =>
                  checkGate(t('pro_benefit_sql', { ns: 'common' }), handleSave)
                }
                className="gap-2 bg-black text-white hover:bg-zinc-800 shadow-sm px-6"
              >
                {isSaving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('sql_editor.save')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
