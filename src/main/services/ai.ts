import Store from 'electron-store'
import {
  generateAnalysis,
  inferRelationships,
  setAIConfig,
  isAIConfigured,
} from '../engine/ai-bridge'
import type {
  TableSchema,
  AnalysisResult,
  RelationSuggestion,
} from '../../shared/types'

interface AIConfig {
  apiKey?: string
  baseURL?: string
  model?: string
}

// Define schema for electron-store
const schema = {
  aiConfig: {
    type: 'object',
    properties: {
      apiKey: { type: 'string' },
      baseURL: { type: 'string' },
      model: { type: 'string' },
    },
    default: {},
  },
} as const

const store = new Store({ schema })

export class AIService {
  constructor() {
    this.loadConfig()
  }

  private loadConfig() {
    // 从 store 加载配置，但不要使用 store 的默认值，而是让 process.env 优先
    const storedConfig = store.get('aiConfig') as AIConfig
    console.log('[AI Service] loadConfig', { storedConfig })

    // 构造实际生效的配置，优先使用存储的，然后是环境变量，最后是硬编码默认值
    const effectiveApiKey = storedConfig.apiKey || process.env.OPENAI_API_KEY
    const effectiveBaseURL = storedConfig.baseURL || process.env.OPENAI_BASE_URL
    const effectiveModel =
      storedConfig.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'

    // 将生效的配置传递给 ai-bridge
    setAIConfig({
      apiKey: effectiveApiKey,
      baseURL: effectiveBaseURL,
      model: effectiveModel,
    })

    if (!isAIConfigured()) {
      console.warn('AI Service: Not configured (missing API Key).')
    }
  }

  /**
   * Generates a full analysis.
   */
  async getAnalysis(
    userQuery: string,
    schemas: TableSchema[],
    relations: RelationSuggestion[],
    context?: { lastSql: string; lastQuery: string }
  ): Promise<AnalysisResult> {
    return generateAnalysis(userQuery, schemas, relations, context)
  }

  /**
   * Fixes a broken SQL query.
   */
  async fixQuery(
    originalSql: string,
    error: string,
    schemas: TableSchema[]
  ): Promise<{ sql: string; reasoning: string }> {
    // Import dynamically to avoid circular dependencies if any, or just use the imported function
    // We already imported generateAnalysis, so let's import fixSQL too
    // Note: Need to update imports at the top of the file
    const { fixSQL } = await import('../engine/ai-bridge')
    return fixSQL(originalSql, error, schemas)
  }

  /**
   * Analyzes multiple table schemas.
   */
  async getRelationSuggestions(
    schemas: TableSchema[]
  ): Promise<RelationSuggestion[]> {
    return inferRelationships(schemas)
  }

  /**
   * Sets and persists AI configuration.
   */
  setConfig(config: AIConfig) {
    const current = store.get('aiConfig') as AIConfig
    const newConfig = { ...current, ...config }
    store.set('aiConfig', newConfig)

    // Reload to apply
    this.loadConfig()
  }

  /**
   * Gets current effective configuration.
   * This method now constructs the config by prioritizing stored values,
   * then environment variables, then hardcoded defaults.
   */
  getConfig(): AIConfig {
    const storedConfig = store.get('aiConfig') as AIConfig

    const apiKey = storedConfig.apiKey || process.env.OPENAI_API_KEY
    const baseURL = storedConfig.baseURL || process.env.OPENAI_BASE_URL
    const model =
      storedConfig.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'

    return { apiKey, baseURL, model }
  }

  hasApiKey(): boolean {
    return isAIConfigured()
  }

  /**
   * Clears all AI configuration from the persistent store.
   */
  clearConfig() {
    store.clear()
    this.loadConfig() // Reload to apply environment defaults after clearing
    console.log('AI Service: Configuration cleared from store.')
  }
}
