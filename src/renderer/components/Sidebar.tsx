import { useState } from 'react'
import { Plus, ArrowLeft, Database, Settings, Crown, Sparkles, Settings2, Bot } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
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
            <div className="space-y-1 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/50">
              <Button
                onClick={() => createSession()}
                className="w-full h-9 bg-black hover:bg-zinc-800 text-white shadow-sm justify-start px-3"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('new_session', 'New Session')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-3 h-9 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                onClick={() => setViewMode('data')}
              >
                <Database className="mr-2 h-4 w-4" />
                {t('data_assets', 'Data Assets')}
              </Button>
            </div>
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
      {viewMode === 'sessions' && (
        <div className="p-3 mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer transition-colors group">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
                  {settings.isActivated ? 'P' : 'G'}
                </div>

                {/* Info */}
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    User
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    {settings.isActivated ? (
                      <span className="text-yellow-600 dark:text-yellow-500 font-medium">
                        Beta Pro
                      </span>
                    ) : (
                      'Trial'
                    )}
                  </div>
                </div>

                {/* Icon */}
                <Settings className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="w-56"
              side="top"
              sideOffset={10}
            >
              {!settings.isActivated && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      document.dispatchEvent(
                        new CustomEvent('open-settings', { detail: 'general' })
                      )
                    }
                    className="text-indigo-600 dark:text-indigo-400 focus:text-indigo-700 focus:bg-indigo-50 dark:focus:bg-indigo-900/20 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('sidebar.unlock_full_access', 'Unlock Full Access')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent('open-settings', { detail: 'ai' })
                  )
                }
                className="cursor-pointer"
              >
                <Bot className="w-4 h-4 mr-2" /> {t('tabs.ai', 'AI Engine')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent('open-settings', { detail: 'general' })
                  )
                }
                className="cursor-pointer"
              >
                <Settings2 className="w-4 h-4 mr-2" />{' '}
                {t('settings', 'Preferences')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <SettingsDialog />
        </div>
      )}
    </aside>
  )
}
