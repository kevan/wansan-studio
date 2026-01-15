import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from 'react-i18next'

export function ExportLoadingModal({ 
  isOpen 
}: { 
  isOpen: boolean
}) {
  const [progress, setProgress] = useState(0)
  const { t } = useTranslation('common')

  // Fast linear progress for export
  useEffect(() => {
    if (!isOpen) return
    setProgress(0)

    const timer = setInterval(() => {
      setProgress(old => {
        if (old < 90) return old + 2
        if (old < 98) return old + 0.2
        return 98
      })
    }, 200)

    return () => clearInterval(timer)
  }, [isOpen])

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-xs p-8 flex flex-col items-center text-center [&>button]:hidden">
        <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-100">
          <Loader2 className="w-6 h-6 text-zinc-900 animate-spin" />
        </div>

        <h3 className="text-lg font-bold mb-6">
          {t('export_generating_file', 'Generating export file...')}
        </h3>

        <Progress value={progress} className="h-1 w-full" />
      </DialogContent>
    </Dialog>
  )
}