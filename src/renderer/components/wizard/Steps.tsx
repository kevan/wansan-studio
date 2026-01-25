import { cn } from '@/utils/cn'
import { WizardStep } from '@shared/types/wizard'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STEPS: { id: WizardStep; labelKey: string }[] = [
  { id: 'select', labelKey: 'wizard.steps.select' },
  { id: 'preview', labelKey: 'wizard.steps.preview' },
  { id: 'finalize', labelKey: 'wizard.steps.finalize' },
]

export function Steps({ currentStep }: { currentStep: WizardStep }) {
  const { t } = useTranslation('common')
  const currentIndex = STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex
        const isCurrent = idx === currentIndex

        return (
          <div key={step.id} className="flex items-center gap-2">
            {/* Line */}
            {idx > 0 && (
              <div
                className={cn(
                  'w-8 h-px',
                  isCompleted ? 'bg-indigo-600' : 'bg-zinc-200'
                )}
              />
            )}

            {/* Circle */}
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all',
                isCompleted
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : isCurrent
                    ? 'bg-white border-indigo-600 text-indigo-600 ring-2 ring-indigo-50'
                    : 'bg-white border-zinc-200 text-zinc-400'
              )}
            >
              {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-xs font-medium hidden sm:inline-block',
                isCurrent ? 'text-zinc-900' : 'text-zinc-400'
              )}
            >
              {t(step.labelKey)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
