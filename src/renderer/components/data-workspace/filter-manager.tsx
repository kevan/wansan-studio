import React, { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  ListFilter,
  Plus,
  Trash2,
  X,
  Check,
  Calendar,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { 
  FilterCondition, 
  FilterState, 
  OPERATOR_CONFIG, 
  FilterOperator, 
  getSimpleType 
} from '@shared/types/filter'
import { ColumnSchema } from '@shared/types'
import { cn } from '@/utils/cn'
import { v4 as uuidv4 } from 'uuid'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

import { Switch } from '@/components/ui/switch'

interface FilterManagerProps {
  columns: ColumnSchema[]
  filterState: FilterState
  onChange: (state: FilterState) => void
}

export function FilterManager({ columns, filterState, onChange }: FilterManagerProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)

  // Draft state: edits happen here without triggering parent re-renders
  const [draftState, setDraftState] = useState<FilterState>(filterState)

  // When popover opens, sync draft with current state
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDraftState(filterState)
    }
    setIsOpen(open)
  }

  const handleApply = () => {
    onChange(draftState)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  const handleAddCondition = () => {
    const defaultCol = columns.find(c => c.name !== '_ws_row_id') || columns[0]
    if (!defaultCol) return

    const newCondition: FilterCondition = {
      id: uuidv4(),
      columnName: defaultCol.name,
      columnType: defaultCol.type,
      sourceType: defaultCol.sourceType,
      operator: 'equals',
      value: '',
      enabled: true
    }

    setDraftState(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }))
  }

  const handleUpdateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setDraftState(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => {
        if (c.id !== id) return c
        
        const newCond = { ...c, ...updates }
        
        // --- 1. Column Change Logic ---
        if (updates.columnName && updates.columnName !== c.columnName) {
          const newCol = columns.find(col => col.name === updates.columnName)
          if (newCol) {
            newCond.columnType = newCol.type
            newCond.sourceType = newCol.sourceType
            // Reset to safe defaults based on new type
            const newSimpleType = getSimpleType(newCol.type)
            if (newSimpleType === 'boolean') {
              newCond.operator = 'equals'
              newCond.value = true
            } else if (newSimpleType === 'number') {
              newCond.operator = 'gt'
              newCond.value = 0
            } else {
              newCond.operator = 'contains'
              newCond.value = ''
            }
          }
        }

        // --- 2. Type Coercion Logic ---
        const simpleType = getSimpleType(newCond.columnType)
        const opConfig = OPERATOR_CONFIG[newCond.operator]

        // Coerce value based on operator and type
        if (opConfig.inputType === 'number') {
          newCond.value = newCond.value === '' ? '' : Number(newCond.value)
        } else if (opConfig.inputType === 'multi') {
          // If inputting string, convert to array
          if (typeof newCond.value === 'string') {
            newCond.value = newCond.value.split(',').map(s => s.trim())
          }
        } else if (simpleType === 'boolean' && typeof newCond.value !== 'boolean') {
          newCond.value = newCond.value === 'true'
        }
        
        return newCond
      })
    }))
  }

  const handleRemoveCondition = (id: string) => {
    setDraftState(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id)
    }))
  }

  const toggleConjunction = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraftState(prev => ({
      ...prev,
      conjunction: prev.conjunction === 'AND' ? 'OR' : 'AND'
    }))
  }

  const activeConditions = filterState.conditions.filter(c => c.enabled)
  const activeCount = activeConditions.length

  const getSummary = () => {
    if (activeCount === 0) return t('filter')
    
    // Create a readable summary of the first 2 conditions
    const summary = activeConditions.slice(0, 2).map(c => {
      const col = columns.find(col => col.name === c.columnName)
      const label = col?.semantic?.aliases?.[0] || c.columnName
      const op = OPERATOR_CONFIG[c.operator].symbol || OPERATOR_CONFIG[c.operator].label
      return `${label} ${op} ${c.operator.includes('null') ? '' : `"${c.value}"`}`
    }).join(`, `)

    return (
      <span className="flex items-center gap-1.5 truncate max-w-[300px]">
        <span className="font-bold">{filterState.conjunction}</span>
        <span className="opacity-60">:</span>
        <span className="truncate">{summary}</span>
        {activeCount > 2 && <span className="text-[10px] bg-indigo-200/50 px-1 rounded">+{activeCount - 2}</span>}
      </span>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant={activeCount > 0 ? "secondary" : "ghost"} 
          size="sm" 
          className={cn(
            "h-8 text-xs gap-2 px-3 transition-all rounded-full border-transparent",
            activeCount > 0 
              ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-sm" 
              : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
          )}
        >
          <ListFilter className="w-3.5 h-3.5" />
          {getSummary()}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[480px] p-0 shadow-2xl border-zinc-200/50 pointer-events-auto" 
        align="start"
        onInteractOutside={(e) => {
          // Prevent Popover from closing when interacting with portal-rendered children
          // (e.g., Select/DropdownMenu content rendered via Portal outside the Popover DOM)
          e.preventDefault()
        }}
        onFocusOutside={(e) => {
          // Prevent Popover from closing when focus moves to portal-rendered children
          e.preventDefault()
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-sm rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-700">{t('filter_conditions')}</span>
            <div className="h-4 w-px bg-zinc-300 mx-1" />
            <span className="text-xs text-zinc-500">Match</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleConjunction}
              className="h-6 text-[10px] font-bold px-2 uppercase tracking-wider bg-white border-zinc-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              {draftState.conjunction === 'AND' ? 'All (AND)' : 'Any (OR)'}
            </Button>
            <span className="text-xs text-zinc-500">of the following:</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full hover:bg-zinc-200/50"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Condition List */}
        <div className="p-2 max-h-[400px] overflow-y-auto bg-zinc-50/30 custom-scrollbar space-y-2">
          {draftState.conditions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-400 gap-2">
              <ListFilter className="w-8 h-8 opacity-20" />
              <p className="text-xs">{t('no_filters_yet')}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleAddCondition}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t('add_filter')}
              </Button>
            </div>
          ) : (
            draftState.conditions.map((condition, index) => (
              <FilterRow 
                key={condition.id}
                condition={condition}
                columns={columns}
                index={index}
                conjunction={draftState.conjunction}
                onUpdate={handleUpdateCondition}
                onRemove={handleRemoveCondition}
              />
            ))
          )}
        </div>

        {/* Footer Actions */}
        {draftState.conditions.length > 0 && (
          <div className="p-2 border-t border-zinc-100 bg-white rounded-b-lg flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-zinc-400 hover:text-red-500 h-8"
                onClick={() => setDraftState({ conjunction: 'AND', conditions: [] })}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {t('clear_all')}
              </Button>
              <Button 
                variant="outline"
                size="sm" 
                className="h-8 text-xs gap-1.5 border-dashed border-zinc-200 hover:border-indigo-300 hover:text-indigo-600"
                onClick={handleAddCondition}
              >
                <Plus className="w-3.5 h-3.5" />
                {t('add_condition')}
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Button 
                variant="ghost"
                size="sm" 
                className="flex-1 h-9 text-xs text-zinc-500 hover:bg-zinc-100"
                onClick={handleCancel}
              >
                {t('cancel')}
              </Button>
              <Button 
                size="sm" 
                className="flex-1 h-9 text-xs bg-indigo-600 text-white hover:bg-indigo-700 shadow-md font-bold"
                onClick={handleApply}
              >
                <Check className="w-4 h-4 mr-2" />
                应用过滤器
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function FilterRow({ 
  condition, 
  columns, 
  index, 
  conjunction,
  onUpdate, 
  onRemove 
}: { 
  condition: FilterCondition
  columns: ColumnSchema[]
  index: number
  conjunction: 'AND' | 'OR'
  onUpdate: (id: string, updates: Partial<FilterCondition>) => void
  onRemove: (id: string) => void
}) {
  const simpleType = getSimpleType(condition.columnType)
  const availableOps = Object.entries(OPERATOR_CONFIG).filter(([_, conf]) => 
    conf.validTypes.includes(simpleType)
  ) as [FilterOperator, typeof OPERATOR_CONFIG['equals']][]

  const currentOpConfig = OPERATOR_CONFIG[condition.operator]

  const activeColumns = columns.filter(c => c.name !== '_ws_row_id')

  return (
    <div className="flex items-center gap-2 group animate-in fade-in slide-in-from-left-2 duration-200">
      {/* Logical Connector Visual */}
      <div className="w-12 shrink-0 flex justify-end pr-2 text-[10px] font-bold text-zinc-300 select-none">
        {index === 0 ? 'WHERE' : conjunction}
      </div>

      <div className="flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1.5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
        {/* Column Select */}
        <Select 
          value={condition.columnName} 
          onValueChange={(val) => onUpdate(condition.id, { columnName: val })}
        >
          <SelectTrigger className="h-7 w-[140px] text-xs border-transparent bg-zinc-50 focus:ring-0 focus:bg-white transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {activeColumns.map(col => {
               const alias = col.semantic?.aliases?.[0]
               return (
                 <SelectItem key={col.name} value={col.name}>
                   <span className="text-xs">{alias ? `${alias} (${col.name})` : col.name}</span>
                 </SelectItem>
               )
            })}
          </SelectContent>
        </Select>

        {/* Operator Select */}
        <Select 
          value={condition.operator} 
          onValueChange={(val: any) => onUpdate(condition.id, { operator: val })}
        >
          <SelectTrigger className="h-7 w-[100px] text-xs border-transparent bg-zinc-50 focus:ring-0 focus:bg-white text-zinc-600 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableOps.map(([op, conf]) => (
              <SelectItem key={op} value={op}>
                <span className="text-xs">{conf.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Input */}
        <div className="flex-1 min-w-[100px]">
          <ValueInput 
            type={currentOpConfig.inputType} 
            value={condition.value} 
            onChange={(val) => onUpdate(condition.id, { value: val })} 
          />
        </div>

        {/* Remove Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-zinc-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove(condition.id)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

function ValueInput({ type, value, onChange }: { type: string, value: any, onChange: (val: any) => void }) {
  if (type === 'none') return null

  if (type === 'range') {
    return (
      <div className="flex items-center gap-1">
        <Input 
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="Min"
          value={Array.isArray(value) ? value[0] || '' : ''}
          onChange={(e) => {
             const max = Array.isArray(value) ? value[1] || '' : ''
             onChange([e.target.value, max])
          }}
        />
        <span className="text-[10px] text-zinc-400">-</span>
        <Input 
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="Max"
          value={Array.isArray(value) ? value[1] || '' : ''}
          onChange={(e) => {
             const min = Array.isArray(value) ? value[0] || '' : ''
             onChange([min, e.target.value])
          }}
        />
      </div>
    )
  }

  if (type === 'number') {
    return (
      <Input 
        type="number"
        className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (type === 'date') {
    return (
      <div className="relative">
        <Input 
          type="date"
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors appearance-none pr-8"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <Calendar className="absolute right-2 top-1.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
      </div>
    )
  }

  if (type === 'multi') {
    return (
      <Input 
        className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
        placeholder="A, B, C..."
        value={Array.isArray(value) ? value.join(', ') : value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  // Boolean Toggle
  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    const isTrue = value === true || value === 'true'
    return (
      <div className="flex items-center gap-2">
        <Switch 
          checked={isTrue} 
          onCheckedChange={onChange}
          className="scale-75"
        />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter w-8">
          {isTrue ? 'True' : 'False'}
        </span>
      </div>
    )
  }

  return (
    <Input 
      className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
      placeholder="Value..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
