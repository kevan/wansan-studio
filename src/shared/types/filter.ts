export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_null'
  | 'is_not_null'
  | 'starts_with'
  | 'ends_with'

export interface FilterRule {
  id: string
  columnName: string
  columnType: string
  operator: FilterOperator
  value: any
  enabled: boolean
}

export const OPERATORS: Record<FilterOperator, { label: string; symbol?: string; validTypes: string[] }> = {
  equals: { label: '等于', symbol: '=', validTypes: ['text', 'number', 'date'] },
  not_equals: { label: '不等于', symbol: '!=', validTypes: ['text', 'number', 'date'] },
  contains: { label: '包含', validTypes: ['text'] },
  not_contains: { label: '不包含', validTypes: ['text'] },
  starts_with: { label: '开头是', validTypes: ['text'] },
  ends_with: { label: '结尾是', validTypes: ['text'] },
  gt: { label: '大于', symbol: '>', validTypes: ['number', 'date'] },
  gte: { label: '大于等于', symbol: '>=', validTypes: ['number', 'date'] },
  lt: { label: '小于', symbol: '<', validTypes: ['number', 'date'] },
  lte: { label: '小于等于', symbol: '<=', validTypes: ['number', 'date'] },
  is_null: { label: '为空', validTypes: ['text', 'number', 'date'] },
  is_not_null: { label: '不为空', validTypes: ['text', 'number', 'date'] },
}

export function getSimpleType(dbType: string): 'text' | 'number' | 'date' {
  const t = dbType.toUpperCase()
  if (['INT', 'BIGINT', 'DOUBLE', 'DECIMAL', 'FLOAT', 'NUMBER', 'REAL', 'INTEGER'].some(k => t.includes(k))) return 'number'
  if (['DATE', 'TIME', 'TIMESTAMP'].some(k => t.includes(k))) return 'date'
  return 'text'
}

export function filterRuleToSQL(rule: FilterRule): string {
  if (!rule.enabled) return ''
  const col = `"${rule.columnName}"`
  const val = rule.value

  switch (rule.operator) {
    case 'equals':
      return typeof val === 'number' ? `${col} = ${val}` : `${col} = '${val}'`
    case 'not_equals':
      return typeof val === 'number' ? `${col} != ${val}` : `${col} != '${val}'`
    case 'contains':
      return `${col} ILIKE '%${val}%'`
    case 'not_contains':
      return `${col} NOT ILIKE '%${val}%'`
    case 'starts_with':
      return `${col} ILIKE '${val}%'`
    case 'ends_with':
      return `${col} ILIKE '%${val}'`
    case 'gt':
      return `${col} > ${val}`
    case 'gte':
      return `${col} >= ${val}`
    case 'lt':
      return `${col} < ${val}`
    case 'lte':
      return `${col} <= ${val}`
    case 'is_null':
      return `${col} IS NULL`
    case 'is_not_null':
      return `${col} IS NOT NULL`
    default:
      return ''
  }
}
