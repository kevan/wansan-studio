import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Crown, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  isOpen: boolean
  onClose: () => void
  featureName: string
}

export function ProGateModal({ isOpen, onClose, featureName }: Props) {
  const { t } = useTranslation('common')

  const handleActivate = () => {
    onClose()
    // Small delay to allow the current dialog to close properly before opening the next one
    setTimeout(() => {
      document.dispatchEvent(
        new CustomEvent('open-settings', { detail: 'general' })
      )
    }, 100)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-yellow-50">
            <Crown className="w-6 h-6 text-yellow-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            {t('unlock_feature', { feature: featureName })}
          </DialogTitle>
          <p className="text-center text-zinc-500 mt-2 text-sm">
            {t(
              'pro_gate_desc',
              'This feature requires a Pro license. Activate now to remove all limits.'
            )}
          </p>
        </DialogHeader>

        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 space-y-3 my-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-zinc-700">
              {t('pro_benefit_unlimited_files', 'Unlimited Files & Sheets')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-zinc-700">
              {t('pro_benefit_export', 'PDF & Web Report Export')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-zinc-700">
              {t('pro_benefit_sql', 'Advanced SQL Editor')}
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-center gap-2 flex-col sm:flex-row">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            {t('maybe_later', 'Maybe Later')}
          </Button>
          <Button
            className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:opacity-90 border-0 shadow-md"
            onClick={handleActivate}
          >
            {t('enter_license', 'Enter License Key')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
