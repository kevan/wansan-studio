import path from 'path'
import fs from 'fs-extra'
import { v4 as uuidv4 } from 'uuid'
import { NativeDatabaseService } from './native-db-service'
import {
  ProjectManifest,
  ProjectLoadResult,
  ProjectSavePayload,
  SemanticLayer,
} from '../../shared/types/project-manifest'

export class ProjectManager {
  private currentProjectPath: string | null = null
  private nativeDB: NativeDatabaseService

  constructor(nativeDB: NativeDatabaseService) {
    this.nativeDB = nativeDB
  }

  async createProject(name: string, location: string): Promise<string> {
    const projectId = uuidv4()
    let projectDirName = `${name}.wansan`
    let projectPath = path.join(location, projectDirName)

    // Prevent name collisions
    if (await fs.pathExists(projectPath)) {
      throw new Error(`Project "${name}" already exists in this location.`)
    }

    await fs.ensureDir(projectPath)

    const defaultManifest: ProjectManifest = {
      meta: {
        id: projectId,
        name: name,
        version: '1.3.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        engine: 'native',
      },
      assets: [],
      settings: {
        theme: 'light',
      },
    }

    const defaultSemantic: SemanticLayer = {
      relations: {},
      smartMetrics: {},
    }

    const defaultSession = {}

    await fs.writeJSON(path.join(projectPath, 'wansan.json'), defaultManifest, {
      spaces: 2,
    })
    await fs.writeJSON(
      path.join(projectPath, 'semantic.json'),
      defaultSemantic,
      { spaces: 2 }
    )
    await fs.writeJSON(path.join(projectPath, 'session.json'), defaultSession, {
      spaces: 2,
    })

    return projectPath
  }

  async openProject(projectPath: string): Promise<ProjectLoadResult> {
    // 1. Safety Check: Is a project already open?
    if (this.currentProjectPath) {
      console.log(
        `[ProjectManager] Closing active project '${this.currentProjectPath}' before switching...`
      )
      await this.closeProject()
    }

    const manifestPath = path.join(projectPath, 'wansan.json')
    if (!(await fs.pathExists(manifestPath))) {
      throw new Error(
        `Invalid project bundle: wansan.json not found in ${projectPath}`
      )
    }

    // Locking
    const lockPath = path.join(projectPath, '.lock')
    if (await fs.pathExists(lockPath)) {
      try {
        const pid = parseInt(await fs.readFile(lockPath, 'utf-8'), 10)
        // Check if process is alive
        try {
          process.kill(pid, 0) // This throws if pid doesn't exist
          throw new Error(`Project is already open by process ${pid}`)
        } catch (e: any) {
          if (e.code === 'EPERM') {
            throw new Error(
              `Project is locked by process ${pid} (Permission Denied to check)`
            )
          }
          if (e.message.includes('Project is already open')) {
            throw e
          }
          // Process not found, lock is stale. Continue.
          console.warn(
            `[ProjectManager] Found stale lock for PID ${pid}. Taking over.`
          )
        }
      } catch (err: any) {
        if (err.message.includes('Project is already open')) throw err
        // Else ignore parse error or other issues
      }
    }

    await fs.writeFile(lockPath, process.pid.toString())
    this.currentProjectPath = projectPath

    // Read Data
    const manifest: ProjectManifest = await fs.readJSON(manifestPath)

    let semantic: SemanticLayer
    try {
      semantic = await fs.readJSON(path.join(projectPath, 'semantic.json'))
    } catch (e) {
      console.warn('Failed to read semantic.json, using default', e)
      semantic = { relations: {}, smartMetrics: {} }
    }

    let session: any
    try {
      session = await fs.readJSON(path.join(projectPath, 'session.json'))
    } catch (e) {
      console.warn('Failed to read session.json, using default', e)
      session = {}
    }

    // Connect DB
    const dbPath = path.join(projectPath, 'source.duckdb')
    await this.nativeDB.initialize(dbPath)

    return {
      path: projectPath,
      manifest,
      semantic,
      session,
    }
  }

  async saveProject(
    projectPath: string,
    data: ProjectSavePayload
  ): Promise<void> {
    // If projectPath is null or empty, use currentProjectPath
    const targetPath = projectPath || this.currentProjectPath
    if (!targetPath) {
      throw new Error('No project path specified for save')
    }

    // Self-healing: Ensure directory exists (user might have deleted it)
    if (!(await fs.pathExists(targetPath))) {
      console.warn(
        `[ProjectManager] Project directory missing at ${targetPath}. Re-creating...`
      )
      await fs.ensureDir(targetPath)
    }

    // Trigger non-blocking checkpoint to flush WAL
    this.nativeDB.checkpoint().catch(err => {
      console.warn('[ProjectManager] Checkpoint failed during save:', err)
    })

    const tasks = []
    if (data.manifest) {
      const manifestPath = path.join(targetPath, 'wansan.json')
      let current = {}
      try {
        current = await fs.readJSON(manifestPath)
      } catch {}
      // Deep merge meta is tricky, but here we expect data.manifest to be partial updates.
      // We explicitly merge meta.
      const newMeta = {
        ...(current as any).meta,
        ...(data.manifest.meta || {}),
        updatedAt: Date.now(),
      }

      const updated = {
        ...current,
        ...data.manifest,
        meta: newMeta,
      }
      tasks.push(fs.writeJSON(manifestPath, updated, { spaces: 2 }))
    }

    if (data.semantic) {
      const semanticPath = path.join(targetPath, 'semantic.json')
      let current = { relations: [], smartMetrics: {} }
      try {
        current = await fs.readJSON(semanticPath)
      } catch {}
      const updated = { ...current, ...data.semantic }
      tasks.push(fs.writeJSON(semanticPath, updated, { spaces: 2 }))
    }

    if (data.session) {
      const sessionPath = path.join(targetPath, 'session.json')
      tasks.push(fs.writeJSON(sessionPath, data.session, { spaces: 2 }))
    }

    await Promise.all(tasks)
  }

  async closeProject(): Promise<void> {
    if (this.currentProjectPath) {
      const lockPath = path.join(this.currentProjectPath, '.lock')
      try {
        await fs.remove(lockPath)
      } catch (e) {
        console.error('Failed to remove lock file', e)
      }
      this.currentProjectPath = null
    }
    await this.nativeDB.close()
  }
}
