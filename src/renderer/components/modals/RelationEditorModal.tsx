import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { useTranslation } from 'react-i18next'
import { FileNode, TableRelation } from '@shared/types'
import { Link2, Info } from 'lucide-react'

interface RelationEditorModalProps {
  isOpen: boolean
  onClose: () => void
  sourceFile: FileNode
  allFiles: FileNode[]
  initialRelation?: TableRelation
  onSave: (relation: TableRelation) => void
}

export function RelationEditorModal({
  isOpen,
  onClose,
  sourceFile,
  allFiles,
  initialRelation,
  onSave,
}: RelationEditorModalProps) {
  const { t } = useTranslation('common')

  const otherFiles = useMemo(() => {
    const filtered = allFiles.filter(
      f => f.id !== sourceFile.id && f.status === 'ready'
    )
    // Ensure current target is in the list even if status changed
    if (initialRelation?.targetFileId) {
      const currentTarget = allFiles.find(
        f => f.id === initialRelation.targetFileId
      )
      if (currentTarget && !filtered.find(f => f.id === currentTarget.id)) {
        filtered.push(currentTarget)
      }
    }
    return filtered
  }, [allFiles, sourceFile.id, initialRelation?.targetFileId])

  const [targetFileId, setTargetFileId] = useState(
    initialRelation?.targetFileId || otherFiles[0]?.id || ''
  )
  const [sourceColumn, setSourceColumn] = useState(
    initialRelation?.sourceColumn || ''
  )
  const [targetColumn, setTargetColumn] = useState(
    initialRelation?.targetColumn || ''
  )

  // Reset state when modal opens or initialRelation changes
  React.useEffect(() => {
    if (isOpen) {
      setTargetFileId(initialRelation?.targetFileId || otherFiles[0]?.id || '')
      setSourceColumn(initialRelation?.sourceColumn || '')
      setTargetColumn(initialRelation?.targetColumn || '')
    }
  }, [isOpen, initialRelation, otherFiles])

  const targetFile = useMemo(
    () => allFiles.find(f => f.id === targetFileId),
    [allFiles, targetFileId]
  )

  const handleSave = () => {
    if (!targetFileId || !sourceColumn || !targetColumn) return

    onSave({
      id: initialRelation?.id || crypto.randomUUID(),
      targetFileId,
      sourceColumn,
      targetColumn,
      joinType: 'LEFT',
    })
    onClose()
  }

  const isValid = targetFileId && sourceColumn && targetColumn

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialRelation ? t('edit_relationship') : t('add_new_link')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Source Info (Read-only context) */}
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <div className="w-8 h-8 rounded bg-white border flex items-center justify-center">
              <Link2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                {t('source_table')}
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                {sourceFile.name}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Target Table Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">
                {t('target_table')}
              </label>
              <Select value={targetFileId} onValueChange={setTargetFileId}>
                <SelectTrigger>
                  <span className="truncate">
                    {targetFile ? (
                      targetFile.name
                    ) : (
                      <span className="text-zinc-400">{t('select_table')}</span>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {otherFiles.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            {/* Source Column */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">
                {t('join_column')} ({t('source_table')})
              </label>
              <Select value={sourceColumn} onValueChange={setSourceColumn}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select_column')} />
                </SelectTrigger>
                <SelectContent>
                  {sourceFile.columns.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Column */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">
                {t('join_column')} ({t('target_table')})
              </label>
              <Select value={targetColumn} onValueChange={setTargetColumn}>
                <SelectTrigger disabled={!targetFile}>
                  <SelectValue placeholder={t('select_column')} />
                </SelectTrigger>
                <SelectContent>
                  {targetFile?.columns.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              {t('relation_tip_body')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid}
            className="bg-black hover:bg-zinc-800 text-white"
          >
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
