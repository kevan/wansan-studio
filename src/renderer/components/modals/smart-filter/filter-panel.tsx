import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { FilterParam } from '@shared/schemas/analysis'
import { useTranslation } from 'react-i18next'
import { useSmartOptions } from '@/hooks/useSmartOptions'

interface FilterPanelProps {
  param: FilterParam
  value: string[]
  onChange: (value: string[]) => void
}

export function FilterPanel({ param, value, onChange }: FilterPanelProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [searchTerm, setSearchTerm] = useState(param.hint || '')
  const [debouncedTerm, setDebouncedTerm] = useState(param.hint || '')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const { options, loading: isSearching } = useSmartOptions(
    param.table,
    param.column,
    param.display_columns || [],
    debouncedTerm
  )

  const toggleValue = (val: string) => {
    onChange(
      value.includes(val) ? value.filter((v) => v !== val) : [...value, val]
    )
  }

  const renderOptionItem = (opt: any) => {
    const val = String(opt.value)
    const isChecked = value.includes(val)

    let mainLabel = val
    let subLabels = ''

    if (param.display_columns && param.display_columns.length > 0) {
      const firstCol = param.display_columns[0]
      if (opt[firstCol]) mainLabel = String(opt[firstCol])

      const otherCols = param.display_columns.slice(1)
      subLabels = otherCols
        .map((c: string) => opt[c])
        .filter(Boolean)
        .join(' • ')
    }

    return (
      <div
        key={val}
        onClick={() => toggleValue(val)}
        className={cn(
          'flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all select-none border border-transparent',
          isChecked
            ? 'bg-indigo-50/60 border-indigo-100/50'
            : 'hover:bg-zinc-100 hover:border-zinc-200/50'
        )}
      >
        <Checkbox
          checked={isChecked}
          readOnly
          className={cn(
            'data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 transition-all duration-200 shrink-0',
            isChecked ? 'shadow-sm' : 'border-zinc-300'
          )}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <span
            className={cn(
              'truncate font-medium',
              isChecked ? 'text-indigo-900' : 'text-zinc-900'
            )}
          >
            {mainLabel}
          </span>
          {subLabels && (
            <span className="text-xs text-zinc-500 truncate">{subLabels}</span>
          )}
        </div>

        <div className="ml-2 px-1.5 py-0.5 bg-zinc-100 text-[10px] font-mono text-zinc-400 rounded shrink-0">
          {val}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search */}
      <div className="p-3 border-b border-zinc-100 bg-white">
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
          <Input
            placeholder={t('search_value_placeholder')}
            className="pl-9 h-9 bg-zinc-50 border-zinc-200 text-sm focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-zinc-400" />
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 bg-white">
        <div className="p-2 space-y-0.5 min-h-[200px]">
          {options.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-zinc-400 space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                <Search className="w-5 h-5 opacity-40" />
              </div>
              <span className="text-xs font-medium">
                {t('no_matching_values')}
              </span>
            </div>
          ) : (
            options.map((opt) => renderOptionItem(opt))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
