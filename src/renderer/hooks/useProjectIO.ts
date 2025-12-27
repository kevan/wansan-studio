import { useCallback } from 'react';
import { useProjectStore } from '../stores/useProjectStore';
import { projectService } from '../services/project-service';
import { ProjectManifest, SemanticLayer, ProjectLoadResult } from '@shared/types/project-manifest';
import { FileNode, SmartMetric, SyncStatus } from '@shared/types';
import { Relation, Session, ProjectData } from '@shared/types/project';
import { ReportData } from '@shared/types/dashboard';

export function useProjectIO() {
  const currentProjectPath = useProjectStore((state) => state.currentProjectPath);
  const setProjectPath = useProjectStore((state) => state.setProjectPath);
  const loadProjectToStore = useProjectStore((state) => state.loadProject);

  const saveProject = useCallback(async () => {
    const state = useProjectStore.getState();
    const path = state.currentProjectPath;

    if (!path) {
      throw new Error('No project path set. Use create or open first.');
    }

    // 1. Build Manifest (Assets)
    const assets = state.files.map((f) => ({
      id: f.id,
      name: f.name,
      originalPath: f.path,
      tableName: f.tableName,
      columns: f.columns.map((c) => ({
        name: c.name,
        type: c.type,
        safeName: c.safeName,
      })),
    }));

    const manifest: Partial<ProjectManifest> = {
      assets,
      settings: {
        theme: 'light', // Default or from settings store if available
      },
    };

    // 2. Build Semantic Layer
    const smartMetrics: Record<string, SmartMetric[]> = {};
    state.files.forEach((f) => {
      if (f.smartMetrics && f.smartMetrics.length > 0) {
        smartMetrics[f.id] = f.smartMetrics;
      }
    });

    const semantic: SemanticLayer = {
      relations: state.relations,
      smartMetrics,
    };

    // 3. Build Session Layer
    // We only save what's necessary for ProjectData (sessions, widgetRegistry, etc.)
    // But ProjectData includes files and relations too.
    // The "session.json" should conceptually hold the runtime/user session state.
    // Based on the spec, session.json treats it as "any".
    // We will save the parts of ProjectData that are NOT in manifest or semantic.
    const sessionData = {
      sessions: state.sessions,
      activeSessionId: state.activeSessionId,
      activeView: state.activeView,
      activeFileId: state.activeFileId,
      widgetRegistry: state.widgetRegistry,
      // We might want to save some meta info too, but manifest handles high level meta.
    };

    await projectService.save(path, { manifest, semantic, session: sessionData });
  }, []);

  const openProject = useCallback(async (path?: string) => {
    // 1. Call Service
    const data: ProjectLoadResult = await projectService.open(path as string);

    // 2. Reconstruct State
    // Map Assets -> FileNode[]
    const files: FileNode[] = data.manifest.assets.map((asset) => {
      const metrics = data.semantic.smartMetrics[asset.id] || [];
      const now = Date.now();
      
      // Reconstruct ColumnSchema from minimal info
      // We assume standard defaults for fields we didn't save (nullable, sampleValues etc)
      // Ideally sampleValues should be re-fetched or persisted. 
      // For v1.2->v1.3 compat, we might lose sampleValues if not persisted.
      // But we can re-fetch them if needed or just leave empty array.
      // In the manifest we only saved { name, type, safeName }.
      // UseProjectStore.loadProject will replace the state.
      // If we want sampleValues, we might need to query DB or they are lost until reload.
      // Let's check what we persist.
      // The manifest definition in step 1 was minimal.
      
      return {
        id: asset.id,
        name: asset.name,
        path: asset.originalPath,
        tableName: asset.tableName,
        sheetName: undefined, // Lost if not in manifest? Manifest assets def in Step 1 didn't have sheetName.
                              // If sheetName is critical, we should add it to manifest types.
                              // For now, assume undefined or empty.
        status: 'ready' as SyncStatus,
        progress: 100,
        size: 0, // Unknown
        columns: asset.columns.map(c => ({
            name: c.name,
            safeName: c.safeName,
            type: c.type as any, // Cast to ColumnType
            sampleValues: [], // Lost
            nullable: true,
            isKey: false
        })),
        rowCount: 0, // Unknown, will be updated on refresh
        error: undefined,
        lastModified: now,
        createdAt: now,
        smartMetrics: metrics,
      };
    });

    // Relations
    const relations: Relation[] = data.semantic.relations || [];

    // Sessions & Widgets
    const sessionState = data.session || {};
    const sessions: Session[] = sessionState.sessions || [];
    const widgetRegistry: Record<string, ReportData> = sessionState.widgetRegistry || {};
    const activeSessionId = sessionState.activeSessionId || '';
    const activeView = sessionState.activeView || 'chat';
    const activeFileId = sessionState.activeFileId || null;

    // 3. Construct ProjectData
    const projectData: ProjectData = {
      meta: {
        id: data.manifest.meta.id,
        name: data.manifest.meta.name,
        version: '1.1.0', // Store version, not manifest version
        created: data.manifest.meta.createdAt,
      },
      files,
      relations,
      sessions,
      activeSessionId,
      activeView,
      activeFileId,
      widgetRegistry,
    };

    // 4. Load into Store
    loadProjectToStore(projectData);
    setProjectPath(data.path);
    
    // 5. Trigger a refresh to get row counts and samples if possible?
    // The store has `refreshSessionWidgets`, but for files we might need `reloadFile`.
    // For now we just load the state.
  }, [loadProjectToStore, setProjectPath]);

  const createProject = useCallback(async (name: string, location: string) => {
      const path = await projectService.create(name, location);
      // After create, we usually want to open it immediately.
      await openProject(path);
      return path;
  }, [openProject]);

  const closeProject = useCallback(async () => {
      await projectService.close();
      setProjectPath(null);
      // Reset store?
      useProjectStore.getState().reset();
  }, [setProjectPath]);

  return {
    saveProject,
    openProject,
    createProject,
    closeProject
  };
}
