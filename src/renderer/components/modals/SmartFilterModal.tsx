import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FilterParam } from '@shared/schemas/analysis'
import { Loader2, Search, Sparkles, Check } from 'lucide-react'
import debounce from 'lodash.debounce'
import { cn } from '@/utils/cn'

interface SmartFilterModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  params: FilterParam[]
  templateSql: string
  onConfirm: (finalSql: string) => void
  onCancel: () => void
}

function SimpleCheckbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border border-zinc-900 ring-offset-background flex items-center justify-center transition-colors",
        checked ? "bg-zinc-900 text-zinc-50 border-zinc-900" : "bg-transparent border-zinc-400"
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </div>
  )
}

function FilterParamBlock({
  param,
  selectedValues,
  onChange,
}: {
  param: FilterParam
  selectedValues: string[]
  onChange: (vals: string[]) => void
}) {
  const [searchTerm, setSearchTerm] = useState(param.hint || '')
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOptions = useCallback(
    async (term: string) => {
      setLoading(true)
      try {
        let query = `SELECT DISTINCT "${param.column}" as val FROM "${param.table}" WHERE "${param.column}" IS NOT NULL`
        if (term) {
           const safeTerm = term.replace(/'/g, "''")
           query += ` AND "${param.column}" ILIKE '%${safeTerm}%'`
        }
        query += ` LIMIT 50`

        const result = await window.electronAPI.runSQL(query)
        if (result.success && result.data) {
          setOptions(result.data.data.map((row: any) => String(row.val)))
        } else {
          setOptions([])
        }
      } catch (e) {
        console.error('Failed to fetch options', e)
        setOptions([])
      } finally {
        setLoading(false)
      }
    },
    [param.column, param.table]
  )

  const debouncedFetch = useMemo(
    () => debounce(fetchOptions, 300),
    [fetchOptions]
  )

  useEffect(() => {
    fetchOptions(searchTerm)
    return () => {
      debouncedFetch.cancel()
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)
    debouncedFetch(val)
  }

  const toggleSelection = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val))
    } else {
      onChange([...selectedValues, val])
    }
  }

  const isSelected = (val: string) => selectedValues.includes(val)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header for this param */}
      <div className="px-6 py-4 pb-2 space-y-1 bg-white flex-none">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-semibold leading-none tracking-tight">Refine Analysis</h3>
        </div>
        <p className="text-sm text-zinc-500">
          Select specific <strong>{param.label || param.column}</strong> values to filter by.
        </p>
      </div>

      {/* Search Input */}
      <div className="px-6 py-2 border-b border-zinc-100 bg-white flex-none">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            placeholder={`Search ${param.label || param.column}...`}
            className="pl-9 border-zinc-200 bg-zinc-50 focus-visible:ring-zinc-400 focus-visible:border-zinc-400"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-zinc-400" />
          )}
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-2 min-h-[300px] max-h-[300px]">
        {options.length === 0 && !loading ? (
           <div className="h-full flex items-center justify-center text-sm text-zinc-400">
             No matching values found.
           </div>
        ) : (
           <div className="space-y-1 p-2">
             {options.map(opt => (
               <div 
                 key={opt}
                 onClick={() => toggleSelection(opt)}
                 className={cn(
                   "flex items-center space-x-3 p-2.5 rounded-md cursor-pointer text-sm transition-all select-none",
                   isSelected(opt) ? "bg-zinc-100 font-medium text-zinc-900" : "hover:bg-zinc-50 text-zinc-600"
                 )}
               >
                 <SimpleCheckbox checked={isSelected(opt)} />
                 <span>{opt}</span>
               </div>
             ))}
           </div>
        )}
      </div>
      
      {/* Param Footer (if we had multiple params, this would be complex, but assuming 1 for this UI design) */}
      <div className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100 flex justify-between items-center flex-none">
         <Badge variant="secondary" className="px-2 font-normal text-zinc-500">
            {selectedValues.length} selected
         </Badge>
      </div>
    </div>
  )
}

export function SmartFilterModal({
  isOpen,
  onOpenChange,
  params,
  templateSql,
  onConfirm,
  onCancel,
}: SmartFilterModalProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (isOpen) {
       setSelections({})
       setConfirmed(false)
    }
  }, [isOpen, params])

  const handleConfirm = () => {
    let finalSql = templateSql
    for (const param of params) {
        const vals = selections[param.placeholder] || []
        const sqlList = vals.map(v => `'${v.replace(/'/g, "''")}'`).join(", ")
        finalSql = finalSql.replace(param.placeholder, sqlList || "''") // Fallback empty
    }
    setConfirmed(true)
    onConfirm(finalSql)
    onOpenChange(false)
  }
  
  const handleCancel = () => {
      onCancel()
      onOpenChange(false)
  }

  // Assuming single param for the polished UI, but supporting multiple by rendering multiple blocks?
  // The polished UI design assumes a single list.
  // If multiple params exist, we might need tabs or stacked sections.
  // For now, I will render ONLY the first param if multiple, or map them stacked.
  // To strictly follow the "clean" design, I'll stack them but remove the footer from inside FilterParamBlock
  // and put it in the main modal footer.
  
  const isAllSatisfied = params.every(p => (selections[p.placeholder]?.length || 0) > 0)
  const totalSelected = Object.values(selections).reduce((acc, curr) => acc + curr.length, 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && !confirmed) onCancel()
        onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-[425px] gap-0 p-0 overflow-hidden border-zinc-200 shadow-2xl bg-white block">
        {/* Render only the first param for now as the design is tailored for it.
            If we support multiple, we should probably iterate. 
            But FilterParamBlock includes Header/Input/List. 
            Stacked headers look bad. 
            I'll iterate but maybe visually separate? 
            Or just assume 1 param which is 99% of cases.
        */}
        {params.map((param, idx) => (
            <FilterParamBlock 
              key={param.placeholder}
              param={param}
              selectedValues={selections[param.placeholder] || []}
              onChange={(vals) => setSelections(prev => ({...prev, [param.placeholder]: vals}))}
            />
        ))}

        <DialogFooter className="p-4 bg-zinc-50/50 border-t border-zinc-100 flex justify-between items-center sm:justify-between">
          <Badge variant="secondary" className="px-2 font-normal text-zinc-500">
            {totalSelected} selected
          </Badge>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleCancel} className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50">
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!isAllSatisfied} className="bg-zinc-900 hover:bg-zinc-800 text-white">
              Run Analysis
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
