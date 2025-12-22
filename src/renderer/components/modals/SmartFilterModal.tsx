import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Search, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { FilterParam } from '@shared/schemas/analysis'
import debounce from 'lodash.debounce'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const confirmedRef = useRef(false)

  const activeParam = params[0]

  const fetchOptions = useCallback(
    async (term: string) => {
      if (!activeParam) return
      setIsSearching(true)
      try {
        let query = `SELECT DISTINCT "${activeParam.column}" as val FROM "${activeParam.table}" WHERE "${activeParam.column}" IS NOT NULL`
        if (term) {
          const safeTerm = term.replace(/'/g, "''")
          query += ` AND "${activeParam.column}" ILIKE '%${safeTerm}%'`
        }
        query += ` LIMIT 100`

        const result = await window.electronAPI.runSQL(query)
        if (result.success && result.data) {
          setSearchResults(result.data.data.map((row: any) => String(row.val)))
        } else {
          setSearchResults([])
        }
      } catch (e) {
        console.error('Failed to fetch options', e)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [activeParam]
  )

  const debouncedFetch = useMemo(
    () => debounce(fetchOptions, 300),
    [fetchOptions]
  )

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(activeParam?.hint || '')
      setSelectedValues([])
      confirmedRef.current = false
      fetchOptions(activeParam?.hint || '')
    }
    return () => {
      debouncedFetch.cancel()
    }
  }, [isOpen, activeParam, fetchOptions, debouncedFetch])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)
    debouncedFetch(val)
  }

  const toggleValue = (val: string) => {
    setSelectedValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    )
  }

  const handleConfirm = () => {
    if (selectedValues.length === 0) return
    
    let finalSql = templateSql
    // 为当前活动参数进行替换
    if (activeParam) {
      const sqlList = selectedValues.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')
      finalSql = finalSql.replace(activeParam.placeholder, sqlList)
    }
    
    confirmedRef.current = true
    onConfirm(finalSql)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !confirmedRef.current && onCancel()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-zinc-200 shadow-2xl bg-white block">
        
        {/* 1. Header Area with Gradient Hint */}
        <div className="p-5 pb-4 border-b border-zinc-100 bg-gradient-to-b from-zinc-50/50 to-white">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 mt-0.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="space-y-1 text-left">
              <h3 className="font-semibold text-zinc-900 leading-none">
                Refine Analysis Criteria
              </h3>
              <p className="text-sm text-zinc-500">
                The AI detected ambiguity for <span className="font-medium text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">{activeParam?.label || activeParam?.column || 'a column'}</span>. Please select specific values.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Search Input Area */}
        <div className="px-4 py-3 border-b border-zinc-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder={`Search in ${activeParam?.column}...`}
              className="pl-9 bg-zinc-50 border-zinc-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all h-9 text-sm"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (selectedValues.length > 0 && searchResults.length === 0) {
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

        {/* 3. List Area */}
        <ScrollArea className="h-[280px] bg-white">
          <div className="p-2 space-y-1">
            {searchResults.length === 0 && !isSearching ? (
              <div className="flex flex-col items-center justify-center h-[240px] text-zinc-400 space-y-3">
                <div className="p-3 bg-zinc-50 rounded-full">
                  <Search className="w-6 h-6 opacity-20" />
                </div>
                <span className="text-sm">No matching values found</span>
              </div>
            ) : (
              searchResults.map((val) => {
                const isChecked = selectedValues.includes(val)
                return (
                  <div
                    key={val}
                    onClick={() => toggleValue(val)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2.5 rounded-md cursor-pointer text-sm transition-all group border border-transparent select-none",
                      isChecked 
                        ? "bg-indigo-50 border-indigo-100 text-indigo-900" 
                        : "hover:bg-zinc-50 hover:border-zinc-200 text-zinc-700"
                    )}
                  >
                    <Checkbox checked={isChecked} readOnly />
                    <span className="flex-1 truncate">{val}</span>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        {/* 4. Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal bg-white border-zinc-200 text-zinc-600 px-2 py-1">
              {selectedValues.length} selected
            </Badge>
            {selectedValues.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-zinc-400 hover:text-zinc-700 hover:bg-transparent" 
                onClick={() => setSelectedValues([])}
              >
                Clear
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-zinc-500 hover:text-zinc-900">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={selectedValues.length === 0}
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-4 h-8 shadow-sm"
            >
              Run Analysis
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}