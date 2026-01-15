import * as React from 'react'
import { cn } from '@/utils/cn'

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { containerClassName?: string }
>(({ className, containerClassName, ...props }, ref) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Mouse drag scrolling
  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let isDown = false
    let startX = 0
    let startY = 0
    let scrollLeft = 0
    let scrollTop = 0

    const handleMouseDown = (e: MouseEvent) => {
      // Only activate on table body, not on interactive elements
      const target = e.target as HTMLElement
      if (
        target.closest('button') ||
        target.closest('select') ||
        target.closest('[role="combobox"]') ||
        target.closest('input')
      ) {
        return
      }

      isDown = true
      container.style.cursor = 'grabbing'
      container.style.userSelect = 'none'
      startX = e.pageX - container.offsetLeft
      startY = e.pageY - container.offsetTop
      scrollLeft = container.scrollLeft
      scrollTop = container.scrollTop
    }

    const handleMouseLeave = () => {
      isDown = false
      container.style.cursor = 'default'
      container.style.userSelect = 'auto'
    }

    const handleMouseUp = () => {
      isDown = false
      container.style.cursor = 'default'
      container.style.userSelect = 'auto'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - container.offsetLeft
      const y = e.pageY - container.offsetTop
      const walkX = (x - startX) * 1.5 // Horizontal scroll speed
      const walkY = (y - startY) * 1.5 // Vertical scroll speed
      container.scrollLeft = scrollLeft - walkX
      container.scrollTop = scrollTop - walkY
    }

    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mouseleave', handleMouseLeave)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mousemove', handleMouseMove)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mouseleave', handleMouseLeave)
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div
      ref={scrollContainerRef}
      style={{
        // Force scrollbar to always show on macOS
        scrollbarWidth: 'thin', // Firefox
        scrollbarColor: '#d4d4d8 #f4f4f5', // Firefox: thumb track
      }}
      className={cn(
        'relative w-full overflow-auto scroll-smooth',
        // Webkit scrollbar styling (Chrome, Safari, Edge)
        '[&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3',
        '[&::-webkit-scrollbar]:appearance-none', // Override macOS auto-hide
        '[&::-webkit-scrollbar-track]:bg-zinc-100/80 [&::-webkit-scrollbar-track]:rounded-md',
        '[&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-thumb]:rounded-md',
        '[&::-webkit-scrollbar-thumb]:hover:bg-zinc-500',
        '[&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-zinc-100',
        '[&::-webkit-scrollbar-corner]:bg-zinc-100/80',
        containerClassName
      )}
    >
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
})
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
      className
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
