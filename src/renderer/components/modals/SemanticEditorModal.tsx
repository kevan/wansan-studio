import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { ColumnSchema } from '@shared/types'

const BUSINESS_TYPES = [
  'ID',
  'Code',
  'Money',
  'Category',
  'Text',
  'Date',
  'Time',
  'Quantity',
  'Location',
  'Other',
]

interface SemanticEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    aliases: string[]
    description: string
    businessType: string
  }) => void
  column: ColumnSchema | null
}

export function SemanticEditorModal({
  isOpen,
  onClose,
  onSave,
  column,
}: SemanticEditorModalProps) {
  const { t } = useTranslation('common')
  
  const [editAliases, setEditAliases] = useState<string[]>([])
  const [newAliasInput, setNewAliasInput] = useState('')
  const [editDesc, setEditDescription] = useState('')
  const [editBusinessType, setEditBusinessType] = useState('')

  useEffect(() => {
    if (column) {
      setEditAliases(column.semantic?.aliases || [])
      setEditDescription(column.semantic?.description || '')
      setEditBusinessType(column.semantic?.businessType || 'Other')
      setNewAliasInput('')
    }
  }, [column, isOpen])

  const handleAddAlias = () => {
    const val = newAliasInput.trim()
    if (val && !editAliases.includes(val)) {
      setEditAliases([...editAliases, val])
      setNewAliasInput('')
    }
  }

  const handleRemoveAlias = (aliasToRemove: string) => {
    setEditAliases(editAliases.filter(a => a !== aliasToRemove))
  }

  const handleSave = () => {
    onSave({
      aliases: editAliases,
      description: editDesc,
      businessType: editBusinessType,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-8 text-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            {t('edit_semantic')}
          </DialogTitle>
          <p className="text-xs text-zinc-500 leading-relaxed mt-2">
            {t('edit_semantic_desc')}
          </p>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {t('field_alias')}
            </Label>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
              {editAliases.map((alias, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-600 font-bold px-2 py-1 gap-1 rounded-lg border-none group/tag"
                >
                  {alias}
                  <button
                    onClick={() => handleRemoveAlias(alias)}
                    className="text-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAliasInput}
                onChange={e => setNewAliasInput(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' && (e.preventDefault(), handleAddAlias())
                }
                placeholder={t('add_alias')}
                className="rounded-xl border-zinc-100 focus:ring-indigo-500 flex-1"
              />
              <Button
                variant="outline"
                onClick={handleAddAlias}
                className="rounded-xl border-zinc-100 text-zinc-400 hover:text-indigo-600"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {t('format')}
            </Label>
            <Select
              value={editBusinessType}
              onValueChange={setEditBusinessType}
            >
              <SelectTrigger className="rounded-xl border-zinc-100">
                <div className="flex items-center truncate">
                  {editBusinessType 
                    ? t(`business_type.${editBusinessType.toLowerCase()}`, editBusinessType)
                    : <SelectValue placeholder={t('select_type', 'Select type...')} />
                  }
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                {BUSINESS_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {t(`business_type.${type.toLowerCase()}`, type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {t('field_description')}
            </Label>
            <Textarea
              value={editDesc}
              onChange={e => setEditDescription(e.target.value)}
              placeholder={t(
                'field_description_placeholder',
                'Describe the logic or meaning of this column...'
              )}
              className="rounded-xl border-zinc-100 min-h-[100px] focus:ring-indigo-500"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl font-bold"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-bold"
          >
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
