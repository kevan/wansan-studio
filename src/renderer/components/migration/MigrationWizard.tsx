import React, { useState } from 'react'
import { useMigrationStore } from '@/stores/useMigrationStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  FolderOpen,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Database,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { performMigration } from '@/services/migration-service'
import { useTranslation } from 'react-i18next'

export function MigrationWizard() {
  const { t } = useTranslation('project')
  const {
    step,
    setStep,
    progress,
    total,
    message,
    error,
    projectName,
    setProjectName,
    targetPath,
    selectDirectory,
    skipMigration,
    isMigrationNeeded,
  } = useMigrationStore()

  const [version, setVersion] = useState('')

  // Fetch app version on mount
  React.useEffect(() => {
    window.electronAPI.getAppVersion().then(res => {
      if (res.success) setVersion(res.data)
    })
  }, [])

  if (!isMigrationNeeded) return null

  const handleStart = async () => {
    setStep('running')
    await performMigration(projectName, targetPath)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-50 flex items-center justify-center p-6 sm:p-12 font-sans selection:bg-black selection:text-white draggable">
      {/* Subtle background gradient instead of grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-zinc-100 opacity-50 pointer-events-none" />

      <div className="w-full max-w-2xl relative non-draggable">
        {/* Content Wrapper - Soft Shadow, Large Rounding, No Borders */}
        <div className="bg-white p-10 sm:p-16 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[2.5rem] relative overflow-hidden">
          {/* STEP 1: INTRO */}
          {step === 'intro' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-6 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <SparklesIcon className="w-3 h-3" />
                  {version ? `v${version} Update` : 'Update'}
                </div>
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] text-zinc-900">
                  {t('upgrade_title')}
                </h1>
                <p className="text-xl font-medium leading-relaxed text-zinc-500 max-w-md">
                  {t('upgrade_desc')}
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center gap-6">
                <Button
                  onClick={() => setStep('config')}
                  className="w-full sm:w-auto bg-zinc-900 hover:bg-black text-white rounded-2xl h-16 px-10 text-lg font-bold group shadow-lg shadow-zinc-200 transition-all active:scale-[0.98]"
                >
                  {t('start_migration')}
                  <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>

                <button
                  onClick={skipMigration}
                  className="text-zinc-400 hover:text-rose-500 text-xs font-bold uppercase tracking-widest transition-colors py-2"
                >
                  {t('skip_migration')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURATION */}
          {step === 'config' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold tracking-tight text-zinc-900 uppercase">
                  {t('setup_workspace')}
                </h2>
                <p className="text-sm text-zinc-400 font-medium">
                  Choose a name and location for your new project bundle.
                </p>
              </div>

              <div className="space-y-10">
                {/* Project Name */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">
                    {t('project_name')}
                  </label>
                  <Input
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="border-b border-t-0 border-x-0 border-zinc-100 rounded-none px-0 text-3xl font-bold focus-visible:ring-0 focus-visible:border-indigo-500 placeholder:text-zinc-100 transition-all duration-300 h-14"
                    placeholder="My Workspace"
                  />
                </div>

                {/* Path Selector */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 ml-1">
                    {t('directory')}
                  </label>
                  <div className="flex gap-4 items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100 hover:bg-white hover:border-zinc-200 transition-all group">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-zinc-400 uppercase leading-none mb-1">
                        Target Path
                      </p>
                      <p className="text-sm font-bold truncate text-zinc-600">
                        {targetPath || t('select_destination')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={selectDirectory}
                      className="h-10 px-4 rounded-xl font-bold text-xs bg-white shadow-sm border border-zinc-200 hover:border-zinc-900 transition-all"
                    >
                      <FolderOpen className="h-3.5 w-3.5 mr-2" />
                      {t('change_directory')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center gap-6">
                <Button
                  onClick={handleStart}
                  disabled={!projectName || !targetPath}
                  className="flex-1 h-16 bg-zinc-900 hover:bg-black text-white rounded-2xl text-lg font-bold shadow-xl shadow-zinc-100 disabled:bg-zinc-100 disabled:text-zinc-300 transition-all"
                >
                  {t('create_project_button')}
                </Button>
                <button
                  onClick={() => setStep('intro')}
                  className="px-6 text-sm font-bold text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  {t('common:back')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RUNNING */}
          {step === 'running' && (
            <div className="space-y-12 py-4 animate-in fade-in duration-500">
              <div className="space-y-6 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-25" />
                    <Loader2 className="h-12 w-12 text-zinc-900 animate-spin relative" />
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight text-zinc-900 uppercase">
                    {t('migrating')}
                  </h2>
                </div>
                <p className="text-lg font-medium text-zinc-500 italic max-w-sm">
                  {message}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  <span>Migration Progress</span>
                  <span>{Math.round((progress / total) * 100)}%</span>
                </div>
                <Progress
                  value={(progress / total) * 100}
                  className="h-3 rounded-full bg-zinc-100 overflow-hidden"
                />
              </div>

              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-4">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-[11px] font-bold text-amber-800 uppercase leading-relaxed">
                  {t('migration_warning')}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="space-y-10 animate-in zoom-in-95 duration-700 text-center">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-zinc-200">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl font-bold tracking-tight text-zinc-900 uppercase">
                  {t('upgrade_success')}
                </h2>
                <p className="text-lg font-medium text-zinc-500 max-w-sm mx-auto">
                  {t('upgrade_success_desc')}
                </p>
              </div>

              <Button
                onClick={() => window.location.reload()}
                className="bg-zinc-900 hover:bg-black text-white rounded-2xl h-16 px-12 text-lg font-bold shadow-xl shadow-zinc-200 transition-all active:scale-[0.98]"
              >
                {t('launch_wansan')}
              </Button>
            </div>
          )}

          {/* STEP 4 (Cont): ERROR */}
          {step === 'error' && (
            <div className="space-y-10 animate-in shake duration-500">
              <div className="flex items-center gap-5 text-rose-600">
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <AlertCircle className="h-10 w-12" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight uppercase leading-tight">
                  {t('migration_error')}
                </h2>
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                <p className="font-mono text-sm font-bold text-zinc-600 break-all leading-relaxed">
                  {error || 'An unexpected error occurred.'}
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep('config')}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-2xl h-16 px-10 text-lg font-bold flex-1 transition-all"
                >
                  {t('try_again')}
                </Button>
                <Button
                  variant="outline"
                  onClick={skipMigration}
                  className="border border-zinc-200 rounded-2xl h-16 px-8 font-bold text-zinc-500 hover:text-zinc-900 hover:border-zinc-900 transition-all"
                >
                  {t('skip')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 flex justify-between items-center px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          <div className="flex items-center gap-3">
            <Database className="h-3.5 w-3.5" />
            Wansan Engine v{version}
          </div>
          <div className="opacity-50">© 2025 Wansan Studio</div>
        </div>
      </div>
    </div>
  )
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}
