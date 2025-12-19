import { useState } from 'react'
import { Plus, ArrowLeft, Database, Settings, Crown, Sparkles, Settings2, Bot, ChevronRight } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from './ui/button'
import { useTranslation } from 'react-i18next'
import { SettingsDialog } from './settings/SettingsDialog'
import { cn } from '@/utils/cn'
import { DataAssetsView } from './sidebar/DataAssetsView'
import { SessionListView } from './sidebar/SessionListView'
import { useProjectStore } from '../stores/useProjectStore'
import { useUserInfo } from '@/hooks/useIPC'
import { useProGate } from '@/hooks/use-pro-gate'

interface SidebarProps {
  onImportData?: () => void
}

type ViewMode = 'sessions' | 'data'

export function Sidebar(_props: SidebarProps) {
  const sidebarMode = useProjectStore(state => state.sidebarMode)
  const setSidebarMode = useProjectStore(state => state.setSidebarMode)
  const files = useProjectStore(state => state.files)
  const hasFiles = files.length > 0
  
  const { t } = useTranslation('common')
  const settings = useSettingsStore()
  const createSession = useProjectStore(state => state.createSession)
  const { data: userInfo } = useUserInfo()
  const username = userInfo?.username || 'User'
  const { checkGate, gateNode } = useProGate()

  return (
    <aside className="wansan-sidebar flex flex-col h-full bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {gateNode}
      {/* Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
        {sidebarMode === 'sessions' ? (
          <Button
            onClick={() => createSession()}
            disabled={!hasFiles}
            title={!hasFiles ? t('import_first_hint', 'Please import data first') : undefined}
            className={cn(
              "w-full h-10 text-white shadow-sm justify-start px-3 transition-all",
              hasFiles ? "bg-black hover:bg-zinc-800" : "bg-zinc-400 opacity-50 cursor-not-allowed"
            )}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('new_session', 'New Session')}
          </Button>
        ) : (
          <div className="flex items-center gap-2 h-9">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2"
              onClick={() => setSidebarMode('sessions')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('data_sources_root', 'Data Sources')}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {sidebarMode === 'sessions' ? (
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
      {sidebarMode === 'sessions' && (
        <div className="p-3 mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10">
          <div
            onClick={() => setSidebarMode('data')}
            className="mb-1 group flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-sm cursor-pointer transition-all"
          >
            {/* Icon Box */}
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-800 group-hover:bg-indigo-600 transition-colors">
              <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
            </div>

            {/* Text Info */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors">
                {t('data_assets', 'Data Assets')}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium group-hover:text-indigo-600/70 dark:group-hover:text-indigo-400/70 truncate transition-colors">
                {t('manage_sources_hint', 'Click to manage sources')}
              </span>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
          </div>

          <div
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent('open-settings', { detail: 'general' })
              )
            }
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-200/80 dark:hover:bg-zinc-800 cursor-pointer transition-colors group select-none"
            title={t('settings')}
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-1 ring-white/20 border border-white/10">
              {username.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 overflow-hidden flex flex-col justify-center">
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                {username}
              </div>
              <div
                onClick={e => {
                  if (!settings.isActivated) {
                    e.stopPropagation()
                    checkGate('Full Access', () => {})
                  }
                }}
                className="text-[10px] text-yellow-600 dark:text-yellow-500 font-medium flex items-center gap-1 hover:underline cursor-pointer"
              >
                {settings.isActivated ? (
                  <>
                    <Crown className="w-3 h-3 fill-current" />
                    <span>{t('sidebar.pro_active', 'Pro Member')}</span>
                  </>
                ) : (
                  t('sidebar.trial_mode', 'Trial Account')
                )}
              </div>
            </div>

            {/* Icon */}
            <Settings2 className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <SettingsDialog />
        </div>
      )}
    </aside>
  )
}
