import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'

export interface ExportConfig {
  title: string
  theme: 'minimal' | 'cyberpunk' | 'corporate'
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: ExportConfig) => void
  defaultTitle: string
}

export function ExportConfigModal({
  isOpen,
  onClose,
  onConfirm,
  defaultTitle,
}: Props) {
  const [title, setTitle] = useState(defaultTitle)
  const [theme, setTheme] = useState<'minimal' | 'cyberpunk' | 'corporate'>(
    'minimal'
  )
  const { t } = useTranslation('common')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('export_web_report', 'Export Web Report')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 1. Title */}
          <div className="space-y-2">
            <Label className="text-zinc-500">{t('report_title', 'Report Title')}</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q4 Sales Analysis"
              className="bg-zinc-50/50"
            />
          </div>

          {/* 2. Theme Selection */}
          <div className="space-y-3">
            <Label className="text-zinc-500">{t('visual_style', 'Visual Style')}</Label>
            <RadioGroup
              value={theme}
              onValueChange={(v: any) => setTheme(v)}
              className="grid grid-cols-3 gap-4"
            >
              <Label
                htmlFor="minimal"
                className="flex flex-col items-center justify-between rounded-xl border-2 border-zinc-100 bg-white p-4 hover:bg-zinc-50 [&:has([data-state=checked])]:border-indigo-600 [&:has([data-state=checked])]:bg-indigo-50/30 cursor-pointer transition-all"
              >
                <RadioGroupItem
                  value="minimal"
                  id="minimal"
                  className="sr-only"
                />
                <span className="text-2xl mb-1">📄</span>
                <span className="text-xs font-bold text-zinc-600">Minimal</span>
              </Label>

              <Label
                htmlFor="corporate"
                className="flex flex-col items-center justify-between rounded-xl border-2 border-zinc-100 bg-blue-50/30 p-4 hover:bg-blue-50 [&:has([data-state=checked])]:border-blue-600 [&:has([data-state=checked])]:bg-blue-100/50 cursor-pointer transition-all"
              >
                <RadioGroupItem
                  value="corporate"
                  id="corporate"
                  className="sr-only"
                />
                <span className="text-2xl mb-1">💼</span>
                <span className="text-xs font-bold text-blue-700">Business</span>
              </Label>

              <Label
                htmlFor="cyberpunk"
                className="flex flex-col items-center justify-between rounded-xl border-2 border-zinc-100 bg-zinc-900 p-4 hover:bg-zinc-800 [&:has([data-state=checked])]:border-purple-500 cursor-pointer transition-all"
              >
                <RadioGroupItem
                  value="cyberpunk"
                  id="cyberpunk"
                  className="sr-only"
                />
                <span className="text-2xl mb-1">👾</span>
                <span className="text-xs font-bold text-zinc-300">Cyber</span>
              </Label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
            onClick={() => onConfirm({ title, theme })}
          >
            {t('generate', 'Generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
