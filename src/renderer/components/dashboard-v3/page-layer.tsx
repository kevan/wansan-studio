import React from 'react'
import logo from '@/src/assets/logo.png'

export const PAGE_WIDTH_PX = 794
export const SCREEN_WIDTH_PX = 1920
export const PAGE_HEIGHT_PX = 1123
export const PAGE_GAP_PX = 20
export const GRID_ROW_HEIGHT = 30
export const GRID_MARGIN_Y = 10
export const ROWS_PER_PAGE = 28 // floor(1123 / (30 + 10))

interface PageLayerProps {
  isA4: boolean
  pageCount: number
}

export function PageLayer({ isA4, pageCount }: PageLayerProps) {
  if (!isA4) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex flex-col"
      style={{ gap: `${PAGE_GAP_PX}px` }}
    >
      {Array.from({ length: pageCount }).map((_, i) => (
        <div
          key={i}
          className="relative flex w-full flex-col justify-between rounded-lg border border-zinc-200 bg-white shadow-md"
          style={{ height: PAGE_HEIGHT_PX }}
        >
          <div className="flex-1" />
          <div className="flex h-16 flex-none items-center justify-between border-t px-8 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                className="h-6 w-6 rounded-md "
                alt="Wansan Studio"
              />
              <span className="font-semibold text-zinc-600">Wansan Studio</span>
            </div>
            <span className="text-xs text-zinc-400">Page {i + 1}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
