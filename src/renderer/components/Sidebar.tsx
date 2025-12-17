import { useState } from 'react'
import { Plus, ArrowLeft, Database, Settings, Crown, Sparkles } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from './ui/button'
import { useTranslation } from 'react-i18next'
import { SettingsDialog } from './settings/SettingsDialog'
import { cn } from '@/utils/cn'
import { DataAssetsView } from './sidebar/DataAssetsView'
import { SessionListView } from './sidebar/SessionListView'
import { useProjectStore } from '../stores/useProjectStore'

interface SidebarProps {
  onImportData?: () => void
}

type ViewMode = 'sessions' | 'data'

export function Sidebar(_props: SidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('sessions')
  const { t } = useTranslation('common')
  const settings = useSettingsStore()
  const createSession = useProjectStore(state => state.createSession)
  const projectMeta = useProjectStore(state => state.meta)

  return (
    <aside className="wansan-sidebar flex flex-col h-full bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        {viewMode === 'sessions' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {projectMeta.name}
              </h2>
            </div>
            <Button
              onClick={() => createSession()}
              className="w-full h-9 bg-black hover:bg-zinc-800 text-white shadow-sm justify-start px-3"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('new_session', 'New Session')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 h-9">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2"
              onClick={() => setViewMode('sessions')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('data_sources', 'Data Sources')}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {viewMode === 'sessions' ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            <SessionListView />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-h-0">
            <DataAssetsView />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 mt-auto border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900 z-10">
        {viewMode === 'sessions' && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-10 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            onClick={() => setViewMode('data')}
          >
            <Database className="w-4 h-4" />
            <span>{t('data_assets', 'Data Assets')}</span>
          </Button>
        )}

        {/* Status Card & Settings (Shared) */}
        <div
          onClick={() =>
            document.dispatchEvent(
              new CustomEvent('open-settings', { detail: 'general' })
            )
          }
          className={cn(
            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border group',
            'bg-white dark:bg-black/20 border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700',
            !settings.isActivated &&
              'hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
          )}
        >
          {settings.isActivated ? (
            <>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-50 border border-yellow-100">
                <Crown className="w-4 h-4 text-yellow-600 fill-yellow-600" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">
                  {t('sidebar.pro_active')}
                </span>
                <span className="text-[10px] text-zinc-400 truncate">
                  {t('sidebar.license_active')}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 group-hover:bg-indigo-100 group-hover:scale-105 transition-all">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-indigo-700 truncate">
                  {t('sidebar.trial_mode')}
                </span>
                <span className="text-[10px] text-zinc-400 group-hover:text-indigo-500/80 truncate">
                  {t('sidebar.unlock_full_access')}
                </span>
              </div>
            </>
          )}
        </div>

        <SettingsDialog
          trigger={
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-zinc-500 hover:text-foreground h-8"
              onClick={() =>
                document.dispatchEvent(
                  new CustomEvent('open-settings', { detail: 'ai' })
                )
              }
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs">{t('settings')}</span>
            </Button>
          }
        />
      </div>
    </aside>
  )
}
