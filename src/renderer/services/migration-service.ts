import { projectService } from './project-service';
import { useProjectStore } from '../stores/useProjectStore';
import { useMigrationStore } from '../stores/useMigrationStore';
import { ProjectManifest, SemanticLayer } from '@shared/types/project-manifest';
import { SmartMetric, SyncStatus } from '@shared/types';
import i18n from '../i18n';

export async function performMigration(name: string, location: string) {
  const STORAGE_KEY = 'wansan-project-v2';
  const { updateProgress, setError, completeMigration } = useMigrationStore.getState();
  
  const legacyRaw = localStorage.getItem(STORAGE_KEY);
  if (!legacyRaw) return;

  try {
    const legacyState = JSON.parse(legacyRaw);
    const state = legacyState.state;
    
    if (!state || !state.files) throw new Error(i18n.t('project:error_no_legacy_data'));

    // 1. Initialize Project Bundle
    const projectPath = await projectService.create(name, location);
    
    // IMPORTANT: Open it immediately to switch the DB connection to the new bundle
    await projectService.open(projectPath);

    // 2. Re-ingest files into the new Native DuckDB
    const filesToMigrate = [...state.files];
    for (let i = 0; i < filesToMigrate.length; i++) {
      const file = filesToMigrate[i];
      updateProgress(i + 1, i18n.t('project:ingesting', { name: file.name }));

      try {
        const res = await window.electronAPI.reIngestFile(file.id, file.path, file.tableName, file.sheetName);
        if (!res.success) {
            console.error(`Migration error for ${file.name}:`, res.error);
            filesToMigrate[i] = { ...file, status: 'error' as SyncStatus, error: res.error };
        } else {
            filesToMigrate[i] = { ...file, status: 'ready' as SyncStatus, columns: res.data.newColumns };
        }
      } catch (e) {
        console.error(`Migration crash for ${file.name}:`, e);
        filesToMigrate[i] = { ...file, status: 'error' as SyncStatus };
      }
    }

    // 3. Data Transformation
    const assets = filesToMigrate.map((f) => ({
      id: f.id,
      name: f.name,
      originalPath: f.path,
      tableName: f.tableName,
      columns: f.columns.map((c) => ({ name: c.name, type: c.type, safeName: c.safeName }))
    }));

    const smartMetrics: Record<string, SmartMetric[]> = {};
    filesToMigrate.forEach((f) => {
      if (f.smartMetrics && f.smartMetrics.length > 0) {
        smartMetrics[f.id] = f.smartMetrics;
      }
    });

    const manifest: Partial<ProjectManifest> = {
      assets,
      settings: { theme: 'light' }
    };

    const semantic: SemanticLayer = {
      relations: state.relations || [],
      smartMetrics
    };

    const session = {
      sessions: state.sessions || [],
      activeSessionId: state.activeSessionId,
      activeView: state.activeView,
      activeFileId: state.activeFileId,
      widgetRegistry: state.widgetRegistry || {}
    };

    // 4. Persist the final state
    await projectService.save(projectPath, { manifest, semantic, session });

    // 5. Update Runtime Store
    useProjectStore.getState().loadProject({
        ...state,
        files: filesToMigrate
    });
    useProjectStore.getState().setProjectPath(projectPath);

    // 6. Mark as complete
    completeMigration();

  } catch (error: any) {
    console.error('Migration critical failure:', error);
    setError(error.message || i18n.t('project:error_migration_failed'));
  }
}

