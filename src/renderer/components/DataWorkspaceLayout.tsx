import { ReactNode } from 'react'
import { Button } from './ui/button'
import { useFileStore } from '../stores/useFileStore'

interface DataWorkspaceLayoutProps {
  children: ReactNode
  showAction?: boolean
}

export function DataWorkspaceLayout({
  children,
  showAction = true,
}: DataWorkspaceLayoutProps) {
  const { setView } = useFileStore()

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {children}
      </div>
      {showAction && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button
            size="lg"
            className="rounded-full shadow-xl px-8 bg-black hover:bg-zinc-800 hover:scale-105 transition-all"
            onClick={() => setView('chat')}
          >
            ✨ Start Analysis
          </Button>
        </div>
      )}
    </div>
  )
}
