import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FilterParam } from '@shared/schemas/analysis'
import { Loader2 } from 'lucide-react'

interface SmartFilterModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  params: FilterParam[]
  templateSql: string
  onConfirm: (finalSql: string) => void
}

export function SmartFilterModal({
  isOpen,
  onOpenChange,
  params,
  templateSql,
  onConfirm,
}: SmartFilterModalProps) {
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>({})
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && params.length > 0) {
      loadOptions()
      // Reset selections when opening with new params
      setSelections({})
    }
  }, [isOpen, params]) // params dependency might need stable reference or check, but usually it's a new object from parent state

  const loadOptions = async () => {
    setLoading(true)
    const newOptions: Record<string, string[]> = {}
    
    try {
      for (const param of params) {
        let query = `SELECT DISTINCT "${param.column}" as val FROM "${param.table}" WHERE "${param.column}" IS NOT NULL`
        
        if (param.hint) {
             query += ` AND "${param.column}" ILIKE '%${param.hint}%'`
        }
        
        query += ` LIMIT 50`

        // Use window.electronAPI directly as it's the bridge
        const result = await window.electronAPI.runSQL(query)
        if (result.success && result.data) {
           newOptions[param.placeholder] = result.data.data.map((row: any) => String(row.val))
        } else {
           newOptions[param.placeholder] = []
        }
      }
      setOptionsMap(newOptions)
    } catch (e) {
      console.error("Failed to load filter options", e)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    let finalSql = templateSql
    for (const param of params) {
        const val = selections[param.placeholder] || ''
        // Replace the placeholder. 
        // Note: The AI puts the placeholder where the value should be. 
        // If the placeholder is {{CITY}} and the SQL is ... = '{{CITY}}', 
        // replacing {{CITY}} with 'Beijing' results in ... = ''Beijing''.
        // The prompt says: "Use a placeholder in the SQL (e.g., WHERE city = '{{CITY}}')"
        // So we should replace {{CITY}} with the value directly.
        finalSql = finalSql.replace(param.placeholder, val)
    }
    onConfirm(finalSql)
    onOpenChange(false)
  }

  const isAllSelected = params.every(p => !!selections[p.placeholder])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Smart Filter</DialogTitle>
          <DialogDescription>
            The AI needs clarification. Please select the correct values for the following filters.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
            {loading ? (
                 <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-zinc-400" /></div>
            ) : (
                params.map(param => (
                    <div key={param.placeholder} className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor={param.placeholder} className="text-right text-zinc-600">
                          {param.label}
                        </Label>
                        <div className="col-span-3">
                            <Select 
                                value={selections[param.placeholder]} 
                                onValueChange={(val) => setSelections(prev => ({...prev, [param.placeholder]: val}))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={`Select ${param.label}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {optionsMap[param.placeholder]?.length === 0 ? (
                                        <div className="p-2 text-sm text-zinc-500">No options found</div>
                                    ) : (
                                        optionsMap[param.placeholder]?.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ))
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isAllSelected || loading}>
            Apply Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
