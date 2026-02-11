import { FilterOperator, getSimpleType, OPERATOR_CONFIG } from '@shared/types/filter'
import { EffectiveInputType } from './ValueInput'

export function getEffectiveInputType(operator: FilterOperator, simpleType: ReturnType<typeof getSimpleType>): EffectiveInputType {
  if (simpleType === 'date') {
    if (operator === 'between') return 'date_range'
    if (operator === 'equals' || operator === 'not_equals' || operator === 'gt' || operator === 'gte' || operator === 'lt' || operator === 'lte') {
      return 'date'
    }
  }
  return OPERATOR_CONFIG[operator].inputType as EffectiveInputType
}
