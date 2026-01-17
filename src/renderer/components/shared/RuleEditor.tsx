import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Check,
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

import { MarkdownEditor } from '../ui/markdown-editor'
import { SimpleMarkdown } from '../ui/simple-markdown'

import { useToastStore } from '@/stores/useToastStore'

interface SortableItemProps {
  rule: DomainRule
  isEditing: boolean
  t: any
  onStartEdit: () => void
  onStopEdit: (id: string, content: string) => void
  onToggle: (id: string) => void
  onUpdate: (id: string, content: string) => void
  onRemove: (id: string) => void
}

function SortableItem({
  rule,
  isEditing,
  t,
  onStartEdit,
  onStopEdit,
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
        'group flex items-start gap-3 p-3 pl-8 pr-10 rounded-2xl border transition-all bg-white relative',
        isEditing ? 'ring-2 ring-indigo-500 border-transparent shadow-xl z-20' : (
          rule.isEnabled
            ? 'border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300'
            : 'border-transparent bg-zinc-50 opacity-80'
        )
      )}
    >
      {/* Drag Handle - Absolute Left (Centered) */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab text-zinc-300 hover:text-zinc-600 transition-all opacity-0 group-hover:opacity-100"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 pt-0.5">
        {isEditing ? (
          <MarkdownEditor
            value={rule.content}
            onChange={val => onUpdate(rule.id, val)}
            hideToolbar={false}
            minHeight="32px"
            className="border-none bg-transparent shadow-none"
            contentClassName="px-0 py-1"
          />
        ) : (
          <div 
            onClick={onStartEdit}
            className={cn(
              "cursor-text min-h-[24px] rounded-lg transition-colors hover:bg-zinc-50/50 p-1 -m-1",
              !rule.isEnabled && 'opacity-50 grayscale line-through decoration-zinc-400'
            )}
          >
            {rule.content ? (
              <SimpleMarkdown 
                content={rule.content} 
                className="prose-p:my-0 prose-p:leading-relaxed text-sm" 
              />
            ) : (
              <span className="text-zinc-400 italic text-xs">{t('domain.rule_empty_content')}</span>
            )}
          </div>
        )}
      </div>

      {/* Floating Toolbar - Top Right */}
      <div className={cn(
        "absolute right-2 top-2.5 flex items-center gap-0.5 transition-all duration-200",
        (isEditing || !rule.isEnabled) ? "opacity-100" : "opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0"
      )}>
        {isEditing ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStopEdit(rule.id, rule.content);
            }}
            className="w-6 h-6 rounded-md flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
            title="Finish editing"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(rule.id);
            }}
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center transition-all hover:bg-zinc-100',
              rule.isEnabled ? 'text-indigo-600' : 'text-zinc-400'
            )}
            title={rule.isEnabled ? "Disable rule" : "Enable rule"}
          >
            {rule.isEnabled ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Circle className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(rule.id);
          }}
          className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
          title="Remove rule"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
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
  const { t } = useTranslation(['common', 'chat'])
  const { isActivated } = useSettingsStore()
  const { checkGate, gateNode } = useProGate()
  const [activeId, setActiveId] = useState<string | null>(null)
  const addToast = useToastStore(s => s.addToast)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid triggering drag while clicking/typing
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAdd = () => {
    // Limit check for project-level rules in TRIAL mode: Strictly Pro only
    if (!isActivated && scope === 'project') {
      checkGate(t('common:domain.project_title'), () => {})
      return
    }

    // Since onAdd doesn't return ID yet, we'll try to find the new one or 
    // just rely on store update.
    onAdd('')
    // The store implementation will push to end or start?
    // ProjectStore: ...(state.domainRules || []), content (End)
    // We'll set a tiny timeout to set activeId to the last item
    setTimeout(() => {
        const lastRule = rules[rules.length - 1]; // This is problematic if rules updated later
        // A better way is to update store, but let's handle the empty check first
    }, 50);
  }

  const handleStopEdit = (id: string, content: string) => {
    if (!content.trim()) {
        // If content is empty, remove it and show warning
        onRemove(id)
        addToast({
            title: t('domain.rule_empty_warning'),
            type: 'warning',
            duration: 3000
        })
    }
    setActiveId(null)
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
    <div className="flex flex-col h-full overflow-hidden w-full max-w-4xl mx-auto">
      {/* List Area */}
      <div className="flex-1 overflow-y-auto min-h-0 border border-zinc-100 rounded-[2rem] bg-zinc-50/20 p-4 space-y-4 scrollbar-thin">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-3 opacity-60">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <Lightbulb className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">{emptyMessage || t('chat:domain.empty')}</p>
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
              <div className="space-y-4">
                {rules.map(rule => (
                  <SortableItem
                    key={rule.id}
                    rule={rule}
                    t={t}
                    isEditing={activeId === rule.id}
                    onStartEdit={() => setActiveId(rule.id)}
                    onStopEdit={handleStopEdit}
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

      <div className="shrink-0 p-4 pt-6 flex justify-center">
        <Button
          onClick={handleAdd}
          className="rounded-full px-8 bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-12 shadow-xl shadow-zinc-200 transition-all active:scale-95 gap-2 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          {t('domain.add')}
        </Button>
      </div>
      {gateNode}
    </div>
  )
}
