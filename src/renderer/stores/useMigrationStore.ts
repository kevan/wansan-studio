import { create } from 'zustand';

export type MigrationStep = 'intro' | 'config' | 'running' | 'success' | 'error';

interface MigrationState {
  isMigrationNeeded: boolean;
  step: MigrationStep;
  progress: number;
  total: number;
  message: string;
  error: string | null;
  projectName: string;
  targetPath: string;

  // Actions
  checkStatus: () => void;
  setStep: (step: MigrationStep) => void;
  setProjectName: (name: string) => void;
  setTargetPath: (path: string) => void;
  updateProgress: (progress: number, message: string) => void;
  setError: (error: string | null) => void;
  skipMigration: () => void;
  completeMigration: () => void;
}

export const useMigrationStore = create<MigrationState>((set) => ({
  isMigrationNeeded: false,
  step: 'intro',
  progress: 0,
  total: 0,
  message: '',
  error: null,
  projectName: 'My Workspace',
  targetPath: '',

  checkStatus: () => {
    const STORAGE_KEY = 'wansan-project-v2';
    const MIGRATION_FLAG = 'wansan-migration-v1.3';
    const legacyRaw = localStorage.getItem(STORAGE_KEY);
    const isMigrated = localStorage.getItem(MIGRATION_FLAG);

    if (legacyRaw && isMigrated !== 'true') {
      try {
        const parsed = JSON.parse(legacyRaw);
        const hasFiles = parsed.state?.files?.length > 0;
        
        // Fetch documents path for default location
        window.electronAPI.getPath('documents').then(res => {
          const defaultPath = res.success ? res.data + '/Wansan' : '';
          
          if (hasFiles) {
            set({ 
              isMigrationNeeded: true, 
              total: parsed.state.files.length,
              targetPath: defaultPath
            });
          } else {
            // Nothing to migrate
            localStorage.setItem(MIGRATION_FLAG, 'true');
          }
        });
      } catch (e) {
        console.error('Failed to parse legacy storage', e);
      }
    }
  },

  setStep: (step) => set({ step, error: null }),
  setProjectName: (projectName) => set({ projectName }),
  setTargetPath: (targetPath) => set({ targetPath }),
  updateProgress: (progress, message) => set({ progress, message }),
  setError: (error) => set({ error, step: 'error' }),
  
  skipMigration: () => {
    const MIGRATION_FLAG = 'wansan-migration-v1.3';
    localStorage.setItem(MIGRATION_FLAG, 'true');
    set({ isMigrationNeeded: false });
  },

  completeMigration: () => {
    const MIGRATION_FLAG = 'wansan-migration-v1.3';
    localStorage.setItem(MIGRATION_FLAG, 'true');
    set({ step: 'success' });
    // Note: We don't hide immediately to show success state
  }
}));
