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
   * Generates a SQL expression for a smart metric based on a natural language description.
   */
  async generateMetricExpression(options: {
    input: string
    columns: { name: string; type: string }[]
    mode: 'generate' | 'refine'
  }): Promise<string> {
    const { input, columns, mode } = options
    const client = this.requireOpenAI()

    const columnList = columns.map(c => `- ${c.name} (${c.type})`).join('\n')

    const quotingRule = `
CRITICAL SYNTAX RULES:
1. **ALWAYS** wrap column names in DOUBLE QUOTES ("). 
   - Example: "Sales", "Total Cost", "毛利率".
   - NEVER output raw identifiers like sales or cost.
2. Return **ONLY** the SQL expression, DO NOT use "SELECT", "FROM", or "AS".                                                                                  │
3. Use the EXACT column names provided above.                                                                             │
4. Handle NULLs if appropriate (e.g. COALESCE).                                                                           │
5. If division is involved, use "NULLIF(col, 0)" to prevent errors.
6. Handle NULLs and Division by Zero safely (e.g. NULLIF(col, 0)).
7. NO Markdown, NO explanations.
`

    let systemPrompt = ''

    if (mode === 'generate') {
      systemPrompt = `
You are a DuckDB SQL Formula Generator.
Task: Create a SQL expression based on the user's intended metric name.

### AVAILABLE COLUMNS:
${columnList}

${quotingRule}

### EXAMPLE:
Input: "Gross Profit"
Columns: [sales, cost]
Output: "sales" - "cost"
`
    } else {
      systemPrompt = `
You are a SQL Refinement Agent.
The user input contains existing SQL mixed with natural language instructions.
Task: Update or complete the SQL logic based on the text.

### AVAILABLE COLUMNS:
${columnList}

${quotingRule}

### EXAMPLE:
Input: "\\"price\\" * \\"qty\\" minus tax"
Output: "price" * "qty" - "tax"
`
    }

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      temperature: 0.1,
    })

    let result = response.choices[0]?.message?.content || ''

    // Cleanup: Remove any potential markdown backticks
    result = result
      .replace(/^```sql/, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim()

    return result
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
