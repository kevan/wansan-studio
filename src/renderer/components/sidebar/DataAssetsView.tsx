import { Plus, Sparkles, RefreshCw } from 'lucide-react'
import { DataTreeManager } from '../data-tree'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'
import { useAutoLink } from '@/hooks/useAutoLink'

import { useWizardStore } from '@/stores/useWizardStore.ts'

export function DataAssetsView() {
  const openWizard = useWizardStore(s => s.open)
  const { t } = useTranslation(['common', 'chat'])
  const { checkAutoLink, isAnalyzing } = useAutoLink()

  // 处理多文件导入
  const handleImportClick = async () => {
    openWizard('import')
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pb-4 pt-4 border-b border-zinc-200 flex items-center gap-2">
        <Button
          onClick={handleImportClick}
          className="flex-1 h-9 bg-black hover:bg-zinc-800 text-white shadow-sm justify-start px-3 rounded-xl shrink-0 min-w-0"
        >
          <Plus className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{t('common:import_data')}</span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => checkAutoLink()}
          disabled={isAnalyzing}
          title={t('chat:run_analysis')}
          className="h-9 w-9 shrink-0 text-zinc-400 hover:text-indigo-600 border-zinc-200 hover:bg-white rounded-xl transition-all"
        >
          {isAnalyzing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden px-2 min-h-0">
        <DataTreeManager className="no-drag" />
      </div>
    </div>
  )
}
