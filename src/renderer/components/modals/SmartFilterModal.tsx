import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Search, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { FilterParam } from '@shared/schemas/analysis'
import { useTranslation } from 'react-i18next'
import { useSmartOptions } from '@/hooks/useSmartOptions'

interface SmartFilterModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: (finalSql: string) => void
  params: FilterParam[]
  templateSql: string
}

export function SmartFilterModal({
  isOpen,
  onCancel,
  onConfirm,
  params,
  templateSql,
}: SmartFilterModalProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const confirmedRef = useRef(false)

  const activeParam = params[0] || {
    placeholder: '',
    column: '',
    table: '',
    label: '',
  }

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const { options, loading: isSearching } = useSmartOptions(
    activeParam.table,
    activeParam.column,
    activeParam.display_columns || [],
    debouncedTerm
  )

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(activeParam.hint || '')
      // setDebouncedTerm will update via effect above
      setSelectedValues([])
      confirmedRef.current = false
    }
  }, [isOpen, activeParam])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const toggleValue = (val: string) => {
    setSelectedValues(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    )
  }

  const handleConfirm = () => {
    if (selectedValues.length === 0) return

    let finalSql = templateSql
    if (activeParam.placeholder) {
      const sqlList = selectedValues
        .map(v => `'${String(v).replace(/'/g, "''")}'`)
        .join(', ')
      finalSql = finalSql.replace(activeParam.placeholder, sqlList)
    }

    confirmedRef.current = true
    onConfirm(finalSql)
  }

  const renderOptionItem = (opt: any) => {
    const val = String(opt.value)
    const isChecked = selectedValues.includes(val)

    // Display Logic
    let mainLabel = val
    let subLabels = ''

    if (
      activeParam.display_columns &&
      activeParam.display_columns.length > 0
    ) {
      const firstCol = activeParam.display_columns[0]
      if (opt[firstCol]) mainLabel = String(opt[firstCol])

      const otherCols = activeParam.display_columns.slice(1)
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

        {/* ID Badge */}
        <div className="ml-2 px-1.5 py-0.5 bg-zinc-100 text-[10px] font-mono text-zinc-400 rounded shrink-0">
          {val}
        </div>
      </div>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => !open && !confirmedRef.current && onCancel()}
    >
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden border-zinc-200 shadow-2xl bg-white block duration-200">
        {/* 1. Header */}
        <div className="px-5 py-4 border-b border-zinc-100 bg-gradient-to-b from-white to-zinc-50/30">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50/80 rounded-lg border border-indigo-100 shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="space-y-1 text-left">
              <DialogTitle className="text-base font-semibold text-zinc-900">
                {t('refine_analysis_title')}
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 leading-normal">
                {t('refine_analysis_desc_prefix')}{' '}
                <span className="font-medium text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded text-xs border border-zinc-200">
                  {activeParam.label || activeParam.column}
                </span>
                {t('refine_analysis_desc_suffix')}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* 2. Search */}
        <div className="p-3 border-b border-zinc-100 bg-white">
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder={t('search_value_placeholder')}
              className="pl-9 h-9 bg-zinc-50 border-zinc-200 text-sm focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (selectedValues.length > 0) {
                    handleConfirm()
                  }
                }
              }}
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-zinc-400" />
            )}
          </div>
        </div>

        {/* 3. List */}
        <ScrollArea className="h-[260px] bg-white">
          <div className="p-2 space-y-0.5">
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
              options.map(opt => renderOptionItem(opt))
            )}
          </div>
        </ScrollArea>

        {/* 4. Footer */}
        <div className="p-3 px-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
          <div className="text-xs text-zinc-500 font-medium">
            {selectedValues.length > 0 ? (
              <span className="text-indigo-600">
                {t('selected_count', { count: selectedValues.length })}
              </span>
            ) : (
              <span>{t('please_select')}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedValues.length === 0}
              size="sm"
              className={cn(
                'h-8 px-4 transition-all shadow-sm font-medium',
                selectedValues.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                  : 'bg-zinc-200 text-zinc-400'
              )}
            >
              {t('run_analysis')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
