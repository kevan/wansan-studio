import { cn } from '@/utils/cn'
import { WizardStep } from '@shared/types/wizard'
import { Check } from 'lucide-react'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'select', label: 'Select Files' },
  { id: 'preview', label: 'Review Data' },
  { id: 'target', label: 'Configure Target' }, // Skipped in simple append?
  { id: 'summary', label: 'Summary' },
]

export function Steps({ currentStep }: { currentStep: WizardStep }) {
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
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
