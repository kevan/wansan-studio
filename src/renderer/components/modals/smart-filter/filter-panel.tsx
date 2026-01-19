import React, { useState, useEffect, useRef } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  // Local search state
  // If we have initial values selected, clear the search hint so we can see them.
  const initialSearch = value.length > 0 ? '' : param.hint || ''
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [debouncedTerm, setDebouncedTerm] = useState(initialSearch)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasAutoSelected = useRef(false)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const { options, loading: isLoading } = useSmartOptions(
    param.table,
    param.column,
    param.display_columns || [],
    debouncedTerm
  )

  // Auto-select if only one option exists (and we haven't auto-selected yet)
  useEffect(() => {
    if (
      !isLoading &&
      options.length === 1 &&
      value.length === 0 &&
      !hasAutoSelected.current
    ) {
      hasAutoSelected.current = true
      const singleVal = String(options[0].value)
      onChange([singleVal])
    }
  }, [options, isLoading, value, onChange])

  const toggleValue = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val))
    } else {
      onChange([...value, val])
    }
  }

  const handleClear = () => {
    setSearchTerm('')
    inputRef.current?.focus()
  }

  // Merge selected values that might be missing from the current search results (e.g. pagination or filtered out)
  const displayOptions = [...options]
  const optionValueSet = new Set(options.map(o => String(o.value)))

  value.forEach(v => {
    if (!optionValueSet.has(v)) {
      displayOptions.push({ value: v })
    }
  })

  // Sort: Selected items first ONLY on initialization to avoid jumping
  // If the user is searching, we trust the search result order + local append
  const shouldSort = useRef(true)
  useEffect(() => {
    // Disable sorting after first render or if user searches
    const timer = setTimeout(() => {
      shouldSort.current = false
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (shouldSort.current && searchTerm === initialSearch) {
    displayOptions.sort((a, b) => {
      const aSelected = value.includes(String(a.value))
      const bSelected = value.includes(String(b.value))
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return 0
    })
  }

  // Separate selected items from results for better UX
  const selectedOptions = displayOptions.filter(o => value.includes(String(o.value)))
  const resultOptions = options.filter(o => !value.includes(String(o.value)))

  const renderOption = (opt: any) => {
    const val = String(opt.value)
    const isChecked = value.includes(val)

    let mainLabel = val
    let subLabels = ''

    if (param.display_columns && param.display_columns.length > 0) {
      const firstCol = param.display_columns[0]
      if (opt[firstCol]) mainLabel = String(opt[firstCol])

      const otherCols = param.display_columns.slice(1)
      subLabels = otherCols
        .map(c => opt[c])
        .filter(Boolean)
        .join(' • ')
    }

    return (
      <div
        key={val}
        onClick={() => toggleValue(val)}
        className={cn(
          'flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all select-none border border-transparent group',
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
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span
            className={cn(
              'truncate font-medium',
              isChecked ? 'text-indigo-900' : 'text-zinc-900'
            )}
          >
            {mainLabel}
          </span>
          {subLabels && (
            <span className="text-xs text-zinc-500 truncate">
              {subLabels}
            </span>
          )}
        </div>
        {/* Optional ID Badge */}
        <div className="ml-2 px-1.5 py-0.5 bg-zinc-100 text-[10px] font-mono text-zinc-400 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {val}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Search Header */}
      <div className="p-3 border-b border-zinc-100 bg-white shrink-0">
        <div className="relative group">
          {/* Left Icon */}
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />

          <Input
            ref={inputRef}
            placeholder={t('search_value_placeholder')}
            className="pl-9 pr-8 h-9 bg-zinc-50 border-zinc-200 text-sm focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />

          {/* Right Action (Loader OR Clear) */}
          <div className="absolute right-3 top-2.5 flex items-center">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            ) : searchTerm.length > 0 ? (
              <button
                onClick={handleClear}
                className="text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Options List */}
      <div className="flex-1 min-h-0 bg-white relative">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-0.5 min-h-[200px]">
            {/* Selected Items Section */}
            {selectedOptions.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center justify-between">
                  <span>{t('selected_count', { count: selectedOptions.length })}</span>
                  {searchTerm.length > 0 && <span className="text-zinc-300 font-normal lowercase">{t('common:pinned', 'pinned')}</span>}
                </div>
                <div className="space-y-0.5">
                  {selectedOptions.map(renderOption)}
                </div>
                <div className="h-px bg-zinc-100 my-3 mx-2" />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && selectedOptions.length === 0 && resultOptions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[200px] text-zinc-400 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                  <Search className="w-5 h-5 opacity-40" />
                </div>
                <span className="text-xs font-medium">
                  {t('no_matching_values')}
                </span>
              </div>
            )}

            {/* Results Section */}
            {resultOptions.length > 0 && (
              <div className="space-y-0.5">
                {searchTerm.length === 0 && selectedOptions.length > 0 && (
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t('common:suggestions', 'Suggestions')}
                  </div>
                )}
                {resultOptions.map(renderOption)}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
