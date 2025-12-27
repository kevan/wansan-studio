import * as React from 'react'
import { cn } from '@/utils/cn'

const ScrollArea = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <div
      className={cn(
        'overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent hover:scrollbar-thumb-zinc-300 transition-colors',
        className
      )}
    >
      {children}
    </div>
  )
}

export { ScrollArea }
