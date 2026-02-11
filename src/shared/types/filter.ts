export type LogicalOperator = 'AND' | 'OR'

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'is_null'
  | 'is_not_null'
  | 'in'
  | 'not_in'

export interface FilterCondition {
  id: string
  columnName: string
  columnType: string
  sourceType?: 'raw' | 'ai' | 'metric' | 'joined'
  operator: FilterOperator
  value: any
  enabled: boolean
}

export interface FilterState {
  conjunction: LogicalOperator
  conditions: FilterCondition[]
}

// Deprecated: old FilterRule for migration compatibility
export type FilterRule = FilterCondition

export const OPERATOR_CONFIG: Record<FilterOperator, { label: string; symbol?: string; validTypes: string[]; inputType: 'text' | 'number' | 'date' | 'none' | 'multi' | 'range' }> = {
  equals: { label: '等于', symbol: '=', validTypes: ['text', 'number', 'date', 'boolean'], inputType: 'text' },
  not_equals: { label: '不等于', symbol: '!=', validTypes: ['text', 'number', 'date'], inputType: 'text' },
  contains: { label: '包含', validTypes: ['text'], inputType: 'text' },
  not_contains: { label: '不包含', validTypes: ['text'], inputType: 'text' },
  starts_with: { label: '开头是', validTypes: ['text'], inputType: 'text' },
  ends_with: { label: '结尾是', validTypes: ['text'], inputType: 'text' },
  gt: { label: '大于', symbol: '>', validTypes: ['number', 'date'], inputType: 'number' },
  gte: { label: '大于等于', symbol: '>=', validTypes: ['number', 'date'], inputType: 'number' },
  lt: { label: '小于', symbol: '<', validTypes: ['number', 'date'], inputType: 'number' },
  lte: { label: '小于等于', symbol: '<=', validTypes: ['number', 'date'], inputType: 'number' },
  between: { label: '介于', validTypes: ['number', 'date'], inputType: 'range' },
  is_null: { label: '为空', validTypes: ['text', 'number', 'date', 'boolean'], inputType: 'none' },
  is_not_null: { label: '不为空', validTypes: ['text', 'number', 'date', 'boolean'], inputType: 'none' },
  in: { label: '在列表中', validTypes: ['text', 'number'], inputType: 'multi' },
  not_in: { label: '不在列表中', validTypes: ['text', 'number'], inputType: 'multi' },
}

// Legacy export for compatibility, map to OPERATOR_CONFIG
export const OPERATORS = OPERATOR_CONFIG

export function getSimpleType(dbType: string): 'text' | 'number' | 'date' | 'boolean' {
  const t = dbType.toUpperCase()
  if (['INT', 'BIGINT', 'DOUBLE', 'DECIMAL', 'FLOAT', 'NUMBER', 'REAL', 'INTEGER'].some(k => t.includes(k))) return 'number'
  if (['DATE', 'TIME', 'TIMESTAMP'].some(k => t.includes(k))) return 'date'
  if (['BOOL', 'BOOLEAN'].some(k => t.includes(k))) return 'boolean'
  return 'text'
}

export function filterStateToSQL(state: FilterState): string {
  const enabled = state.conditions.filter(c => c.enabled)
  if (enabled.length === 0) return ''

  const parts = enabled.map(filterRuleToSQL).filter(p => p !== '')
  if (parts.length === 0) return ''

  return `WHERE ${parts.join(` ${state.conjunction} `)}`
}

export function filterRuleToSQL(rule: FilterCondition): string {
  if (!rule.enabled) return ''
  const col = `"${rule.columnName}"`
  const val = rule.value
  const simpleType = getSimpleType(rule.columnType)

  const escapeSqlString = (input: string) => input.replace(/'/g, "''")

  const toSqlLiteral = (input: unknown): string => {
    if (input === null || input === undefined) return 'NULL'
    if (typeof input === 'number') return Number.isFinite(input) ? String(input) : 'NULL'
    if (typeof input === 'boolean') return input ? 'TRUE' : 'FALSE'
    return `'${escapeSqlString(String(input))}'`
  }

  const toTypedLiteral = (input: unknown): string => {
    if (simpleType === 'number') {
      const numeric = typeof input === 'number' ? input : Number(input)
      return Number.isFinite(numeric) ? String(numeric) : 'NULL'
    }
    if (simpleType === 'boolean') {
      if (typeof input === 'boolean') return input ? 'TRUE' : 'FALSE'
      return String(input).toLowerCase() === 'true' ? 'TRUE' : 'FALSE'
    }
    return toSqlLiteral(input)
  }

  switch (rule.operator) {
    case 'equals':
      return `${col} = ${toTypedLiteral(val)}`
    case 'not_equals':
      return `${col} != ${toTypedLiteral(val)}`
    case 'contains':
      return `${col} ILIKE '%${escapeSqlString(String(val))}%'`
    case 'not_contains':
      return `${col} NOT ILIKE '%${escapeSqlString(String(val))}%'`
    case 'starts_with':
      return `${col} ILIKE '${escapeSqlString(String(val))}%'`
    case 'ends_with':
      return `${col} ILIKE '%${escapeSqlString(String(val))}'`
    case 'gt':
      return `${col} > ${toTypedLiteral(val)}`
    case 'gte':
      return `${col} >= ${toTypedLiteral(val)}`
    case 'lt':
      return `${col} < ${toTypedLiteral(val)}`
    case 'lte':
      return `${col} <= ${toTypedLiteral(val)}`
    case 'between':
      // Value should be [min, max]
      if (Array.isArray(val) && val.length === 2) {
        return `${col} BETWEEN ${toTypedLiteral(val[0])} AND ${toTypedLiteral(val[1])}`
      }
      return ''
    case 'is_null':
      return `${col} IS NULL`
    case 'is_not_null':
      return `${col} IS NOT NULL`
    case 'in':
      if (Array.isArray(val) && val.length > 0) {
        const list = val.map(v => toTypedLiteral(v)).join(', ')
        return `${col} IN (${list})`
      }
      return ''
    case 'not_in':
      if (Array.isArray(val) && val.length > 0) {
        const list = val.map(v => toTypedLiteral(v)).join(', ')
        return `${col} NOT IN (${list})`
      }
      return ''
    default:
      return ''
  }
}
