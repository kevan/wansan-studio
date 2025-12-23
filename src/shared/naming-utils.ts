/**
 * Generates the standardized column name for joined dimensions.
 * Format: "${foreignKey}__${targetColumn}"
 * Example: product_id__base_price
 */
export function getJoinedColumnName(
  foreignKey: string,
  targetColumn: string
): string {
  return `${foreignKey}__${targetColumn}`
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
