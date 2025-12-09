import React from 'react'
import { cn } from '../utils/cn'

interface BigNumberDisplayProps {
  value: string | number
  label: string
  variant?: 'chat' | 'dashboard'
  className?: string
}

export function BigNumberDisplay({
  value,
  label,
  variant = 'chat',
  className,
}: BigNumberDisplayProps) {
  const formattedValue =
    typeof value === 'number'
      ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(
          value
        )
      : value

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full w-full p-6 animate-in fade-in zoom-in-95 duration-500',
        className
      )}
    >
      <span
        className={cn(
          'font-bold tracking-tighter text-zinc-900 leading-none',
          variant === 'dashboard' ? 'text-6xl' : 'text-4xl'
        )}
      >
        {formattedValue}
      </span>
      <span className="text-sm text-zinc-500 uppercase tracking-widest mt-3 font-medium">
        {label}
      </span>
    </div>
  )
}
