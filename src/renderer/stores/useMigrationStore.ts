import { create } from 'zustand';
import { projectService } from '../services/project-service';

export type MigrationStep = 'intro' | 'config' | 'running' | 'success' | 'error';

interface MigrationState {
  isChecking: boolean;
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
  selectDirectory: () => Promise<void>;
  updateProgress: (progress: number, message: string) => void;
  setError: (error: string | null) => void;
  skipMigration: () => void;
  completeMigration: () => void;
}

export const useMigrationStore = create<MigrationState>((set, get) => ({
  isChecking: true,
  isMigrationNeeded: false,
  step: 'intro',
  progress: 0,
  total: 0,
  message: '',
  error: null,
  projectName: 'My Workspace',
  targetPath: '',

  checkStatus: () => {
    const STORAGE_KEYS = ['wansan-project-v2-legacy-mock', 'wansan-project-v2'];
    const MIGRATION_FLAG = 'wansan-migration-v1.3';
    const isMigrated = localStorage.getItem(MIGRATION_FLAG);

    if (isMigrated === 'true') {
      set({ isChecking: false, isMigrationNeeded: false });
      return;
    }

    let legacyData: any = null;
    let foundKey: string | null = null;

    for (const key of STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const state = parsed.state || parsed; // Handle both Zustand and raw formats
          if (state.files && state.files.length > 0) {
            legacyData = state;
            foundKey = key;
            break;
          }
        } catch (e) {}
      }
    }

    if (legacyData) {
      console.log(`[Migration] Legacy data found in ${foundKey}`, legacyData);

      // Phase 1: Set migration needed immediately
      set({
        isMigrationNeeded: true,
        total: legacyData.files.length,
        isChecking: false // Stop loader immediately
      });

      // Phase 2: Async path initialization
      projectService.getDefaultLocation().then(defaultPath => {
        set({ targetPath: defaultPath });
      }).catch(err => {
        console.error('[Migration] Failed to get default path', err);
      });
    } else {
      console.log('[Migration] No legacy data found.');
      set({ isChecking: false, isMigrationNeeded: false });
    }
  },

  setStep: (step) => set({ step, error: null }),
  setProjectName: (projectName) => set({ projectName }),
  setTargetPath: (targetPath) => set({ targetPath }),

  selectDirectory: async () => {
    try {
      const path = await projectService.selectDirectory();
      if (path) set({ targetPath: path });
    } catch (e) {
      // User cancelled or error
    }
  },

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
