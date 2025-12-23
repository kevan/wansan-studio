import { FileNode, TableSchema } from '@shared/types'
import { processSampleValue } from '@shared/serialization'

/**
 * Maps a FileNode (Store/UI entity) to a TableSchema (AI context entity).
 * Implements "Schema Masking": if metrics exist, use 'v_' prefix for the table name
 * to ensure the AI uses the DuckDB View instead of the raw table.
 */
export function mapFileToSchema(file: FileNode): TableSchema {
  const hasMetrics = file.smartMetrics && file.smartMetrics.length > 0

  // Schema Masking: Use 'v_' prefix if metrics exist
  const exposedTableName = hasMetrics
    ? `v_${file.tableName || `table_${file.id}`}`
    : file.tableName || `table_${file.id}`

  return {
    tableName: exposedTableName,
    description: hasMetrics ? `${file.name} (Enriched View)` : file.name,
    columns: file.columns.map(col => ({
      ...col,
      sampleValues: (col.sampleValues || []).map(val =>
        processSampleValue(val, col.type)
      ),
    })),
    smartMetrics: file.smartMetrics,
  }
}
