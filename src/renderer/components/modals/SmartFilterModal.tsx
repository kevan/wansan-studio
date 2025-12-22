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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FilterParam } from '@shared/schemas/analysis'
import { Loader2, Search } from 'lucide-react'
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
    // Initial fetch
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

  return (
    <div className="space-y-2">
      <Label className="text-zinc-700 font-medium">
        Select values for <span className="text-primary">{param.label || param.column}</span>
      </Label>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
        <Input
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder={`Search ${param.label || param.column}...`}
          className="pl-8"
        />
      </div>
      
      <div className="border rounded-md h-40 overflow-y-auto p-1 bg-zinc-50/50">
        {loading ? (
           <div className="flex justify-center items-center h-full">
             <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
           </div>
        ) : options.length === 0 ? (
           <div className="flex justify-center items-center h-full text-xs text-zinc-400">
             No results found
           </div>
        ) : (
           <div className="space-y-0.5">
             {options.map(opt => (
               <div 
                 key={opt}
                 className={cn(
                   "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-zinc-100 transition-colors text-sm",
                   selectedValues.includes(opt) && "bg-indigo-50 text-indigo-700 font-medium"
                 )}
                 onClick={() => toggleSelection(opt)}
               >
                 <input 
                   type="checkbox" 
                   checked={selectedValues.includes(opt)} 
                   readOnly 
                   className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                 />
                 <span className="truncate flex-1">{opt}</span>
               </div>
             ))}
           </div>
        )}
      </div>
      <div className="text-xs text-zinc-500 text-right">
        {selectedValues.length} selected
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
        // Convert to SQL list: 'A', 'B'
        const sqlList = vals.map(v => `'${v.replace(/'/g, "''")}'`).join(", ")
        
        finalSql = finalSql.replace(param.placeholder, sqlList)
    }
    setConfirmed(true)
    onConfirm(finalSql)
    onOpenChange(false)
  }
  
  const handleCancel = () => {
      onCancel()
      onOpenChange(false)
  }

  const isAllSatisfied = params.every(p => (selections[p.placeholder]?.length || 0) > 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && !confirmed) onCancel()
        onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Smart Filter</DialogTitle>
          <DialogDescription>
             The AI found ambiguous criteria. Please refine your filter.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {params.map(param => (
                <FilterParamBlock 
                  key={param.placeholder}
                  param={param}
                  selectedValues={selections[param.placeholder] || []}
                  onChange={(vals) => setSelections(prev => ({...prev, [param.placeholder]: vals}))}
                />
            ))}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isAllSatisfied}>
            Run Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}