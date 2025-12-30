import React from 'react'
import { cn } from '@/utils/cn'
import { formatForDisplay } from '@shared/serialization'

interface KpiCardProps {
  value: any
  label: string
  variant?: 'chat' | 'dashboard'
}

export function KpiCard({
  value,
  label,
  variant = 'chat',
}: KpiCardProps) {
  const isDashboard = variant === 'dashboard'
  const formattedValue = formatForDisplay(value)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500',
        isDashboard ? 'h-full w-full' : 'w-full max-w-sm'
      )}
    >
      <div
        className={cn(
          'font-black tracking-tighter text-zinc-900 leading-none',
          isDashboard ? 'text-6xl mb-4' : 'text-4xl mb-2'
        )}
      >
        {formattedValue}
      </div>
      <div
        className={cn(
          'font-bold uppercase tracking-[0.2em] text-zinc-400',
          isDashboard ? 'text-xs' : 'text-[10px]'
        )}
      >
        {label}
      </div>
    </div>
  )
}