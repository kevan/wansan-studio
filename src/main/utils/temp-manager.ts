import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'

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
