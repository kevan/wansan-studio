import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ColumnSchema } from '@shared/types'
import { TableView } from '@shared/types/project'
import { REMOVE_MAPPING_VALUE } from './utils'

interface ViewRepairDialogProps {
  invalidView: { view: TableView; missingColumns: string[] } | null
  setInvalidView: (v: null) => void
  repairMap: Record<string, string>
  setRepairMap: (m: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  availableColumns: ColumnSchema[]
  onFallback: () => void
  onRepairAuto: () => void
  onRepairManual: () => void
}

export function ViewRepairDialog({
  invalidView,
  setInvalidView,
  repairMap,
  setRepairMap,
  availableColumns,
  onFallback,
  onRepairAuto,
  onRepairManual,
}: ViewRepairDialogProps) {
  return (
    <Dialog open={!!invalidView} onOpenChange={(open) => !open && setInvalidView(null)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>View Needs Repair</DialogTitle>
          <DialogDescription>
            Some fields in this view no longer exist in the current schema. Repair before applying.
          </DialogDescription>
        </DialogHeader>

        {invalidView && (
          <div className="space-y-3 py-2">
            {invalidView.missingColumns.map((col) => (
              <div key={col} className="grid grid-cols-[1fr_1fr] gap-2 items-center">
                <div className="text-xs text-zinc-600 truncate">Missing: <code>{col}</code></div>
                <Select
                  value={repairMap[col] || REMOVE_MAPPING_VALUE}
                  onValueChange={(value) => {
                    setRepairMap(prev => ({ ...prev, [col]: value }))
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Remove (no mapping)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={REMOVE_MAPPING_VALUE}>Remove</SelectItem>
                    {availableColumns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.semantic?.aliases?.[0] ? `${c.semantic.aliases[0]} (${c.name})` : c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onFallback}>Fallback to Default</Button>
          <Button variant="secondary" onClick={onRepairAuto}>Auto Repair</Button>
          <Button onClick={onRepairManual}>Apply Manual Mapping</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
