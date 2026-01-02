import React from 'react'

export const PAGE_WIDTH_PX = 794
export const SCREEN_WIDTH_PX = 1920
export const PAGE_HEIGHT_PX = 1123
export const PAGE_GAP_PX = 20
export const GRID_ROW_HEIGHT = 30
export const GRID_MARGIN_Y = 10
export const ROWS_PER_PAGE = 27 // 28 rows causes overflow (1130px > 1123px)

interface PageLayerProps {
  isA4: boolean
  pageCount: number
}

export function PageLayer({ isA4, pageCount }: PageLayerProps) {
  if (!isA4) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex flex-col hide-on-export"
      style={{ gap: `${PAGE_GAP_PX}px` }}
    >
      {Array.from({ length: pageCount }).map((_, i) => (
        <div
          key={i}
          className="relative flex w-full flex-col justify-between rounded-lg border border-zinc-200 bg-white shadow-md"
          style={{ height: PAGE_HEIGHT_PX }}
        >
          <div className="flex-1" />
        </div>
      ))}
    </div>
  )
}
