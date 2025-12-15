import { FileNode } from '@shared/types.ts'
import { useFileStore } from '../stores/useFileStore'
import { generateId } from '@shared/utils.ts'
import { DEMO_DATA } from '@shared/demo-data.ts'

export { DEMO_DATA } from '../../shared/demo-data'

export async function loadDemoData(
  suggestedPrompts?: string[]
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const fileId = generateId()
    const tableName = 't_demo_superstore'

    // 1. 摄取到 DuckDB
    const result = await window.electronAPI.invoke(
      'ingest-json',
      tableName,
      DEMO_DATA
    )

    if (!result.success) {
      throw new Error(result.error || 'Failed to ingest demo data')
    }

    // 2. 创建 FileNode
    const fileNode: FileNode = {
      id: fileId,
      name: 'Superstore_Demo.csv',
      path: 'DEMO_MEMORY',
      status: 'ready',
      tableName: tableName,
      columns: result.data?.columns || [],
      lastModified: Date.now(),
      createdAt: Date.now(),
    }

    // 3. 更新 FileStore
    useFileStore.getState().addFile(fileNode)

    // 4. 预填充建议提示词（如果提供）
    if (suggestedPrompts && suggestedPrompts.length > 0) {
      useFileStore.getState().setSuggestedPrompts(suggestedPrompts)
    }

    return { success: true, fileId }
  } catch (error) {
    console.error('Load demo data error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
