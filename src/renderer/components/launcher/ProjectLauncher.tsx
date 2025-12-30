import React, { useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { projectService } from '@/services/project-service'
import { useProjectIO } from '@/hooks/useProjectIO'
import { useToastStore } from '@/stores/useToastStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/useSettingsStore'
import {
  Plus,
  FolderOpen,
  ArrowLeft,
  Database,
  Monitor,
  ChevronRight,
  Sparkles,
  History,
  Trash2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import logo from '@/src/assets/logo.png'

type LauncherMode = 'menu' | 'create'

export function ProjectLauncher() {
  const { t } = useTranslation('project')
  const [mode, setMode] = useState<LauncherMode>('menu')
  const [name, setName] = useState('My Workspace')
  const [targetPath, setTargetPath] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [version, setVersion] = useState('')

  const { createProject, openProject, checkGate, gateNode } = useProjectIO()
  const recentProjectPaths = useSettingsStore(s => s.recentProjectPaths)
  const removeRecentProject = useSettingsStore(s => s.removeRecentProject)
  const isActivated = useSettingsStore(s => s.isActivated)

  // Initialize app version
  React.useEffect(() => {
    window.electronAPI.getAppVersion().then(res => {
      if (res.success) setVersion(res.data)
    })
  }, [])

  // Initialize default path via Service
  React.useEffect(() => {
    projectService.getDefaultLocation().then(path => {
      setTargetPath(path)
    })
  }, [])

  // Set migration flag to prevent re-triggering migration wizard
  React.useEffect(() => {
    localStorage.setItem('wansan-migration-v1.3', 'true')
  }, [])

  const handleOpenExisting = async () => {
    try {
      await openProject() // Triggers system dialog via useProjectIO -> projectService
    } catch (e) {
      console.error('Failed to open project', e)
    }
  }

  const handleBrowseLocation = async () => {
    try {
      const path = await projectService.selectDirectory()
      if (path) setTargetPath(path)
    } catch (e) {
      // User cancelled
    }
  }

  const handleCreate = async () => {
    if (!name || !targetPath || isCreating) return
    setIsCreating(true)
    try {
      await createProject(name, targetPath)
    } catch (e: any) {
      console.error('Failed to create project', e)

      const errorMessage = e.message || 'Unknown error occurred.'
      const isExistsError = errorMessage.includes('already exists')

      useToastStore.getState().addToast({
        title: t('create_error', 'Creation Failed'),
        description: isExistsError ? t('project_exists_error') : errorMessage,
        type: 'error',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-white flex items-center justify-center p-6 sm:p-12 font-sans selection:bg-black selection:text-white draggable">
      {/* Swiss Style Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-3xl relative non-draggable">
        {/* MODE: MENU */}
        {mode === 'menu' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col items-center sm:items-start gap-6">
              <img src={logo} className="h-16 w-16 grayscale" alt="Logo" />
              <div className="space-y-2 text-center sm:text-left">
                <h1 className="text-6xl sm:text-7xl font-black tracking-tighter leading-[0.8] text-black uppercase">
                  {'Wansan Studio'.split(' ').map((word, i, arr) => (
                    <React.Fragment key={i}>
                      {word}
                      {i < arr.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </h1>
                <p className="text-lg font-bold text-zinc-400 uppercase tracking-[0.2em] ml-1">
                  {t('launcher_subtitle')}
                </p>
              </div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                onClick={() => {
                  if (!isActivated && recentProjectPaths.length >= 2) {
                    checkGate('Multi-Project', () => setMode('create'))
                  } else {
                    setMode('create')
                  }
                }}
                className="group relative border border-zinc-200 p-6 text-left hover:border-black hover:bg-zinc-50 transition-all duration-300 rounded-2xl bg-white shadow-sm"
              >
                <Plus
                  className="h-8 w-8 mb-8 text-black transition-colors"
                  strokeWidth={2.5}
                />
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight text-black transition-colors">
                    {t('new_project')}
                  </h3>
                  <p className="text-xs font-medium text-zinc-500 transition-colors">
                    {t('new_project_desc')}
                  </p>
                </div>
                <ChevronRight className="absolute top-6 right-6 h-5 w-5 text-zinc-300 group-hover:text-black opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              </button>

              <button
                onClick={handleOpenExisting}
                className="group relative border border-zinc-200 p-6 text-left hover:border-black hover:bg-zinc-50 transition-all duration-300 rounded-2xl bg-white shadow-sm"
              >
                <FolderOpen
                  className="h-8 w-8 mb-8 text-black transition-colors"
                  strokeWidth={2.5}
                />
                <div className="space-y-1">
                  <h3 className="text-xl font-black uppercase tracking-tight text-black transition-colors">
                    {t('open_existing')}
                  </h3>
                  <p className="text-sm font-medium text-zinc-500 transition-colors">
                    {t('open_existing_desc')}
                  </p>
                </div>
                <ChevronRight className="absolute top-6 right-6 h-5 w-5 text-zinc-300 group-hover:text-black opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              </button>
            </div>

            {/* Recent Projects */}
            {recentProjectPaths.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  <History className="h-3 w-3" />
                  {t('recent_projects', 'Recent Projects')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recentProjectPaths.map(path => {
                    const name = path.split(/[\\/]/).pop()?.replace('.wansan', '') || 'Untitled'
                    return (
                      <div key={path} className="group relative flex items-center gap-2">
                        <button
                          onClick={() => openProject(path)}
                          className="flex-1 flex items-center justify-between p-4 border border-zinc-100 rounded-xl hover:border-black hover:bg-zinc-50 transition-all text-left min-w-0"
                        >
                          <div className="min-w-0 pr-4">
                            <div className="text-sm font-bold text-black truncate">{name}</div>
                            <div className="text-[10px] text-zinc-400 truncate mt-0.5">{path}</div>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeRecentProject(path)
                          }}
                          className="p-3 rounded-xl hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all shrink-0"
                          title="Remove from recents"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Footer Attribution */}
            <div className="pt-8 border-t border-zinc-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-300">
              <div className="flex items-center gap-2">
                <Monitor className="h-3 w-3" />
                Local-First v{version}
              </div>
              <div>© 2025 Wansan Studio</div>
            </div>
          </div>
        )}

        {/* MODE: CREATE */}
        {mode === 'create' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              onClick={() => setMode('menu')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors mb-12"
            >
              <ArrowLeft className="h-3 w-3" />
              {t('back_to_menu')}
            </button>

            <div className="border border-zinc-100 p-10 sm:p-16 space-y-12 shadow-2xl rounded-[3rem] bg-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-black" />
              <h2 className="text-5xl font-black tracking-tighter text-black uppercase leading-none">
                {t('create_workspace')
                  .split(' ')
                  .map((word, i, arr) => (
                    <React.Fragment key={i}>
                      {word}
                      {i < arr.length - 1 && <br />}
                    </React.Fragment>
                  ))}
              </h2>

              <div className="space-y-10">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {t('project_name')}
                  </label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                    className="border-b border-t-0 border-x-0 border-zinc-200 rounded-none px-0 text-3xl font-bold focus-visible:ring-0 focus-visible:border-black placeholder:text-zinc-100 h-14 transition-colors"
                    placeholder="My Workspace"
                  />
                </div>

                {/* Path */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {t('directory')}
                  </label>
                  <div className="flex gap-4 items-end border-b border-zinc-200 pb-2">
                    <div className="flex-1 text-sm font-bold truncate text-zinc-500">
                      {targetPath || t('select_destination')}
                    </div>
                    <button
                      onClick={handleBrowseLocation}
                      className="text-[10px] font-black uppercase tracking-widest text-black hover:underline"
                    >
                      {t('change_directory')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleCreate}
                  disabled={!name || !targetPath || isCreating}
                  className="w-full h-16 bg-black hover:bg-zinc-800 text-white rounded-2xl text-xl font-black uppercase tracking-tight shadow-lg disabled:bg-zinc-200"
                >
                  {isCreating ? (
                    <div className="flex items-center gap-3">
                      <Plus className="h-5 w-5 animate-spin" />
                      {t('initializing')}
                    </div>
                  ) : (
                    t('create_project_button')
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {gateNode}
    </div>
  )
}
