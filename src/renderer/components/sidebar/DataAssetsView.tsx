import { useState } from 'react'
import { Plus } from 'lucide-react'
import { DataTreeManager } from '../data-tree'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'

import { useWizardStore } from '@/stores/useWizardStore.ts'

export function DataAssetsView() {
  const [isImporting, setIsImporting] = useState(false)
  const openWizard = useWizardStore(s => s.open)
  const { t } = useTranslation('common')

  // 处理多文件导入
  const handleImportClick = async () => {
    openWizard('import')
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pb-4 pt-4 border-b border-zinc-200 space-y-2">
        <Button
          onClick={handleImportClick}
          disabled={isImporting}
          className="w-full h-9 bg-black hover:bg-zinc-800 text-white shadow-sm justify-start px-3"
        >
          {isImporting ? (
            <svg
              className="w-4 h-4 animate-spin mr-2"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {isImporting ? t('importing') : t('import_data')}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden px-2 min-h-0">
        <DataTreeManager className="no-drag" />
      </div>
    </div>
  )
}
