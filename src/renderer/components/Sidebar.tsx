import { useState } from 'react'
import {
  Plus,
  ArrowLeft,
  Database,
  Settings,
  Crown,
  Sparkles,
  Settings2,
  Bot,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from './ui/button'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { DataAssetsView } from './sidebar/DataAssetsView'
import { SessionListView } from './sidebar/SessionListView'
import { useProjectStore } from '../stores/useProjectStore'
import { useUserInfo } from '@/hooks/useIPC'

interface SidebarProps {
  onImportData?: () => void
}

type ViewMode = 'sessions' | 'data'

export function Sidebar(_props: SidebarProps) {
  const sidebarMode = useProjectStore(state => state.sidebarMode)
  const setSidebarMode = useProjectStore(state => state.setSidebarMode)
  const closeProject = useProjectStore(state => state.closeProject)
  const files = useProjectStore(state => state.files)
  const hasFiles = files.length > 0

  const { t } = useTranslation('common')
  const settings = useSettingsStore()
  const createSession = useProjectStore(state => state.createSession)
  const { data: userInfo } = useUserInfo()
  const username = userInfo?.username || 'User'

  return (
    <aside className="wansan-sidebar flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shrink-0">
      {/* --- HEADER: New Analysis --- */}
      <div className="p-3 pb-2 shrink-0">
        {sidebarMode === 'sessions' ? (
          <Button
            onClick={() => createSession()}
            disabled={!hasFiles}
            title={
              !hasFiles
                ? t('import_first_hint', 'Please import data first')
                : undefined
            }
            className={cn(
              'w-full h-9 text-sm font-medium transition-all shadow-sm justify-center gap-2 rounded-md active:scale-95',
              hasFiles
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
                : 'bg-zinc-100 text-zinc-400 opacity-50 cursor-not-allowed'
            )}
          >
            <Plus className="h-4 w-4" />
            <span>{t('new_session', 'New Session')}</span>
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
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
              {t('data_sources_root', 'Data Sources')}
            </span>
          </div>
        )}
      </div>

      {/* --- SCROLL AREA: Session List --- */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {sidebarMode === 'sessions' ? (
          <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1">
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {t('history', 'History')}
            </div>
            <SessionListView />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-h-0">
            <DataAssetsView />
          </div>
        )}
      </div>

      {/* --- FOOTER (FLAT DESIGN) --- */}
      {sidebarMode === 'sessions' && (
        <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1 shrink-0">
          {/* Data Assets (Flat List Item) */}
          <button
            onClick={() => setSidebarMode('data')}
            className="w-full px-3 py-2 text-sm text-left rounded-md flex items-center gap-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
          >
            <Database className="w-4 h-4 shrink-0 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
            <span className="font-medium flex-1">
              {t('data_assets', 'Data Assets')}
            </span>
          </button>

          {/* User & System (Compact Row) */}
          <div
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent('open-settings', { detail: 'general' })
              )
            }
            className="flex items-center justify-between px-3 py-2 mt-1 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group/user cursor-pointer"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 shrink-0">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover/user:text-zinc-900 dark:group-hover/user:text-zinc-100 truncate">
                  {username}
                </span>
              </div>
            </div>

            {/* Close Project Action */}
            <button
              onClick={e => {
                e.stopPropagation()
                closeProject()
              }}
              title={t('close_project', 'Close Project')}
              className="text-zinc-400 dark:text-zinc-600 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
