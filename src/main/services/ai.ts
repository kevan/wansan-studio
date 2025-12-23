import Store from 'electron-store'
import { OpenAI } from 'openai'
import type { ClientOptions } from 'openai'
import { generateAnalysis, analyzeContext } from '../engine/ai-bridge'
import type {
  TableSchema,
  AIAnalysisResult,
  RelationSuggestion,
  ContextAnalysisResult,
  AIConfig,
  DomainRule,
} from '@shared/types.ts'

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
  private openai: OpenAI | null = null
  private model = 'gpt-4-turbo-preview'

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

    this.model = effectiveModel

    if (effectiveApiKey) {
      const options: ClientOptions = {
        apiKey: effectiveApiKey,
        baseURL: effectiveBaseURL,
      }
      // if (isDev()) {
      //   options.logLevel = 'debug'
      // }
      this.openai = new OpenAI(options)
    } else {
      this.openai = null
      console.warn('AI Service: Not configured (missing API Key).')
    }
  }

  private requireOpenAI(): OpenAI {
    if (!this.openai) {
      throw new Error('AI not configured')
    }
    return this.openai
  }

  /**
   * Generates an analysis plan (SQL + viz config) without executing it.
   */
  async generatePlan(
    userQuery: string,
    schemas: TableSchema[],
    relations: RelationSuggestion[],
    context?: { lastSql: string; lastQuery: string },
    language: 'en' | 'zh' = 'en',
    domainRules: DomainRule[] = []
  ): Promise<AIAnalysisResult> {
    const client = this.requireOpenAI()

    const aiResult = await generateAnalysis(
      client,
      userQuery,
      schemas,
      relations,
      context,
      this.model,
      language,
      domainRules
    )

    if (aiResult.error) {
      return { status: 'error', error: aiResult.error }
    }

    return {
      status: 'success',
      sql: aiResult.sql,
      title: aiResult.title,
      summary: aiResult.summary,
      reasoning: aiResult.reasoning,
      suggestions: aiResult.suggestions,
      visualization: aiResult.viz_type
        ? {
            type: aiResult.viz_type as any,
            config: aiResult.viz_config as any,
          }
        : undefined,
      is_template: aiResult.is_template,
      missing_params: aiResult.missing_params,
    }
  }

  /**
   * Fixes a broken SQL query.
   */
  async fixQuery(
    originalSql: string,
    error: string,
    schemas: TableSchema[],
    domainRules: DomainRule[] = []
  ): Promise<{ sql: string; reasoning: string }> {
    // Import dynamically to avoid circular dependencies if any, or just use the imported function
    // We already imported generateAnalysis, so let's import fixSQL too
    // Note: Need to update imports at the top of the file
    const { fixSQL } = await import('../engine/ai-bridge')
    const client = this.requireOpenAI()

    return fixSQL(client, originalSql, error, schemas, this.model, domainRules)
  }

  /**
   * Analyzes multiple table schemas for relationships and starter prompts.
   */
  async getContextAnalysis(
    schemas: TableSchema[],
    language: 'en' | 'zh' = 'en'
  ): Promise<ContextAnalysisResult> {
    const client = this.requireOpenAI()

    return analyzeContext(client, schemas, this.model, language)
  }

  /**
   * Generates raw text response from AI.
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const client = this.requireOpenAI()

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful assistant.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    })

    return response.choices[0]?.message?.content || ''
  }

  /**
   * Sets and persists AI configuration.
   */
  setConfig(config: AIConfig) {
    const current = store.get('aiConfig') as AIConfig
    const newConfig = { ...current, ...config }
    console.log('[AI Service] setConfig', { current, newConfig })
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
    return !!this.openai
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