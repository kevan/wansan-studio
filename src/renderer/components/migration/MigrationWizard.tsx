import React, { useState } from 'react';
import { useMigrationStore } from '@/stores/useMigrationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  FolderOpen,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Database
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { performMigration } from '@/services/migration-service';
import { useTranslation } from 'react-i18next';

export function MigrationWizard() {
  const { t } = useTranslation('project');
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
    isMigrationNeeded
  } = useMigrationStore();

  const [version, setVersion] = useState('');

  // Fetch app version on mount
  React.useEffect(() => {
    window.electronAPI.getAppVersion().then(res => {
      if (res.success) setVersion(res.data);
    });
  }, []);

  if (!isMigrationNeeded) return null;

  const handleStart = async () => {
    setStep('running');
    await performMigration(projectName, targetPath);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6 sm:p-12 font-sans selection:bg-black selection:text-white">
      {/* Swiss Style Grid Background (Subtle) */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-2xl relative">
        {/* Content Wrapper */}
        <div className="border-[3px] border-black bg-white p-8 sm:p-12 shadow-[16px_16px_0_0_#000]">
          {/* STEP 1: INTRO */}
          {step === 'intro' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="inline-block bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                  {version ? `v${version} Update` : 'Update'}
                </div>
                <h1 className="text-5xl sm:text-6xl font-black tracking-tighter leading-[0.9] text-black">
                  {t('upgrade_title')
                    .split(' ')
                    .map((word, i, arr) => (
                      <React.Fragment key={i}>
                        {word}
                        {i < arr.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                </h1>
              </div>

              <p className="text-xl font-medium leading-tight text-zinc-600 max-w-md">
                {t('upgrade_desc')}
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => setStep('config')}
                  className="bg-black hover:bg-zinc-800 text-white rounded-none h-14 px-8 text-lg font-bold group"
                >
                  {t('start_migration')}
                  <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>

                <button
                  onClick={skipMigration}
                  className="text-zinc-400 hover:text-red-600 text-xs font-bold uppercase tracking-widest transition-colors text-left sm:text-center self-center"
                >
                  {t('skip_migration')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURATION */}
          {step === 'config' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <h2 className="text-4xl font-black tracking-tighter text-black uppercase">
                {t('setup_workspace')}
              </h2>

              <div className="space-y-8">
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {t('project_name')}
                  </label>
                  <Input
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="border-b-2 border-t-0 border-x-0 border-black rounded-none px-0 text-2xl font-bold focus-visible:ring-0 placeholder:text-zinc-200"
                    placeholder="My Workspace"
                  />
                </div>

                {/* Path Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {t('directory')}
                  </label>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 border-b-2 border-black pb-2 text-sm font-bold truncate text-zinc-500">
                      {targetPath || t('select_destination')}
                    </div>
                    <Button
                      variant="outline"
                      onClick={selectDirectory}
                      className="border-2 border-black rounded-none font-bold hover:bg-black hover:text-white transition-all"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {t('change_directory')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <Button
                  onClick={handleStart}
                  disabled={!projectName || !targetPath}
                  className="bg-black hover:bg-zinc-800 text-white rounded-none h-14 px-10 text-lg font-bold flex-1 sm:flex-none shadow-[8px_8px_0_0_#e2e8f0]"
                >
                  {t('create_project_button')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep('intro')}
                  className="h-14 px-6 rounded-none font-bold text-zinc-400 hover:text-black"
                >
                  {t('common:back')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: RUNNING */}
          {step === 'running' && (
            <div className="space-y-10 py-4 animate-in fade-in duration-500 text-center sm:text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-center sm:justify-start gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-black" />
                  <h2 className="text-4xl font-black tracking-tighter text-black uppercase">
                    {t('migrating')}
                  </h2>
                </div>
                <p className="text-lg font-bold text-zinc-500 italic max-w-sm">
                  {message}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-black">
                  <span>{t('progress')}</span>
                  <span>{Math.round((progress / total) * 100)}%</span>
                </div>
                <Progress
                  value={(progress / total) * 100}
                  className="h-4 rounded-none border-2 border-black bg-zinc-100"
                />
              </div>

              <div className="bg-zinc-50 p-4 border-l-4 border-black">
                <p className="text-xs font-bold text-black uppercase leading-relaxed">
                  {t('migration_warning')}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500 text-center">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-black flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tighter text-black uppercase">
                  {t('upgrade_success')}
                </h2>
                <p className="text-lg font-medium text-zinc-500">
                  {t('upgrade_success_desc')}
                </p>
              </div>

              <Button
                onClick={() => window.location.reload()}
                className="bg-black hover:bg-zinc-800 text-white rounded-none h-14 px-12 text-lg font-bold shadow-[8px_8px_0_0_#e2e8f0]"
              >
                {t('launch_wansan')}
              </Button>
            </div>
          )}

          {/* STEP 5: ERROR */}
          {step === 'error' && (
            <div className="space-y-8 animate-in shake duration-500">
              <div className="flex items-center gap-4 text-red-600">
                <AlertCircle className="h-12 w-12" />
                <h2 className="text-4xl font-black tracking-tighter uppercase">
                  {t('migration_error')}
                </h2>
              </div>

              <div className="bg-red-50 p-6 border-2 border-red-600">
                <p className="font-mono text-sm font-bold text-red-600 break-all">
                  {error || 'An unexpected error occurred.'}
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep('config')}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-none h-14 px-10 text-lg font-bold flex-1"
                >
                  {t('try_again')}
                </Button>
                <Button
                  variant="outline"
                  onClick={skipMigration}
                  className="border-2 border-black rounded-none h-14 px-6 font-bold"
                >
                  {t('skip')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Swiss Footer Attribution */}
        <div className="absolute -bottom-12 left-0 right-0 flex justify-between items-center px-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
            <Database className="h-3 w-3" />
            Native Engine {version}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
            © 2025 Wansan Studio
          </div>
        </div>
      </div>
    </div>
  )
}
