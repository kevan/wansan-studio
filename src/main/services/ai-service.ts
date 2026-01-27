import Store from 'electron-store'
import type { ClientOptions } from 'openai'
import { OpenAI } from 'openai'
import { BrowserWindow } from 'electron'
import {
  analyzeContext,
  fixSQL,
  generateAnalysis,
  generateInsight,
} from '../engine/ai-bridge'
import { analyzeSemantics as analyzeSemanticsEngine } from '../engine/semantic-engine'
import crypto from 'crypto'
import { secureGet, secureSet } from './secure-storage'
import { getAppUserAgent } from '../utils/env'
import { tokenManager } from './token-manager'
import type {
  AIAnalysisContext,
  AIAnalysisResult,
  AIConfig,
  ColumnSchema,
  ContextAnalysisResult,
  DomainRule,
  TableSchema,
} from '@shared/types.ts'
import { InsightGenerationContext } from '@shared/types/dashboard'
import { BatchProcessor } from './batch-processor'

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
  private batchProcessor: BatchProcessor | null = null

  constructor() {
    this.initBuiltinConfig()
    this.loadConfig()
  }

  public setBatchProcessor(processor: BatchProcessor) {
    this.batchProcessor = processor
  }

  private initBuiltinConfig() {
    try {
      const baseUrl = process.env.VITE_BUILTIN_BASE_URL
      const rawKey = process.env.VITE_BUILTIN_API_KEY
      const models = process.env.VITE_BUILTIN_MODELS

      if (rawKey) {
        // 1. Try decrypting with AES-GCM (for production/CI)
        let apiKey = decryptBuiltinKey(rawKey)
        // 2. Fallback: If decryption fails (returns empty string), try Base64 (for simpler dev setups)
        if (!apiKey && !rawKey.includes(':')) {
          try {
            const decoded = Buffer.from(rawKey, 'base64').toString('utf-8')
            if (/^[a-zA-Z0-9_\-.]+$/.test(decoded)) {
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
          model: models?.split(',')[0] || '',
          models: models?.split(',') || [],
          provider: 'custom',
          isManaged: true,
        }
        console.log(`[AI Service] Managed config loaded.`)
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
      // Allow overriding model from store if it exists
      if (storedConfig.model) {
        effectiveConfig.model = storedConfig.model
      }
    } else {
      // Securely retrieve API Key from system keychain
      const secureKey = secureGet('apiKey') || ''
      effectiveConfig = {
        apiKey: secureKey || process.env.OPENAI_API_KEY,
        baseURL: storedConfig.baseURL || process.env.OPENAI_BASE_URL,
        model: storedConfig.model || process.env.OPENAI_MODEL || '',
      }
    }
    this.model = effectiveConfig.model || ''
    if (effectiveConfig.apiKey) {
      const options: ClientOptions = {
        apiKey: effectiveConfig.apiKey,
        baseURL: effectiveConfig.baseURL,
        defaultHeaders: {
          'User-Agent': getAppUserAgent(),
        },
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

  async verifyConnection(config?: AIConfig): Promise<boolean> {
    let client: OpenAI
    if (config && config.apiKey) {
      // Use temporary client for verification if config provided
      client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })
    } else {
      client = this.requireOpenAI()
    }
    try {
      const response = await client.models.list()
      console.log(
        '[AI Service] Connection verified. Available models:',
        response.data.map(model => model.id).join(', ')
      )
      return true
    } catch (e) {
      console.error('[AI Service] Connection verification failed:', e)
      throw e
    }
  }

  async generatePlan(context: AIAnalysisContext, projectPath: string | null): Promise<AIAnalysisResult> {
    const client = this.requireOpenAI()
    
    // [V1.7] Token Audit - Pre-flight check (Optional/Estimated)
    // For chat, we don't block usually, but we could check hard limit.
    const budget = tokenManager.checkBudget(0.05) // Assume $0.05 buffer
    if (!budget.allowed) {
      throw new Error(budget.reason)
    }

    const aiResult = await generateAnalysis(client, context, this.model)
    
    // [V1.7] Log Usage
    const rawResult = aiResult as any
    if (rawResult.usage) {
      await tokenManager.logTransaction(projectPath, {
        action: 'chat',
        model: this.model,
        inputTokens: rawResult.usage.prompt_tokens || 0,
        outputTokens: rawResult.usage.completion_tokens || 0,
        snapshot: {
          prompt_preview: context.userQuery.substring(0, 100)
        }
      })
    }

    return {
      status: aiResult.error ? 'error' : 'success',
      ...aiResult,
    }
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
    })
    return response.choices[0].message.content || ''
  }

  async fixQuery(
    originalSql: string,
    error: string,
    schemas: TableSchema[],
    domainRules: DomainRule[] = [],
    projectPath: string | null
  ): Promise<{
    sql: string
    reasoning: string
    is_template?: boolean
    missing_params?: any[]
  }> {
    const client = this.requireOpenAI()
    const result = await fixSQL(
      client,
      originalSql,
      error,
      schemas,
      this.model,
      domainRules
    )

    // [V1.7] Log Usage
    // Note: fixSQL currently doesn't return usage in its signature.
    // We might need to update fixSQL signature or estimate here.
    // For now, assume fixSQL is upgraded or we just skip logging exact tokens until engine update.
    // However, to follow mandates, let's assume fixSQL returns usage or we update it later.
    // Since I cannot update engine/ai-bridge.ts in this Atomic call, I will add a TODO or try to patch if `result` has usage (it might if typed loosely).
    
    const rawResult = result as any
    if (rawResult.usage) {
       await tokenManager.logTransaction(projectPath, {
        action: 'sql_fix',
        model: this.model,
        inputTokens: rawResult.usage.prompt_tokens || 0,
        outputTokens: rawResult.usage.completion_tokens || 0,
        snapshot: {
          prompt_preview: `Fix SQL: ${originalSql.substring(0, 50)}`
        }
      })
    }

    return result
  }

  async getContextAnalysis(
    schemas: TableSchema[],
    language: 'en' | 'zh' = 'en',
    projectPath: string | null
  ): Promise<ContextAnalysisResult> {
    const client = this.requireOpenAI()
    const result = await analyzeContext(client, schemas, this.model, language)
    
    // [V1.7] Log Usage
    const rawResult = result as any
    if (rawResult.usage) {
        await tokenManager.logTransaction(projectPath, {
        action: 'chat', // Context analysis is part of chat prep
        model: this.model,
        inputTokens: rawResult.usage.prompt_tokens || 0,
        outputTokens: rawResult.usage.completion_tokens || 0,
        snapshot: {
            prompt_preview: 'Context Analysis'
        }
        })
    }
    return result
  }

  async analyzeSemantics(
    tableName: string,
    columns: ColumnSchema[],
    language: 'en' | 'zh' = 'zh',
    projectPath: string | null
  ) {
    if (!this.openai) throw new Error('AI not configured')

    const langName = language === 'zh' ? 'Chinese (Simplified)' : 'English'

    const result = await analyzeSemanticsEngine(
      this.openai,
      this.model || 'gpt-4o',
      tableName,
      columns,
      langName
    )

     // [V1.7] Log Usage
    const rawResult = result as any
    if (rawResult.usage) {
        await tokenManager.logTransaction(projectPath, {
        action: 'batch_extract', // Semantics is a form of extraction
        model: this.model,
        inputTokens: rawResult.usage.prompt_tokens || 0,
        outputTokens: rawResult.usage.completion_tokens || 0,
        snapshot: {
            table: tableName,
            prompt_preview: 'Semantic Analysis'
        }
        })
    }

    return result
  }

  setConfig(config: AIConfig) {
    const current = (store.get('aiConfig') as AIConfig) || {}
    const { apiKey, ...otherConfig } = config

    if (this.builtinConfig) {
      // In managed mode, only allow updating the model
      const { model } = otherConfig
      if (model) {
        store.set('aiConfig', { ...current, model })
        this.loadConfig()
      }
      return
    }

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
        model: this.model, // Ensure we return the active model
        apiKey: '********************',
      }
    }
    const storedConfig = (store.get('aiConfig') as AIConfig) || {}
    const secureKey = secureGet('apiKey') || ''
    return {
      apiKey: secureKey,
      baseURL: storedConfig.baseURL || '',
      model: storedConfig.model || '',
    }
  }

  getManagedConfig() {
    if (!this.builtinConfig) return null
    return {
      provider: this.builtinConfig.provider || 'custom',
      models: this.builtinConfig.models || [],
    }
  }

  hasApiKey(): boolean {
    return !!this.openai
  }

  async generateMetricExpression(options: {
    input: string
    columns: { name: string; type: string }[]
    mode: 'generate' | 'refine'
    projectPath: string | null
  }): Promise<string> {
    const { input, columns, mode, projectPath } = options
    const client = this.requireOpenAI()
    const columnList = columns.map(c => `- ${c.name} (${c.type})`).join('\n')
    const quotingRule = `
CRITICAL SYNTAX RULES:
1. **ALWAYS** wrap column names in DOUBLE QUOTES ( ").
2. For SQLite/DuckDB compatibility, use standard SQL operators.
3. **ONLY** generate ROW-LEVEL expressions (e.g., "A" + "B", "A" * 0.1).
4. **NEVER** use aggregate functions like SUM(), AVG(), COUNT(), MAX(), MIN(), etc.
`

    const systemPrompt = `You are a DuckDB expert. Convert user natural language into a valid ROW-LEVEL SQL expression fragment for a SELECT clause.
    Available columns in the current context:
    ${columnList}
    
    ${quotingRule}
    
    Return ONLY the SQL expression, no commentary, no 'SELECT', no 'AS'.`

    const userPrompt =
      mode === 'generate'
        ? `Create an expression for: ${input}`
        : `Refine this expression: ${input}`

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
    })

    const content = response.choices[0].message.content?.trim() || ''

    // [V1.7] Log Usage
    if (response.usage) {
        await tokenManager.logTransaction(projectPath, {
            action: 'chat',
            model: this.model,
            inputTokens: response.usage.prompt_tokens || 0,
            outputTokens: response.usage.completion_tokens || 0,
            snapshot: {
                prompt_preview: `Metric: ${input}`
            }
        })
    }

    return content
  }

  /**
   * Generate natural language insight from aggregated chart data.
   * This is part of the AI Insight feature with explicit user consent.
   */
  async generateChartInsight(context: InsightGenerationContext, projectPath: string | null): Promise<any> {
    const client = this.requireOpenAI()
    // Ensure default values if not provided in context (though Interface defines them as optional, engine handles them)
    const enrichedContext = {
      ...context,
      language: context.language || 'en',
      domainRules: context.domainRules || [],
    }
    const result = await generateInsight(client, enrichedContext, this.model)

    // [V1.7] Log Usage
    const rawResult = result as any
    if (rawResult.usage) {
        await tokenManager.logTransaction(projectPath, {
            action: 'insight_gen',
            model: this.model,
            inputTokens: rawResult.usage.prompt_tokens || 0,
            outputTokens: rawResult.usage.completion_tokens || 0,
            snapshot: {
                prompt_preview: `Insight for ${context.chartType}`
            }
        })
    }

    return result
  }

  // [V1.7] Preview Extraction
  async previewExtraction(
    inputData: any[],
    prompt: string,
    projectPath: string | null
  ): Promise<{ results: string[]; estimatedCost: number }> {
    const client = this.requireOpenAI()
    
    // Construct Prompt
    const inputsStr = inputData.map((v, i) => `${i + 1}. ${String(v)}`).join('\n')
    const sysPrompt = `You are a data extraction engine.
    Process the following list of inputs based on the user's instruction.
    
    Input Format:
    1. Value1
    2. Value2
    
    Output Format:
    Return ONLY a JSON array of strings, matching the order of inputs.
    Example: ["Result1", "Result2"]
    
    Handle NULLs or errors gracefully (e.g. return null or "N/A").`
    
    const userPrompt = `Instruction: ${prompt}\n\nInputs:\n${inputsStr}`
    
    // Pre-flight check (Optional)
    const estInputTokens = (prompt.length + inputsStr.length) / 4
    const estOutputTokens = estInputTokens // Rough guess
    const estimatedCost = tokenManager.calculateCost(this.model, estInputTokens, estOutputTokens)

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0
    })
    
    const content = response.choices[0].message.content || '[]'
    
    // Log Usage
    if (response.usage) {
        await tokenManager.logTransaction(projectPath, {
            action: 'batch_extract',
            model: this.model,
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            snapshot: {
                prompt_preview: `Preview: ${prompt}`
            }
        })
    }

    try {
      // Clean potential markdown code blocks
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim()
      const results = JSON.parse(jsonStr)
      if (Array.isArray(results)) {
        return { results, estimatedCost }
      }
      return { results: [], estimatedCost }
    } catch (e) {
      console.error('Failed to parse extraction preview', e)
      return { results: [], estimatedCost }
    }
  }

  // [V1.7] Start Batch Job
  async startBatchExtraction(
    tableName: string,
    columnName: string,
    targetColumnName: string,
    prompt: string,
    projectPath: string | null,
    window?: BrowserWindow
  ): Promise<{ jobId: string }> {
    if (!this.batchProcessor) throw new Error('Batch Processor not initialized')
    
    const jobId = 'job_' + Date.now()
    
    // Run in background (don't await)
    this.batchProcessor.runExtraction({
      tableName,
      columnName,
      targetColumnName,
      prompt,
      projectPath,
      window
    }).catch(err => {
      console.error(`[AIService] Batch job ${jobId} failed:`, err)
    })
    
    return { jobId }
  }

  clearConfig() {
    if (this.builtinConfig) return
    store.clear()
    secureSet('apiKey', '')
    this.loadConfig()
  }
}
