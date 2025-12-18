import { RefreshCw } from 'lucide-react'
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
import { useState } from 'react'
import { useToastStore } from '../../stores/useToastStore'

export function RefreshConfirmModal() {
  const showRefreshConfirm = useProjectStore(state => state.showRefreshConfirm)
  const setShowRefreshConfirm = useProjectStore(state => state.setShowRefreshConfirm)
  const refreshSessionWidgets = useProjectStore(state => state.refreshSessionWidgets)
  const addToast = useToastStore(state => state.addToast)
  const { t } = useTranslation('common')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshSessionWidgets()
      addToast({
        type: 'success',
        title: t('refresh_success'),
      })
    } catch (e) {
      console.error(e)
      addToast({
        type: 'error',
        title: t('reload_failed'),
      })
    } finally {
      setIsRefreshing(false)
      setShowRefreshConfirm(false)
    }
  }

  return (
    <Dialog open={showRefreshConfirm} onOpenChange={setShowRefreshConfirm}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} /> 
            {t('refresh_charts_confirm_title')}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {t('refresh_charts_confirm_desc')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRefreshConfirm(false)} disabled={isRefreshing}>
            {t('maybe_later')}
          </Button>
          <Button 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? t('reloading') : t('refresh_now')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
