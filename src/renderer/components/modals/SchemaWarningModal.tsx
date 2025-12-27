import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { useProjectStore } from '../../stores/useProjectStore'
import { useTranslation } from 'react-i18next'

export function SchemaWarningModal() {
  const pendingReplace = useProjectStore(state => state.pendingReplace)
  const setPendingReplace = useProjectStore(state => state.setPendingReplace)
  const confirmReplace = useProjectStore(state => state.confirmReplace)
  const { t } = useTranslation('common')

  if (!pendingReplace) return null

  return (
    <Dialog
      open={!!pendingReplace}
      onOpenChange={open => !open && setPendingReplace(null)}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> {t('schema_mismatch_title')}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {t('schema_mismatch_desc')}
            <div className="mt-2 mb-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all">
              {pendingReplace.missing.join(', ')}
            </div>
            {t('schema_mismatch_detail')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPendingReplace(null)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={() => confirmReplace()}>
            {t('proceed_anyway')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
