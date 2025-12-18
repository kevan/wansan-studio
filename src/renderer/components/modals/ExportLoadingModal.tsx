import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Terminal } from 'lucide-react'

const LOGS = [
  'Analyzing data structure...',
  'Designing layout grid...',
  'Writing Tailwind classes...',
  'Generating ECharts configuration...',
  'Optimizing for mobile...',
  'Injecting data payloads...',
  'Finalizing HTML bundle...',
]

export function ExportLoadingModal({ isOpen }: { isOpen: boolean }) {
  const [logIndex, setLogIndex] = useState(0)

  // Fake log scrolling
  useEffect(() => {
    if (!isOpen) return
    setLogIndex(0)
    const interval = setInterval(() => {
      setLogIndex(i => (i < LOGS.length - 1 ? i + 1 : i))
    }, 2500) // Change log every 2.5s
    return () => clearInterval(interval)
  }, [isOpen])

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-green-400 border-zinc-800 font-mono [&>button]:hidden">
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          {/* Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full"></div>
            <Terminal className="w-12 h-12 relative z-10 animate-pulse" />
          </div>

          {/* Status */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">
              AI Architect is working...
            </h3>
            <p className="text-sm text-zinc-500">
              This may take up to 30 seconds.
            </p>
          </div>

          {/* Logs */}
          <div className="w-full bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50 h-32 overflow-hidden flex flex-col items-start text-xs relative">
            <div className="w-full flex flex-col-reverse justify-start h-full gap-1">
              {logIndex < LOGS.length - 1 && (
                <div className="flex items-center gap-2 animate-pulse mt-1 shrink-0">
                  <span className="text-green-600">➜</span>
                  <span className="w-2 h-4 bg-green-500 inline-block" />
                </div>
              )}
              {LOGS.slice(0, logIndex + 1)
                .reverse()
                .map((log, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <span className="text-green-600">➜</span> {log}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
