import React, { useState } from 'react'
import { Plus, X, Filter, Trash2, Check, LayoutPanelTop, Eye, EyeOff } from 'lucide-react'
import { FilterRule, FilterOperator, OPERATORS, getSimpleType } from '@shared/types/filter'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FilterBarProps {
  columns: Array<{ name: string; type: string }>
  filters: FilterRule[]
  onChange: (filters: FilterRule[]) => void
  rightSide?: React.ReactNode
  columnVisibility?: Record<string, boolean>
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void
}

export function FilterBar({ 
  columns, 
  filters, 
  onChange, 
  rightSide,
  columnVisibility = {},
  onColumnVisibilityChange 
}: FilterBarProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  
  // Local state for the "Add Filter" form
  const [newCol, setNewCol] = useState(columns[0]?.name || '')
  const [newOp, setNewOp] = useState<FilterOperator>('equals')
  const [newVal, setNewVal] = useState('')

  const activeColumns = columns.filter(c => c.name !== '_ws_row_id')
  const selectedColType = getSimpleType(columns.find(c => c.name === newCol)?.type || 'VARCHAR')

  const handleAdd = () => {
    if (!newCol) return
    const rule: FilterRule = {
      id: uuidv4(),
      columnName: newCol,
      columnType: columns.find(c => c.name === newCol)?.type || 'VARCHAR',
      operator: newOp,
      value: newVal,
      enabled: true
    }
    onChange([...filters, rule])
    setIsOpen(false)
    setNewVal('')
  }

  const handleRemove = (id: string) => {
    onChange(filters.filter(f => f.id !== id))
  }

  const handleToggle = (id: string) => {
    onChange(filters.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b border-zinc-100 bg-white/50 min-h-[44px]">
      <div className="flex items-center gap-1.5 px-2 text-zinc-400">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{t('filter')}</span>
      </div>

      {filters.map(filter => (
        <Badge
          key={filter.id}
          variant="secondary"
          className={cn(
            "h-7 pl-2 pr-1 flex items-center gap-1.5 group transition-all",
            filter.enabled ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "opacity-50 grayscale"
          )}
        >
          <span 
            className="cursor-pointer flex items-center gap-1"
            onClick={() => handleToggle(filter.id)}
          >
            <span className="font-semibold text-xs">{filter.columnName}</span>
            <span className="text-[10px] text-indigo-400">{OPERATORS[filter.operator].label}</span>
            {filter.operator !== 'is_null' && filter.operator !== 'is_not_null' && (
              <span className="max-w-[100px] truncate italic text-xs">&quot;{filter.value}&quot;</span>
            )}
          </span>
          <button 
            onClick={() => handleRemove(filter.id)}
            className="p-0.5 hover:bg-indigo-200/50 rounded-full transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      <div className="flex items-center gap-1 ml-1">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-indigo-600 gap-1.5 px-2">
              <Plus className="w-3.5 h-3.5" />
              {t('add_filter')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 shadow-xl" align="start">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none text-sm">{t('add_filter')}</h4>
                <p className="text-xs text-muted-foreground">根据条件筛选数据</p>
              </div>
              
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">{t('field_name')}</label>
                  <Select value={newCol} onValueChange={setNewCol}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择字段" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeColumns.map(c => (
                        <SelectItem key={c.name} value={c.name}>
                          <span className="text-xs">{c.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">{t('operator')}</label>
                  <Select value={newOp} onValueChange={(v: FilterOperator) => setNewOp(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(OPERATORS) as [FilterOperator, typeof OPERATORS['equals']][]).map(([key, op]) => (
                        op.validTypes.includes(selectedColType) && (
                          <SelectItem key={key} value={key}>
                            <span className="text-xs">{op.label}</span>
                          </SelectItem>
                        )
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newOp !== 'is_null' && newOp !== 'is_not_null' && (
                  <div className="grid gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">{t('value')}</label>
                    <Input 
                      className="h-8 text-xs" 
                      value={newVal} 
                      onChange={e => setNewVal(e.target.value)}
                      placeholder="输入筛选值..."
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                  </div>
                )}

                <Button size="sm" className="w-full h-8 mt-2" onClick={handleAdd}>
                  <Check className="w-3.5 h-3.5 mr-2" /> 确认添加
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {onColumnVisibilityChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-indigo-600 gap-1.5 px-2">
                <LayoutPanelTop className="w-3.5 h-3.5" />
                显示列
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] font-bold text-zinc-400 uppercase">选择要显示的字段</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activeColumns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.name}
                  checked={columnVisibility[col.name] !== false}
                  onCheckedChange={(checked) => {
                    onColumnVisibilityChange({
                      ...columnVisibility,
                      [col.name]: !!checked
                    })
                  }}
                  className="text-xs"
                >
                  <div className="flex items-center gap-2">
                    {columnVisibility[col.name] !== false ? <Eye className="w-3 h-3 text-indigo-500" /> : <EyeOff className="w-3 h-3 text-zinc-300" />}
                    {col.name}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {filters.length > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs text-zinc-400 hover:text-red-500 ml-auto"
          onClick={clearAll}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          {t('clear_all')}
        </Button>
      )}

      {rightSide && (
        <div className={cn("flex items-center gap-2 pr-2", (filters.length === 0 && !onColumnVisibilityChange) && "ml-auto")}>
          {(filters.length > 0 || onColumnVisibilityChange) && <div className="w-px h-4 bg-zinc-200 mx-2" />}
          {rightSide}
        </div>
      )}
    </div>
  )
}
