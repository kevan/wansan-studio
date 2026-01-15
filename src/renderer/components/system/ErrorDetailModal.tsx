import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/useUIStore'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ChevronDown, ChevronUp, Terminal, Copy, Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export function ErrorDetailModal() {
  const { errorModal, closeError } = useUIStore()
  const { t } = useTranslation('common')
  const [showDetails, setShowDetails] = useState(true)
  const [copied, setCopied] = useState(false)

  if (!errorModal.isOpen) return null

  const handleCopy = () => {
    if (!errorModal.details) return
    navigator.clipboard.writeText(errorModal.details)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={errorModal.isOpen} onOpenChange={open => !open && closeError()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-red-50 px-6 py-8 flex flex-col items-center text-center gap-4 border-b border-red-100">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm animate-in zoom-in-50 duration-300">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-red-900">
              {errorModal.title || t('error_unknown', { ns: 'chat' })}
            </DialogTitle>
            <p className="text-sm font-medium text-red-700/80 leading-relaxed max-w-md mx-auto">
              {errorModal.message}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 space-y-4">
          {errorModal.details && (
            <div className="space-y-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {t('error_details', { ns: 'chat' })}
              </button>
              
              {showDetails && (
                <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 animate-in slide-in-from-top-2 duration-300 relative group/log">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3 h-3 text-zinc-500" />
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Error Log</span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all flex items-center gap-1.5"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-green-500" />
                          <span className="text-[9px] font-bold uppercase text-green-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed overflow-x-auto max-h-48 whitespace-pre-wrap scrollbar-thin">
                    {errorModal.details}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-11 rounded-xl shadow-lg shadow-zinc-200 transition-all active:scale-[0.98]"
              onClick={closeError}
            >
              {t('confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
