import Store from 'electron-store'
import { OpenAI } from 'openai'
import type { ClientOptions } from 'openai'
import { generateAnalysis, analyzeContext } from '../engine/ai-bridge'
import crypto from 'crypto'
import { secureGet, secureSet } from './secure-storage'
import type {
  TableSchema,
  AIAnalysisResult,
  RelationSuggestion,
  ContextAnalysisResult,
  AIConfig,
  DomainRule,
} from '@shared/types.ts'

// --- Security Config (Must match obfuscate-tool.js) ---
const MASTER_SALT = 'wansan-studio-2025-special-security-salt'

function decryptBuiltinKey(obfuscated: string): string {
  try {
    const parts = obfuscated.split(':')
    if (parts.length !== 3) return '' // Invalid format

    const [ivBase64, authTagBase64, encryptedBase64] = parts
    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')

    // Derive same key
    const key = crypto.pbkdf2Sync(
      MASTER_SALT,
      'salt-pepper',
      100000,
      32,
      'sha256'
    )

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (e) {
    console.error('[AI Service] Decryption failed:', e)
    return ''
  }
}

// Define schema for electron-store (Exclude apiKey from file storage)
const schema = {
  aiConfig: {
    type: 'object',
    properties: {
      baseURL: { type: 'string' },
      model: { type: 'string' },
    },
    default: {},
  },
} as const

const store = new Store({
  schema,
  name: 'wansan-ai-config', // 独立文件 wansan-ai-config.json
  encryptionKey: 'wansan-studio-secure-config-key',
})

export class AIService {
  private openai: OpenAI | null = null
  private model = 'gpt-4-turbo-preview'

  // Internal cache for sensitive builtin config
  private builtinConfig: AIConfig | null = null

  constructor() {
    this.initBuiltinConfig()
    this.loadConfig()
  }

  private initBuiltinConfig() {
    try {
      const provider = process.env.VITE_BUILTIN_PROVIDER
      const baseUrl = process.env.VITE_BUILTIN_BASE_URL
      const rawKey = process.env.VITE_BUILTIN_API_KEY
      const models = process.env.VITE_BUILTIN_MODELS

      if (rawKey && provider) {
        // 1. Try decrypting with AES-GCM (for production/CI)
        let apiKey = decryptBuiltinKey(rawKey)

        // 2. Fallback: If decryption fails (returns empty string), try Base64 (for simpler dev setups)
        if (!apiKey && !rawKey.includes(':')) {
          try {
            const decoded = Buffer.from(rawKey, 'base64').toString('utf-8')
            if (/^[a-zA-Z0-9_\-\.]+$/.test(decoded)) {
              apiKey = decoded
            }
          } catch {
            /* ignore */
          }
        }

        // 3. Fallback: Use raw key if all else fails
        if (!apiKey) {
          apiKey = rawKey
        }

        this.builtinConfig = {
          apiKey,
          baseURL: baseUrl || '',
          model: models?.split(',')[0] || 'gpt-4-turbo-preview',
          isManaged: true,
        }
        console.log(`[AI Service] Managed config detected: ${provider}`)
      }
    } catch (e) {
      console.error('[AI Service] Failed to parse builtin config:', e)
    }
  }

  private loadConfig() {
    const storedConfig = (store.get('aiConfig') as AIConfig) || {}

    // Determine priority: Builtin (Managed) > Stored > Runtime Env > Default
    let effectiveConfig: AIConfig = {}

    if (this.builtinConfig) {
      effectiveConfig = { ...this.builtinConfig }
    } else {
      // Securely retrieve API Key from system keychain
      const secureKey = secureGet('apiKey') || ''

      effectiveConfig = {
        apiKey: secureKey || process.env.OPENAI_API_KEY,
        baseURL: storedConfig.baseURL || process.env.OPENAI_BASE_URL,
        model:
          storedConfig.model ||
          process.env.OPENAI_MODEL ||
          'gpt-4-turbo-preview',
      }
    }

    this.model = effectiveConfig.model || 'gpt-4-turbo-preview'

    if (effectiveConfig.apiKey) {
      const options: ClientOptions = {
        apiKey: effectiveConfig.apiKey,
        baseURL: effectiveConfig.baseURL,
      }
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

  async fixQuery(
    originalSql: string,
    error: string,
    schemas: TableSchema[],
    domainRules: DomainRule[] = []
  ): Promise<{ sql: string; reasoning: string }> {
    const { fixSQL } = await import('../engine/ai-bridge')
    const client = this.requireOpenAI()
    return fixSQL(client, originalSql, error, schemas, this.model, domainRules)
  }

  async getContextAnalysis(
    schemas: TableSchema[],
    language: 'en' | 'zh' = 'en'
  ): Promise<ContextAnalysisResult> {
    const client = this.requireOpenAI()
    return analyzeContext(client, schemas, this.model, language)
  }

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
   * API Key is saved to Secure Storage; others to Electron Store.
   */
  setConfig(config: AIConfig) {
    if (this.builtinConfig) {
      console.warn(
        '[AI Service] Attempted to override Managed Config. Action ignored.'
      )
      return
    }

    const current = (store.get('aiConfig') as AIConfig) || {}
    const { apiKey, ...otherConfig } = config

    // 1. Save Key to Secure Storage
    if (apiKey !== undefined) {
      secureSet('apiKey', apiKey)
    }

    // 2. Save other config to Electron Store
    const newConfig = { ...current, ...otherConfig }
    store.set('aiConfig', newConfig)

    this.loadConfig()
  }

  getConfig(): AIConfig {
    if (this.builtinConfig) {
      return {
        ...this.builtinConfig,
        apiKey: '********************',
      }
    }

    const storedConfig = (store.get('aiConfig') as AIConfig) || {}
    const secureKey = secureGet('apiKey') || ''

    return {
      apiKey: secureKey,
      baseURL: storedConfig.baseURL || '',
      model: storedConfig.model || 'gpt-4-turbo-preview',
    }
  }

  hasApiKey(): boolean {
    return !!this.openai
  }

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
2. Return **ONLY** the SQL expression, DO NOT use "SELECT", "FROM", or "AS".
3. Use the EXACT column names provided above.
4. Handle NULLs if appropriate (e.g. COALESCE).
5. If division is involved, use "NULLIF(col, 0)" to prevent errors.
6. NO Markdown, NO explanations.
`

    let systemPrompt = ''
    if (mode === 'generate') {
      systemPrompt = `You are a DuckDB SQL Formula Generator.\nTask: Create a SQL expression based on the user's intended metric name.\n\n### AVAILABLE COLUMNS:\n${columnList}\n\n${quotingRule}`
    } else {
      systemPrompt = `You are a SQL Refinement Agent.\nThe user input contains existing SQL mixed with natural language instructions.\nTask: Update or complete the SQL logic based on the text.\n\n### AVAILABLE COLUMNS:\n${columnList}\n\n${quotingRule}`
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
    result = result
      .replace(/^```sql/, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim()
    return result
  }

  clearConfig() {
    if (this.builtinConfig) return
    store.clear()
    secureSet('apiKey', '')
    this.loadConfig()
  }
}
