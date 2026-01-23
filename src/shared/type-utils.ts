import { ColumnType } from './types'

export function normalizeDuckDBType(duckType: string): ColumnType {
  const type = duckType.toUpperCase().trim()

  // --- Arrow Type Adaptations ---
  // Handle complex Arrow types like "Date32<DAY>", "Timestamp<MICROSECOND>", "Decimal128<10, 2>"
  if (type.includes('<')) {
    if (type.startsWith('DATE')) return 'DATE'
    if (type.startsWith('TIMESTAMP')) return 'TIMESTAMP'
    if (type.startsWith('TIME')) return 'TIME'
    if (type.startsWith('DECIMAL')) return 'DECIMAL'
    if (type.startsWith('LIST')) return 'VARCHAR' // Lists as JSON strings
    if (type.startsWith('STRUCT')) return 'VARCHAR' // Structs as JSON strings
    if (type.startsWith('MAP')) return 'VARCHAR' // Maps as JSON strings
    if (type.startsWith('UNION')) return 'VARCHAR'
    if (type.startsWith('DICTIONARY')) return 'VARCHAR' // Usually decoded strings
  }

  // Handle Arrow primitive types without brackets or specific DuckDB variants
  if (type === 'INT64' || type === 'UINT64' || type === 'HUGEINT') return 'BIGINT'
  if (type.startsWith('INT') || type.startsWith('UINT')) return 'INTEGER'
  if (type.startsWith('FLOAT') || type.startsWith('DOUBLE')) return 'DECIMAL'
  if (
    type === 'UTF8' ||
    type === 'LARGEUTF8' ||
    type === 'BINARY' ||
    type === 'LARGEBINARY' ||
    type === 'UUID'
  )
    return 'VARCHAR'
  if (type === 'BOOL') return 'BOOLEAN'

  // --- Standard DuckDB / SQL Type Adaptations ---

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

  // 2. Integers
  if (type === 'HUGEINT' || type === 'BIGINT' || type === 'UBIGINT') {
    return 'BIGINT'
  }
  if (
    type === 'INTEGER' ||
    type === 'SMALLINT' ||
    type === 'TINYINT' ||
    type === 'USMALLINT' ||
    type === 'UTINYINT'
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
    return 'DECIMAL'
  }

  // 4. Boolean
  if (type === 'BOOLEAN' || type === 'BOOL') {
    return 'BOOLEAN'
  }

  // 5. Dates
  if (
    type === 'DATE' ||
    type.startsWith('DATE32') ||
    type.startsWith('DATE64')
  ) {
    return 'DATE'
  }

  // 6. Timestamps (Handle Timezones)
  // DuckDB often returns "TIMESTAMP WITH TIME ZONE" or "TIMESTAMPTZ"
  // Arrow returns "Timestamp<...>"
  if (type.startsWith('TIMESTAMP') || type === 'DATETIME') {
    return 'TIMESTAMP'
  }

  // 7. Time
  if (type.startsWith('TIME')) {
    return 'TIME'
  }

  return 'VARCHAR' // Fallback for BLOBS, Structs, Lists (stringify them)
}

export type UIFormatType = 'number' | 'text' | 'date' | 'timestamp'

export function getUIFormatType(type: ColumnType): UIFormatType {
  switch (type) {
    case 'INTEGER':
    case 'DECIMAL':
      return 'number'
    case 'BIGINT':
      // Default BIGINT to text to prevent precision loss in JS for IDs
      return 'text'
    case 'DATE':
      return 'date'
    case 'TIMESTAMP':
    case 'TIME':
      return 'timestamp'
    case 'VARCHAR':
    case 'BOOLEAN':
    default:
      return 'text'
  }
}
