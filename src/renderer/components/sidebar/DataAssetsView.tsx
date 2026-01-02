import { Plus } from 'lucide-react'
import { DataTreeManager } from '../data-tree'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'

import { useWizardStore } from '@/stores/useWizardStore.ts'

export function DataAssetsView() {
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
          className="w-full h-9 bg-black hover:bg-zinc-800 text-white shadow-sm justify-start px-3"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('import_data')}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden px-2 min-h-0">
        <DataTreeManager className="no-drag" />
      </div>
    </div>
  )
}
