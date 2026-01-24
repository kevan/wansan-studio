import { useCallback } from 'react'
import { useProjectStore } from '../stores/useProjectStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useProGate } from '@/hooks/use-pro-gate'
import { projectService } from '../services/project-service'
import {
  ProjectLoadResult,
  ProjectManifest,
  SemanticLayer,
} from '@shared/types/project-manifest'
import { FileNode, SmartMetric, SyncStatus, TableRelation } from '@shared/types'
import { ProjectData, Session } from '@shared/types/project'
import { ReportData } from '@shared/types/dashboard'
import { Analytics } from '../services/analytics'
import { getCleanedRegistry } from '../utils/project-utils'

const TRIAL_PROJECT_LIMIT = 2

export function useProjectIO() {
  // const currentProjectPath = useProjectStore(state => state.currentProjectPath)
  const setProjectPath = useProjectStore(state => state.setProjectPath)
  const loadProjectToStore = useProjectStore(state => state.loadProject)
  const { addRecentProject, recentProjectPaths, isActivated } =
    useSettingsStore()
  const { checkGate, gateNode } = useProGate()

  const saveProject = useCallback(async () => {
    const state = useProjectStore.getState()
    const path = state.currentProjectPath

    if (!path) {
      throw new Error('No project path set. Use create or open first.')
    }

    // 1. Build Manifest (Assets)
    const assets = state.files.map(f => ({
      id: f.id,
      name: f.name,
      originalPath: f.path,
      tableName: f.tableName,
      sheetName: f.sheetName,
      status: f.status, // Add status
      rowCount: f.rowCount, // Add rowCount
      lastModified: f.lastModified, // Add lastModified
      createdAt: f.createdAt, // Add createdAt
      columns: f.columns.map(c => ({
        name: c.name,
        type: c.type,
        safeName: c.safeName,
        sampleValues: c.sampleValues, // Add sampleValues
        nullable: c.nullable, // Add nullable
        isPrimaryKey: c.isPrimaryKey, // Add isPrimaryKey
        semantic: c.semantic, // [FIX] Persist semantic info
      })),
    }))

    const manifest: Partial<ProjectManifest> = {
      assets,
      settings: {
        theme: 'light', // Default or from settings store if available
      },
    }

    // 2. Build Semantic Layer
    const smartMetrics: Record<string, SmartMetric[]> = {}
    const relations: Record<string, TableRelation[]> = {}

    state.files.forEach(f => {
      if (f.smartMetrics && f.smartMetrics.length > 0) {
        smartMetrics[f.id] = f.smartMetrics
      }
      if (f.relations && f.relations.length > 0) {
        relations[f.id] = f.relations
      }
    })

    const semantic: SemanticLayer = {
      relations,
      smartMetrics,
    }

    // 3. Build Session Layer
    // Use common utility to prune unreferenced widgets (especially 'text' type)
    const cleanedRegistry = getCleanedRegistry(state.widgetRegistry, state.sessions)

    const sessionData = {
      sessions: state.sessions,
      activeSessionId: state.activeSessionId,
      activeView: state.activeView,
      activeFileId: state.activeFileId,
      widgetRegistry: cleanedRegistry,
    }

    await projectService.save(path, {
      manifest,
      semantic,
      session: sessionData,
    })
  }, [])

  const openProject = useCallback(
    async (path?: string) => {
      let targetPath = path

      // If no path provided, open dialog
      if (!targetPath) {
        // We need to call service to pick a file before checkGate because we need the path
        targetPath = await projectService.selectDirectory()
        if (!targetPath) return // User cancelled
      }

      // Limit Check for TRIAL users
      if (!isActivated && recentProjectPaths.length >= 2) {
        const isRecent = recentProjectPaths.includes(targetPath)
        if (!isRecent) {
          checkGate('Multi-Project', () => {})
          return null
        }
      }

      // 1. Call Service
      const data: ProjectLoadResult = await projectService.open(targetPath)

      // 2. Reconstruct State
      // Map Assets -> FileNode[]
      const files: FileNode[] = data.manifest.assets.map(asset => {
        const metrics = data.semantic.smartMetrics[asset.id] || []
        const relations = data.semantic.relations[asset.id] || []
        const now = Date.now()

        return {
          id: asset.id,
          name: asset.name,
          path: asset.originalPath,
          tableName: asset.tableName,
          sheetName: asset.sheetName,
          status: (asset.status || 'ready') as SyncStatus, // Use saved status
          progress: 100, // Always 100 on load
          size: 0, // Not saved yet, can re-fetch if needed
          columns: asset.columns.map(c => ({
            name: c.name,
            safeName: c.safeName,
            type: c.type as any,
            sampleValues: c.sampleValues || [], // Use saved sampleValues
            nullable: c.nullable ?? true, // Use saved nullable or default
            isPrimaryKey: c.isPrimaryKey ?? false, // Use saved isPrimaryKey or default
            semantic: (c as any).semantic, // [FIX] Restore semantic info
          })),
          rowCount: asset.rowCount || 0, // Use saved rowCount
          error: undefined, // Error status not persisted
          lastModified: asset.lastModified || now, // Use saved lastModified
          createdAt: asset.createdAt || now, // Use saved createdAt
          smartMetrics: metrics,
          relations: relations,
        }
      })

      // Sessions & Widgets
      const sessionState = data.session || {}
      const sessions: Session[] = sessionState.sessions || []
      const widgetRegistry: Record<string, ReportData> =
        sessionState.widgetRegistry || {}
      const activeSessionId = sessionState.activeSessionId || ''
      const activeView = sessionState.activeView || 'chat'
      const activeFileId = sessionState.activeFileId || null

      // 3. Construct ProjectData
      const projectData: ProjectData = {
        meta: {
          id: data.manifest.meta.id,
          name: data.manifest.meta.name,
          version: '1.1.0', // Store version, not manifest version
          created: data.manifest.meta.createdAt,
        },
        files,
        sessions,
        activeSessionId,
        activeView,
        activeFileId,
        widgetRegistry,
      }

      // 4. Load into Store
      loadProjectToStore(projectData)
      setProjectPath(data.path)
      addRecentProject(data.path)

      Analytics.track('project_opened', {
        asset_count: files.length,
        has_metrics: files.some(f => (f.smartMetrics?.length || 0) > 0),
      })

      // 5. Trigger a refresh to get row counts and samples if possible?
      // The store has `refreshSessionWidgets`, but for files we might need `reloadFile`.
      // For now we just load the state.
    },
    [
      loadProjectToStore,
      setProjectPath,
      isActivated,
      addRecentProject,
      checkGate,
    ]
  )

  const createProject = useCallback(
    async (name: string, location: string) => {
      // Limit Check
      if (!isActivated && recentProjectPaths.length >= TRIAL_PROJECT_LIMIT) {
        checkGate('Multi-Project', () => {})
        return null
      }

      const path = await projectService.create(name, location)

      // CRITICAL: Add to recent list BEFORE opening to pass the limit check inside openProject
      addRecentProject(path)

      // After create, we usually want to open it immediately.
      await openProject(path)

      Analytics.track('project_created', {})
      return path
    },
    [openProject, isActivated, recentProjectPaths, addRecentProject, checkGate]
  )

  const closeProject = useCallback(async () => {
    await projectService.close()
    setProjectPath(null)
    // Reset store?
    useProjectStore.getState().reset()
  }, [setProjectPath])

  return {
    saveProject,
    openProject,
    createProject,
    closeProject,
    checkGate, // Export checkGate
    gateNode, // Export gateNode so callers can render it
  }
}
