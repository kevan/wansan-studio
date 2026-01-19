/**
 * Generates the standardized column name for joined dimensions.
 * Format: "${foreignKey}__${targetColumn}"
 * Example: product_id__base_price
 */
export function getJoinedColumnName(
  prefix: string,
  columnName: string
): string {
  return `${prefix}__${columnName}`
}

export function sanitizeTableName(
  originalName: string,
  sheetName?: string,
  prefix: string = 't_'
): string {
  let baseName = originalName.split('.').slice(0, -1).join('.') || originalName

  if (sheetName) {
    baseName = `${baseName}_${sheetName}`
  }

  // Allow Chinese, alphanum, underscore. Replace others with _
  let safeName = prefix + baseName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')
  // Trim underscores
  safeName = safeName.replace(/_+/g, '_').replace(/_$/, '')

  return safeName.toLowerCase()
}

/**
 * Parses a joined column name back to its components.
 */
export function parseJoinedColumnName(
  name: string
): { prefix: string; column: string } | null {
  const parts = name.split('__')
  if (parts.length < 2) return null
  return { prefix: parts[0], column: parts.slice(1).join('__') }
}

/**
 * Sanitizes a string for use as a filename by replacing illegal characters.
 */
export function sanitizeFilename(name: string, fallback: string = 'file'): string {
  if (!name) return fallback
  // Replace illegal filename characters with underscore
  return name.replace(/[\\/?*:!|"<>.]/g, '_') || fallback
}
