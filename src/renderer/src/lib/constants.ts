import {
  Calendar,
  Clock,
  Hash,
  ToggleLeft,
  Type,
  LucideIcon,
} from 'lucide-react'
import { ColumnType } from '@shared/types'

export const AI_PROVIDERS = {
  deepseek: {
    name: 'DeepSeek (深度求索)',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      'gpt-4o',
      'gpt-4.1',
      'gpt-4-turbo',
      'gpt-4o-mini',
      'o4-mini',
      'gpt-3.5-turbo',
    ],
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
  moonshot: {
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    getKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
  },
  custom: {
    name: 'Custom / Proxy',
    baseUrl: '',
    models: [] as string[],
    getKeyUrl: '',
  },
} as const

export const DEFAULT_SPECIAL_EXPIRY = '2026-12-31'

export type AIProviderKey = keyof typeof AI_PROVIDERS

export interface ColumnTypeDisplayConfig {
  label: string
  icon: LucideIcon
  bgColor: string
  textColor: string
  uiLabel: string
  isStandard?: boolean // [NEW] Mark preferred type for ingestion
}

export const COLUMN_TYPE_CONFIG: Record<ColumnType, ColumnTypeDisplayConfig> = {
  VARCHAR: {
    label: 'format_text',
    icon: Type,
    bgColor: 'bg-zinc-100',
    textColor: 'text-zinc-600',
    uiLabel: 'Text',
    isStandard: true,
  },
  DECIMAL: {
    label: 'format_decimal',
    icon: Hash,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    uiLabel: 'Decimal',
    isStandard: true,
  },
  INTEGER: {
    label: 'format_integer',
    icon: Hash,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    uiLabel: 'Integer',
    isStandard: true,
  },
  BIGINT: {
    label: 'format_integer',
    icon: Hash,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    uiLabel: 'Integer',
  },
  DATE: {
    label: 'format_date',
    icon: Calendar,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    uiLabel: 'Date',
    isStandard: true,
  },
  TIMESTAMP: {
    label: 'format_datetime',
    icon: Clock,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    uiLabel: 'Date Time',
    isStandard: true,
  },
  TIME: {
    label: 'format_time',
    icon: Clock,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    uiLabel: 'Time',
    isStandard: true,
  },
  BOOLEAN: {
    label: 'type_boolean',
    icon: ToggleLeft,
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    uiLabel: 'Boolean',
    isStandard: true,
  },
}
