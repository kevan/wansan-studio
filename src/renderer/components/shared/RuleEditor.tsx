import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2,
  Circle,
  GripVertical,
  Lightbulb,
  Plus,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DomainRule } from '@shared/types'

import { useSettingsStore } from '@/stores/useSettingsStore'
import { useProGate } from '@/hooks/use-pro-gate'

interface SortableItemProps {
  rule: DomainRule
  onToggle: (id: string) => void
  onUpdate: (id: string, content: string) => void
  onRemove: (id: string) => void
}

function SortableItem({
  rule,
  onToggle,
  onUpdate,
  onRemove,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg border transition-all bg-white relative',
        rule.isEnabled
          ? 'border-zinc-200 shadow-sm'
          : 'border-transparent bg-zinc-50 opacity-80'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-zinc-600 text-zinc-300 transition-colors -ml-1 flex items-center justify-center p-1"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <button
        onClick={() => onToggle(rule.id)}
        className={cn(
          'shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors',
          rule.isEnabled
            ? 'text-indigo-600'
            : 'text-zinc-300 hover:text-zinc-400'
        )}
      >
        {rule.isEnabled ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <input
          className={cn(
            'w-full bg-transparent border-none focus:outline-none text-sm',
            rule.isEnabled
              ? 'text-zinc-900 font-medium'
              : 'text-zinc-500 line-through decoration-zinc-300'
          )}
          value={rule.content}
          onChange={e => onUpdate(rule.id, e.target.value)}
        />
      </div>

      <button
        onClick={() => onRemove(rule.id)}
        className="shrink-0 p-1.5 rounded-md text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

interface RuleEditorProps {
  rules: DomainRule[]
  onAdd: (content: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, content: string) => void
  onReorder: (oldIndex: number, newIndex: number) => void
  placeholder?: string
  emptyMessage?: string
  addButtonLabel?: string
  scope?: 'global' | 'project'
}

export function RuleEditor({
  rules,
  onAdd,
  onToggle,
  onRemove,
  onUpdate,
  onReorder,
  placeholder,
  emptyMessage,
  addButtonLabel: _addButtonLabel,
  scope = 'project',
}: RuleEditorProps) {
  const { t } = useTranslation('common')
  const { isActivated } = useSettingsStore()
  const { checkGate, gateNode } = useProGate()
  const [newRule, setNewRule] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAdd = () => {
    if (!newRule.trim()) return

    // Limit check for project-level rules in TRIAL mode: Strictly Pro only
    if (!isActivated && scope === 'project') {
      checkGate(t('domain.project_title'), () => {})
      return
    }

    onAdd(newRule.trim())
    setNewRule('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = rules.findIndex(item => item.id === active.id)
      const newIndex = rules.findIndex(item => item.id === over?.id)
      onReorder(oldIndex, newIndex)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Input Area */}
      <div className="flex gap-3 shrink-0 p-1 mb-4">
        <div className="flex-1 flex items-center bg-zinc-50/80 border border-zinc-200/60 rounded-2xl focus-within:border-indigo-400/50 focus-within:bg-white transition-all shadow-sm group/input">
          <Input
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('domain.placeholder')}
            className="flex-1 border-none bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-4 py-6 text-sm font-medium placeholder:text-zinc-400"
          />
          <Button
            onClick={handleAdd}
            disabled={!newRule.trim()}
            variant="ghost"
            size="icon"
            className="mr-2 h-8 w-8 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 transition-all"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto min-h-0 border border-zinc-100 rounded-2xl bg-zinc-50/30 p-2 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-200/50">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
            <Lightbulb className="w-8 h-8 opacity-50" />
            <p className="text-sm">{emptyMessage || t('domain.empty')}</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rules}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {rules.map(rule => (
                  <SortableItem
                    key={rule.id}
                    rule={rule}
                    onToggle={onToggle}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
      {gateNode}
    </div>
  )
}
