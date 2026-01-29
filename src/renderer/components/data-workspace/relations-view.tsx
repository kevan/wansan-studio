import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileNode, TableRelation } from '@shared/types'
import { Button } from '../ui/button'
import { Link2, ArrowRightLeft, Edit2, Trash2, Plus } from 'lucide-react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useToastStore } from '@/stores/useToastStore'
import { RelationEditorModal } from '../modals/RelationEditorModal'

interface RelationsViewProps {
  file: FileNode
}

export function RelationsView({ file }: RelationsViewProps) {
  const { t } = useTranslation('common')
  const toast = useToastStore()
  
  const files = useProjectStore(s => s.files)
  const addRelation = useProjectStore(s => s.addRelation)
  const removeRelation = useProjectStore(s => s.removeRelation)

  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<TableRelation | undefined>(
    undefined
  )

  const handleSaveRelation = async (relation: TableRelation) => {
    if (editingRelation) await removeRelation(editingRelation.id)
    await addRelation({ ...relation, sourceFileId: file.id })
    toast.addToast({
      title: editingRelation
        ? t('relationship_updated')
        : t('relationship_added'),
      type: 'success',
    })
  }
  
  const handleEditRelation = (rel: TableRelation) => {
    setEditingRelation(rel)
    setIsRelationModalOpen(true)
  }
  
  const handleDeleteRelation = async (relId: string) => {
    await removeRelation(relId)
    toast.addToast({ title: t('relationship_removed'), type: 'success' })
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white relative p-6 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto w-full">
          {(file.relations || []).map(rel => (
            <div
              key={rel.id}
              className="p-5 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group hover:border-zinc-300 transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-50 rounded-xl text-pink-600">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900">
                      {rel.sourceColumn}
                    </span>
                    <ArrowRightLeft className="w-3 h-3 text-zinc-300" />
                    <span className="text-sm font-bold text-zinc-900">
                      {files.find(f => f.id === rel.targetFileId)?.name}.
                      {rel.targetColumn}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest font-black">
                    {rel.joinType || 'LEFT'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditRelation(rel)}
                  className="h-9 w-9 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteRelation(rel.id)}
                  className="h-9 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              setEditingRelation(undefined)
              setIsRelationModalOpen(true)
            }}
            className="h-20 border-dashed border-zinc-200 rounded-2xl hover:border-pink-300 hover:bg-pink-50/20 text-zinc-400 hover:text-pink-600 transition-all flex flex-col gap-1"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">
              {t('add_relationship')}
            </span>
          </Button>
        </div>
      </div>

      <RelationEditorModal
        isOpen={isRelationModalOpen}
        onClose={() => setIsRelationModalOpen(false)}
        onSave={handleSaveRelation}
        initialRelation={editingRelation}
        sourceFile={file}
        allFiles={files}
      />
    </>
  )
}
