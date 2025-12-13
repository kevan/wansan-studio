import fs from 'fs-extra'
import { FileNode } from '../../shared/types'

export async function checkFilesConsistency(
  files: FileNode[]
): Promise<string[]> {
  const changedIds: string[] = []
  for (const file of files) {
    // 跳过 Demo 数据（路径为 DEMO_MEMORY，不是真实文件）
    if (file.path === 'DEMO_MEMORY') {
      continue
    }

    try {
      const stats = await fs.stat(file.path)
      // Tolerance 100ms. Note: file.lastModified might be undefined for old files, handle gracefully
      const storedTime = file.lastModified || 0
      if (stats.mtimeMs > storedTime + 100) {
        changedIds.push(file.id)
      }
    } catch (e) {
      // File missing or inaccessible
      console.warn(`File check failed for ${file.path}:`, e)
      // We could mark it as 'missing' if we had that status, for now treat as 'out-of-sync' or ignore?
      // The requirement mentions 'missing' status but only asked to return changedIds (strings).
      // We'll treat missing files as "changed" (needs attention) or ignore.
      // If we return it, the UI will show it as out-of-sync.
      // Ideally we should distinguish, but for MVP consistency check, let's just return it if we can't verify it matches.
      // Actually, if it's missing, stats throws.
      // If we assume 'out-of-sync' covers missing, we can return id.
      // But let's stick to the doc: "File missing, handled separately or ignored".
      // I will ignore for now to avoid crashes or confusing UI if it's just a permissions blip.
    }
  }
  return changedIds
}
