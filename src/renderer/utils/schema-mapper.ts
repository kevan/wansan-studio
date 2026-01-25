import { FileNode, RelationSuggestion, TableSchema } from '@shared/types'
import { processSampleValue } from '@shared/serialization'

/**
 * Maps a FileNode (Store/UI entity) to a TableSchema (AI context entity).
 * Implements "Schema Masking": if metrics exist, use 'v_' prefix for the table name
 * to ensure the AI uses the DuckDB View instead of the raw table.
 */
export function mapFileToSchema(
  file: FileNode,
  allFiles: FileNode[] = [],
  options?: { skipMetrics?: boolean; skipRelations?: boolean }
): TableSchema {
  const hasMetrics =
    !options?.skipMetrics && file.smartMetrics && file.smartMetrics.length > 0

  // Schema Masking: Use 'v_' prefix if metrics exist
  const exposedTableName = hasMetrics
    ? `v_${file.tableName || `table_${file.id}`}`
    : file.tableName || `table_${file.id}`

  // Map relations: Convert targetFileId to actual targetTableName (respecting masking)
  const relations = options?.skipRelations
    ? []
    : (file.relations || [])
        .map(rel => {
          const targetFile = allFiles.find(f => f.id === rel.targetFileId)
          if (!targetFile) return null

          // Resolve target table name (respect masking)
          const targetHasMetrics =
            !options?.skipMetrics &&
            targetFile.smartMetrics &&
            targetFile.smartMetrics.length > 0
          const targetName = targetHasMetrics
            ? `v_${targetFile.tableName}`
            : targetFile.tableName

          return {
            sourceTable: exposedTableName,
            sourceColumn: rel.sourceColumn,
            targetTable: targetName,
            targetColumn: rel.targetColumn,
            confidence: 1.0,
            reason: 'User defined relationship',
          } satisfies RelationSuggestion
        })
        .filter((r): r is RelationSuggestion => r !== null)

  return {
    tableName: exposedTableName,
    description: hasMetrics ? `${file.name} (Enriched View)` : file.name,
    columns: file.columns.map(col => ({
      ...col,
      sampleValues: (col.sampleValues || []).map(val =>
        processSampleValue(val, col.type)
      ),
    })),
    smartMetrics: options?.skipMetrics ? [] : file.smartMetrics,
    relations,
  }
}