import React, { useEffect, useState } from 'react'
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
  FilterValidationCode,
  OPERATOR_CONFIG, 
  FilterOperator, 
  getSimpleType,
  validateFilterState,
} from '@shared/types/filter'
import { ColumnSchema } from '@shared/types'
import { cn } from '@/utils/cn'
import { v4 as uuidv4 } from 'uuid'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

import { Switch } from '@/components/ui/switch'

interface FilterManagerProps {
  tableName: string
  columns: ColumnSchema[]
  filterState: FilterState
  onChange: (state: FilterState) => void
  errorMessage?: string | null
}

type EffectiveInputType = 'text' | 'number' | 'date' | 'none' | 'multi' | 'range' | 'date_range'

function getEffectiveInputType(operator: FilterOperator, simpleType: ReturnType<typeof getSimpleType>): EffectiveInputType {
  if (simpleType === 'date') {
    if (operator === 'between') return 'date_range'
    if (operator === 'equals' || operator === 'not_equals' || operator === 'gt' || operator === 'gte' || operator === 'lt' || operator === 'lte') {
      return 'date'
    }
  }
  return OPERATOR_CONFIG[operator].inputType
}

export function FilterManager({ tableName, columns, filterState, onChange, errorMessage }: FilterManagerProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const [validationMap, setValidationMap] = useState<Record<string, FilterValidationCode[]>>({})

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
    const issues = validateFilterState(draftState)
    if (issues.length > 0) {
      const nextMap: Record<string, FilterValidationCode[]> = {}
      issues.forEach(issue => {
        if (!nextMap[issue.conditionId]) nextMap[issue.conditionId] = []
        nextMap[issue.conditionId].push(issue.code)
      })
      setValidationMap(nextMap)
      return
    }

    setValidationMap({})
    onChange(draftState)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setValidationMap({})
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
            } else if (newSimpleType === 'date') {
              newCond.operator = 'gte'
              newCond.value = ''
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
        const effectiveInputType = getEffectiveInputType(newCond.operator, simpleType)

        // Coerce value based on operator and type
        if (effectiveInputType === 'number') {
          newCond.value = newCond.value === '' ? '' : Number(newCond.value)
        } else if (effectiveInputType === 'multi') {
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
    setValidationMap(prev => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleRemoveCondition = (id: string) => {
    setDraftState(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== id)
    }))
    setValidationMap(prev => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const toggleConjunction = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraftState(prev => ({
      ...prev,
      conjunction: prev.conjunction === 'AND' ? 'OR' : 'AND'
    }))
  }

  const activeCount = filterState.conditions.filter(c => c.enabled).length
  const totalCount = filterState.conditions.length

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
          <span>{t('filter')}</span>
          {totalCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/80 border border-zinc-200">
              {activeCount}/{totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[860px] max-w-[95vw] p-0 shadow-2xl border-zinc-200/50 pointer-events-auto" 
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
        {errorMessage && (
          <div className="px-4 py-2 text-xs text-red-700 bg-red-50 border-b border-red-100">
            {errorMessage}
          </div>
        )}
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
                tableName={tableName}
                condition={condition}
                columns={columns}
                index={index}
                conjunction={draftState.conjunction}
                onUpdate={handleUpdateCondition}
                onRemove={handleRemoveCondition}
                validationCodes={validationMap[condition.id] || []}
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
                {t('apply_filters', 'Apply Filters')}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function FilterRow({ 
  tableName,
  condition, 
  columns, 
  index, 
  conjunction,
  onUpdate, 
  onRemove,
  validationCodes
}: { 
  tableName: string
  condition: FilterCondition
  columns: ColumnSchema[]
  index: number
  conjunction: 'AND' | 'OR'
  onUpdate: (id: string, updates: Partial<FilterCondition>) => void
  onRemove: (id: string) => void
  validationCodes: FilterValidationCode[]
}) {
  const { t } = useTranslation('common')
  const simpleType = getSimpleType(condition.columnType)
  const availableOps = Object.entries(OPERATOR_CONFIG).filter(([_, conf]) => 
    conf.validTypes.includes(simpleType)
  ) as [FilterOperator, typeof OPERATOR_CONFIG['equals']][]

  const activeColumns = columns.filter(c => c.name !== '_ws_row_id')
  const selectedColumn = activeColumns.find(c => c.name === condition.columnName)
  const safeColumnValue = selectedColumn ? condition.columnName : (activeColumns[0]?.name || '')
  const safeOperatorValue = availableOps.some(([op]) => op === condition.operator)
    ? condition.operator
    : (availableOps[0]?.[0] || 'equals')

  useEffect(() => {
    const hasColumn = activeColumns.some(c => c.name === condition.columnName)
    if (!hasColumn && activeColumns.length > 0) {
      const fallback = activeColumns[0]
      onUpdate(condition.id, { columnName: fallback.name, columnType: fallback.type, sourceType: fallback.sourceType })
      return
    }

    const isValidOperator = availableOps.some(([op]) => op === condition.operator)
    if (!isValidOperator && availableOps.length > 0) {
      onUpdate(condition.id, { operator: availableOps[0][0] })
    }
  }, [activeColumns, availableOps, condition.id, condition.columnName, condition.operator, onUpdate])

  return (
    <div className="flex items-center gap-2 group animate-in fade-in slide-in-from-left-2 duration-200">
      {/* Logical Connector Visual */}
      <div className="w-12 shrink-0 flex justify-end pr-2 text-[10px] font-bold text-zinc-300 select-none">
        {index === 0 ? 'WHERE' : conjunction}
      </div>

      <div className={cn(
        "flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1.5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all",
        !condition.enabled && "opacity-60 border-dashed bg-zinc-50"
      )}>
        {/* Column Select */}
        <Select 
          value={safeColumnValue} 
          onValueChange={(val) => onUpdate(condition.id, { columnName: val })}
        >
          <SelectTrigger className="h-7 w-[140px] text-xs border-transparent bg-zinc-50 focus:ring-0 focus:bg-white transition-colors">
            <SelectValue placeholder={t('select_field', 'Select field')} />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {activeColumns.map(col => {
               const alias = col.semantic?.aliases?.[0]
               return (
                 <SelectItem key={col.name} value={col.name}>
                   {alias ? `${alias} (${col.name})` : col.name}
                 </SelectItem>
               )
            })}
          </SelectContent>
        </Select>

        {/* Operator Select */}
        <Select 
          value={safeOperatorValue} 
          onValueChange={(val: FilterOperator) => onUpdate(condition.id, { operator: val })}
        >
          <SelectTrigger className="h-7 w-[100px] text-xs border-transparent bg-zinc-50 focus:ring-0 focus:bg-white text-zinc-600 transition-colors">
            <SelectValue placeholder={t('select_operator', 'Select operator')} />
          </SelectTrigger>
          <SelectContent>
            {availableOps.map(([op, conf]) => (
              <SelectItem key={op} value={op}>
                {conf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Input */}
        <div className="flex-1 min-w-[100px]">
          <ValueInput
            tableName={tableName}
            columnName={condition.columnName}
            columnType={condition.columnType}
            operator={condition.operator}
            type={getEffectiveInputType(condition.operator, simpleType)}
            value={condition.value} 
            onChange={(val) => onUpdate(condition.id, { value: val })} 
          />
        </div>

        <Button
          variant={condition.enabled ? "secondary" : "outline"}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => onUpdate(condition.id, { enabled: !condition.enabled })}
        >
          {condition.enabled ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
        </Button>

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
      {validationCodes.length > 0 && (
        <div className="text-[10px] text-red-600 pl-14">
          {validationCodes.map(code => (
            <div key={code}>
              {code === 'value_required' && t('filter_value_required', 'Value is required')}
              {code === 'range_required' && t('filter_range_required', 'Both min and max are required')}
              {code === 'range_invalid' && t('filter_range_invalid', 'Range is invalid (min should be <= max)')}
              {code === 'list_required' && t('filter_list_required', 'At least one list item is required')}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ValueInput({
  tableName,
  columnName,
  columnType,
  operator,
  type,
  value,
  onChange
}: {
  tableName: string
  columnName: string
  columnType: string
  operator: FilterOperator
  type: EffectiveInputType
  value: unknown
  onChange: (val: unknown) => void
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const shouldFetchSuggestions = (
    operator === 'equals' ||
    operator === 'not_equals' ||
    operator === 'in' ||
    operator === 'not_in'
  )

  useEffect(() => {
    let active = true
    if (!shouldFetchSuggestions || !tableName || !columnName) {
      setSuggestions([])
      return
    }

    const escapedTable = tableName.replace(/"/g, '""')
    const escapedColumn = columnName.replace(/"/g, '""')
    setLoadingSuggestions(true)
    window.electronAPI.runSQL(
      `SELECT DISTINCT "${escapedColumn}" AS v FROM "${escapedTable}" WHERE "${escapedColumn}" IS NOT NULL ORDER BY 1 LIMIT 50`
    ).then(res => {
      if (!active) return
      if (!res.success || !res.data) {
        setSuggestions([])
        return
      }
      const next = (res.data.data || [])
        .map((row: Record<string, unknown>) => row.v)
        .filter((v: unknown) => v !== null && v !== undefined)
        .map((v: unknown) => String(v))
      setSuggestions(next)
    }).catch(() => {
      if (!active) return
      setSuggestions([])
    }).finally(() => {
      if (active) setLoadingSuggestions(false)
    })

    return () => {
      active = false
    }
  }, [shouldFetchSuggestions, tableName, columnName, operator, columnType])

  const appendListValue = (selected: string) => {
    const current = Array.isArray(value)
      ? value.map(v => String(v))
      : String(value || '').split(',').map(v => v.trim()).filter(Boolean)
    if (!current.includes(selected)) {
      onChange([...current, selected].join(', '))
    }
  }

  if (type === 'none') return null

  if (type === 'range' || type === 'date_range') {
    const inputType = type === 'date_range' ? 'date' : 'text'
    const minValue = Array.isArray(value) ? (value[0] as string | number | undefined) || '' : ''
    const maxValue = Array.isArray(value) ? (value[1] as string | number | undefined) || '' : ''

    return (
      <div className="flex items-center gap-1">
        <Input 
          type={inputType}
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="Min"
          value={minValue}
          onChange={(e) => {
             const max = Array.isArray(value) ? (value[1] as string | number | undefined) || '' : ''
             onChange([e.target.value, max])
          }}
        />
        <span className="text-[10px] text-zinc-400">-</span>
        <Input 
          type={inputType}
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="Max"
          value={maxValue}
          onChange={(e) => {
             const min = Array.isArray(value) ? (value[0] as string | number | undefined) || '' : ''
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
          value={typeof value === 'number' || typeof value === 'string' ? value : ''}
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
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <Calendar className="absolute right-2 top-1.5 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
      </div>
    )
  }

  if (type === 'multi') {
    return (
      <div className="flex items-center gap-1">
        <Input 
          className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
          placeholder="A, B, C..."
          value={Array.isArray(value) ? value.join(', ') : (typeof value === 'string' || typeof value === 'number' ? value : '')}
          onChange={(e) => onChange(e.target.value)}
        />
        {suggestions.length > 0 && (
          <Select onValueChange={appendListValue}>
            <SelectTrigger className="h-7 w-[120px] text-xs border-zinc-100 bg-zinc-50">
              <SelectValue placeholder={loadingSuggestions ? '...' : 'Pick'} />
            </SelectTrigger>
            <SelectContent>
              {suggestions.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
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

  if ((operator === 'equals' || operator === 'not_equals') && suggestions.length > 0) {
    return (
      <Select
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onValueChange={onChange}
      >
        <SelectTrigger className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors">
          <SelectValue placeholder={loadingSuggestions ? 'Loading...' : 'Select value'} />
        </SelectTrigger>
        <SelectContent className="max-h-[240px]">
          {suggestions.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input 
      className="h-7 text-xs border-zinc-100 bg-zinc-50 focus:bg-white transition-colors"
      placeholder="Value..."
      value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
