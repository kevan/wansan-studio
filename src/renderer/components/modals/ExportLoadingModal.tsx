import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sparkles } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from 'react-i18next'

const STEPS = [
  'Analyzing Data',
  'Designing Layout',
  'Writing Code',
  'Finalizing',
]

export function ExportLoadingModal({ isOpen }: { isOpen: boolean }) {
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)
  const { t } = useTranslation('common')

  // Fake Progress
  useEffect(() => {
    if (!isOpen) return
    setProgress(0)
    setStep(0)

    // 1. Progress Bar Logic (Zeno's Paradox)
    const progressTimer = setInterval(() => {
      setProgress(old => {
        // Fast at start
        if (old < 30) return old + 2
        // Medium
        if (old < 70) return old + 0.5
        // Slow crawl
        if (old < 95) return old + 0.1
        // Freeze
        return 95
      })
    }, 100)

    // 2. Steps Logic (One-way)
    const stepTimer = setInterval(() => {
      setStep(s => {
        if (s < STEPS.length - 1) return s + 1
        return s // Stay at last step
      })
    }, 5000) // 5s per step

    return () => {
      clearInterval(progressTimer)
      clearInterval(stepTimer)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-xs p-8 flex flex-col items-center text-center [&>button]:hidden">
        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4 relative">
          <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse relative z-10" />
          <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-20"></div>
        </div>

        <h3 className="text-lg font-semibold mb-1">
          {t('creating_web_report', 'Creating Web Report')}
        </h3>
        <p className="text-sm text-zinc-500 mb-6 min-h-[20px] transition-all">
          {t(`export_step_${step}`, STEPS[step])}...
        </p>

        <Progress value={progress} className="h-1 w-full" />
      </DialogContent>
    </Dialog>
  )
}