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

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancel: () => void
  onDiscard: () => void
  onSave: () => void
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onCancel,
  onDiscard,
  onSave,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved View Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes in the current view. Choose how to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="secondary" onClick={onDiscard}>Switch Without Saving</Button>
          <Button onClick={onSave}>Save and Switch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
