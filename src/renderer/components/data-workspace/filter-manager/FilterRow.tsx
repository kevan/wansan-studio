import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { 
  FilterCondition, 
  FilterValidationCode,
  OPERATOR_CONFIG, 
  FilterOperator, 
  getSimpleType,
} from '@shared/types/filter'
import { ColumnSchema } from '@shared/types'
import { cn } from '@/utils/cn'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ValueInput } from './ValueInput'
import { getEffectiveInputType } from './utils'

interface FilterRowProps { 
  tableName: string
  condition: FilterCondition
  columns: ColumnSchema[]
  index: number
  conjunction: 'AND' | 'OR'
  onUpdate: (id: string, updates: Partial<FilterCondition>) => void
  onRemove: (id: string) => void
  validationCodes: FilterValidationCode[]
}

export function FilterRow({ 
  tableName,
  condition, 
  columns, 
  index, 
  conjunction,
  onUpdate, 
  onRemove,
  validationCodes
}: FilterRowProps) {
  const { t } = useTranslation('common')
  const simpleType = getSimpleType(condition.columnType)
  
  const availableOps = React.useMemo(() => 
    Object.entries(OPERATOR_CONFIG).filter(([_, conf]) => 
      conf.validTypes.includes(simpleType)
    ) as [FilterOperator, typeof OPERATOR_CONFIG['equals']][],
    [simpleType]
  )

  const activeColumns = React.useMemo(() => 
    columns.filter(c => c.name !== '_ws_row_id'),
    [columns]
  )

  const selectedColumn = activeColumns.find(c => c.name === condition.columnName)
  const safeColumnValue = selectedColumn ? condition.columnName : (activeColumns[0]?.name || '')
  const safeOperatorValue = availableOps.some(([op]) => op === condition.operator)
    ? condition.operator
    : (availableOps[0]?.[0] || 'equals')

  useEffect(() => {
    const hasColumn = activeColumns.some(c => c.name === condition.columnName)
    if (!hasColumn && activeColumns.length > 0) {
      const fallback = activeColumns[0]
      onUpdate(condition.id, { 
        columnName: fallback.name, 
        columnType: fallback.type, 
        sourceType: fallback.sourceType 
      })
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
