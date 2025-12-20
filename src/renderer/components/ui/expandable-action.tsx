import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/button'
import { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  label: string
  onClick?: (e: React.MouseEvent) => void
  active?: boolean
  className?: string
  disabled?: boolean
  title?: string // Fallback tooltip
}

export function ExpandableAction({
  icon,
  label,
  onClick,
  active,
  className,
  disabled,
  title,
}: Props) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'group relative flex items-center justify-center overflow-hidden transition-all duration-300 ease-out h-8 border border-transparent',
        'w-8 hover:w-auto hover:px-3', // The Magic: Expand width on hover
        active
          ? 'w-auto px-3 bg-zinc-100 text-zinc-900 border-zinc-200'
          : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50',
        className
      )}
    >
      <span className="shrink-0 flex items-center justify-center">{icon}</span>

      <span
        className={cn(
          'whitespace-nowrap overflow-hidden text-xs font-medium transition-all duration-300 ease-out',
          active
            ? 'w-auto opacity-100 ml-2'
            : 'w-0 opacity-0 ml-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-2'
        )}
      >
        {label}
      </span>
    </Button>
  )
}
