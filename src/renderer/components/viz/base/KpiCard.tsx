import React from 'react'
import { cn } from '@/utils/cn'
import { formatForDisplay } from '@shared/serialization'

interface KpiCardProps {
  value: any
  label: string
  variant?: 'chat' | 'dashboard'
}

export function KpiCard({ value, label, variant = 'chat' }: KpiCardProps) {
  const isDashboard = variant === 'dashboard'
  const formattedValue = formatForDisplay(value)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500',
        isDashboard ? 'h-full w-full p-3 sm:p-4 md:p-6' : 'w-full max-w-sm p-3 sm:p-4 md:p-6'
      )}
    >
      <div
        className={cn(
          'font-black tracking-tighter text-zinc-900 leading-none',
          isDashboard ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-2 sm:mb-3 md:mb-4' : 'text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2'
        )}
      >
        {formattedValue}
      </div>
      <div
        className={cn(
          'font-bold uppercase tracking-[0.2em] text-zinc-400',
          isDashboard ? 'text-[10px] sm:text-xs' : 'text-[9px] sm:text-[10px]'
        )}
      >
        {label}
      </div>
    </div>
  )
}
