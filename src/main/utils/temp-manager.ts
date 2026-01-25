import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import os from 'os'

const SUBDIR_NAME = 'wansan-studio'

export class TempFileManager {
  /**
   * Get the dedicated temp directory path
   */
  static getTempDir(): string {
    return path.join(app.getPath('temp'), SUBDIR_NAME)
  }

  /**
   * Ensure the temp directory exists and return its path
   */
  static async ensureTempDir(): Promise<string> {
    const dir = this.getTempDir()
    await fs.ensureDir(dir)
    return dir
  }

  /**
   * Securely delete a file.
   * ONLY allows deletion if the file is within the system temp directory or app temp directory.
   */
  static async secureUnlink(targetPath: string): Promise<void> {
    if (!targetPath) return

    const resolvedPath = path.resolve(targetPath)
    const systemTemp = path.resolve(app.getPath('temp'))
    const osTemp = path.resolve(os.tmpdir())
    
    // Check if path is inside temp locations
    const isSafe = resolvedPath.startsWith(systemTemp) || resolvedPath.startsWith(osTemp)

    if (!isSafe) {
      console.error(`[Security] Blocked unsafe deletion attempt: ${targetPath}`)
      throw new Error('Security Violation: Cannot delete files outside of temporary directories.')
    }

    try {
      if (await fs.pathExists(resolvedPath)) {
        await fs.unlink(resolvedPath)
        console.log(`[TempFileManager] Securely deleted: ${resolvedPath}`)
      }
    } catch (error) {
      console.warn(`[TempFileManager] Failed to delete ${resolvedPath}:`, error)
    }
  }

  /**
   * Generate a safe temporary file path with the given extension.
   * Ensures the file is located within the app's dedicated temp directory.
   */
  static getTempFilePath(extension: string = '.tmp'): string {
    const dir = this.getTempDir()
    // Ensure dir exists synchronously or assume ensureTempDir is called before?
    // Better to use a sync ensure here if we want to return string immediately, 
    // but fs-extra ensureDirSync is blocking.
    // For now, we return the path. The caller should ensure directory existence via ensureTempDir()
    // or we can rely on standard OS temp behavior (usually exists).
    // Let's use a simple timestamp + random suffix.
    const name = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}${extension.startsWith('.') ? extension : `.${extension}`}`
    return path.join(dir, name)
  }

  /**
   * Cleanup all temporary files in the dedicated temp directory
   */
  static async cleanupOldFiles(): Promise<void> {
    try {
      const dir = this.getTempDir()
      if (!(await fs.pathExists(dir))) return

      console.log(`[TempFileManager] Cleaning up all temporary files in ${dir}`)

      // emptyDir deletes directory contents but keeps the directory itself
      await fs.emptyDir(dir)
    } catch (error) {
      console.error('[TempFileManager] Cleanup failed:', error)
    }
  }
}
