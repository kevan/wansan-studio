import { ColumnType } from './types'

export function normalizeDuckDBType(duckType: string): ColumnType {
  const type = duckType.toUpperCase().trim()

  // 1. Text / String
  if (
    type.startsWith('VARCHAR') ||
    type === 'CHAR' ||
    type === 'TEXT' ||
    type === 'STRING' ||
    type === 'UUID'
  ) {
    return 'VARCHAR'
  }

  // 2. Integers (Handle BIGINT carefully)
  if (
    type === 'BIGINT' ||
    type === 'INTEGER' ||
    type === 'INT' ||
    type === 'SMALLINT' ||
    type === 'TINYINT' ||
    type === 'HUGEINT'
  ) {
    return 'INTEGER'
  }

  // 3. Floats / Decimals
  if (
    type === 'DOUBLE' ||
    type === 'FLOAT' ||
    type === 'REAL' ||
    type.startsWith('DECIMAL')
  ) {
    return 'DOUBLE'
  }

  // 4. Boolean
  if (type === 'BOOLEAN' || type === 'BOOL') {
    return 'BOOLEAN'
  }

  // 5. Dates
  if (type === 'DATE') {
    return 'DATE'
  }

  // 6. Timestamps (Handle Timezones)
  // DuckDB often returns "TIMESTAMP WITH TIME ZONE" or "TIMESTAMPTZ"
  if (type.startsWith('TIMESTAMP') || type === 'DATETIME') {
    return 'TIMESTAMP'
  }

  // 7. Time (Convert to string for analysis usually, or keep separate if supported)
  if (type.startsWith('TIME')) {
    return 'VARCHAR' // Analyze time as string usually better for charts unless specific time-series
  }

  return 'VARCHAR' // Fallback for BLOBS, Structs, Lists (stringify them)
}

export type UIFormatType = 'number' | 'text' | 'date'

export function getUIFormatType(type: string): UIFormatType {
  const lowerType = type.toLowerCase()
  
  if (
    lowerType.includes('int') ||
    lowerType.includes('decimal') ||
    lowerType.includes('double') ||
    lowerType.includes('float') ||
    lowerType.includes('bigint') ||
    lowerType.includes('number') ||
    lowerType.includes('numeric')
  ) {
    return 'number'
  }
  
  if (
    lowerType.includes('date') ||
    lowerType.includes('time') ||
    lowerType.includes('timestamp')
  ) {
    return 'date'
  }
  
  return 'text'
}
