import Store from 'electron-store'
import { OpenAI } from 'openai'
import { BrowserWindow } from 'electron'
import { AsyncLocalStorage } from 'async_hooks'
import { callAIAndParse } from '../engine/ai-utils'
import {
  analyzeContext,
  fixSQL,
  generateAnalysis,
  generateInsight,
} from '../engine/ai-bridge'
import { analyzeSemantics as analyzeSemanticsEngine } from '../engine/semantic-engine'
import {
  METRIC_GEN_SYSTEM_PROMPT,
  getMetricGenUserPrompt,
} from '../engine/prompts'
import crypto from 'crypto'
import { secureGet, secureSet } from './secure-storage'
import { getAppUserAgent } from '../utils/env'
import { tokenManager } from './token-manager'
import { TokenActionType } from '../../shared/types/token-audit'
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
import { z } from 'zod'

// --- Security Config (Must match obfuscate-tool.js) ---
const MASTER_SALT = 'wansan-studio-2025-special-security-salt'

interface AuditContext {
  projectPath: string | null
  action: TokenActionType
  snapshot?: {
    table?: string
    column?: string
    row_count?: number
    prompt_preview?: string
  }
}

function decryptBuiltinKey(obfuscated: string): string {
  try {
    const [ivBase64, authTagBase64, encryptedBase64] = obfuscated.split(':')
    if (!encryptedBase64) return ''

    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')
    const key = crypto.pbkdf2Sync(MASTER_SALT, 'salt-pepper', 100000, 32, 'sha256')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    return decipher.update(encryptedBase64, 'base64', 'utf8') + decipher.final('utf8')
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

  // [V1.7] Audit Infrastructure
  private auditStore = new AsyncLocalStorage<AuditContext>()
  private auditedClient: OpenAI | null = null

  constructor() {
    this.initBuiltinConfig()
    this.loadConfig()
  }

  /**
   * Initializes a persistent proxied OpenAI client that reads audit context 
   * from AsyncLocalStorage automatically.
   */
  private initAuditedClient() {
    const base = this.requireOpenAI()

    const completionProxy = {
      get: (target: any, prop: string) => {
        if (prop !== 'create') return Reflect.get(target, prop)

        return async (...args: any[]) => {
          const response = await target.create(...args)
          const context = this.auditStore.getStore()

          if (response?.usage && context) {
            tokenManager.logTransaction(context.projectPath, {
              action: context.action,
              model: response.model || this.model,
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
              snapshot: context.snapshot || {
                prompt_preview: args[0]?.messages?.[1]?.content?.substring(0, 100),
              },
            }).catch(err => console.error('[Audit] Log failed', err))
          }
          return response
        }
      }
    }

    this.auditedClient = new Proxy(base, {
      get: (target, prop, receiver) => {
        if (prop === 'chat') {
          return new Proxy(target.chat, {
            get: (chatTarget, chatProp) => {
              if (chatProp === 'completions') {
                return new Proxy(chatTarget.completions, completionProxy)
              }
              return Reflect.get(chatTarget, chatProp)
            },
          })
        }
        return Reflect.get(target, prop, receiver)
      },
    })
  }

  /**
   * Wrapper to run an AI task within a specific audit context.
   */
  private async withAudit<T>(context: AuditContext, task: (client: OpenAI) => Promise<T>): Promise<T> {
    if (!this.auditedClient) this.initAuditedClient()
    return this.auditStore.run(context, () => task(this.auditedClient!))
  }

  public setBatchProcessor(processor: BatchProcessor) {
    this.batchProcessor = processor
  }

  private initBuiltinConfig() {
    const rawKey = process.env.VITE_BUILTIN_API_KEY
    if (!rawKey) return

    try {
      // 1. Decrypt (Production/CI)
      let apiKey = decryptBuiltinKey(rawKey)

      // 2. Base64 Fallback (Dev)
      if (!apiKey && !rawKey.includes(':')) {
        const decoded = Buffer.from(rawKey, 'base64').toString('utf-8')
        if (/^[a-zA-Z0-9_\-.]+$/.test(decoded)) apiKey = decoded
      }

      // 3. Raw Fallback
      apiKey = apiKey || rawKey

      const models = (process.env.VITE_BUILTIN_MODELS || '').split(',')

      this.builtinConfig = {
        apiKey,
        baseURL: process.env.VITE_BUILTIN_BASE_URL || '',
        model: models[0] || '',
        models,
        provider: 'custom',
        isManaged: true,
      }
      console.log(`[AI Service] Managed config loaded.`)
    } catch (e) {
      console.error('[AI Service] Failed to parse builtin config:', e)
    }
  }

  private loadConfig() {
    const stored = (store.get('aiConfig') as AIConfig) || {}
    
    // Priority: Builtin (Managed) > Stored > Runtime Env
    const effective: AIConfig = this.builtinConfig 
      ? { ...this.builtinConfig, model: stored.model || this.builtinConfig.model }
      : {
          apiKey: secureGet('apiKey') || process.env.OPENAI_API_KEY || '',
          baseURL: stored.baseURL || process.env.OPENAI_BASE_URL || '',
          model: stored.model || process.env.OPENAI_MODEL || '',
        }

    this.model = effective.model
    
    if (effective.apiKey) {
      this.openai = new OpenAI({
        apiKey: effective.apiKey,
        baseURL: effective.baseURL,
        defaultHeaders: { 'User-Agent': getAppUserAgent() },
      })
      this.initAuditedClient()
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

  async generatePlan(
    context: AIAnalysisContext,
    projectPath: string | null
  ): Promise<AIAnalysisResult> {
    const budget = tokenManager.checkBudget(0.05)
    if (!budget.allowed) throw new Error(budget.reason)

    return this.withAudit(
      {
        projectPath,
        action: 'data_analysis',
        snapshot: { prompt_preview: context.userQuery },
      },
      async client => {
        const aiResult = await generateAnalysis(client, context, this.model)
        return {
          status: aiResult.error ? 'error' : 'success',
          ...aiResult,
        }
      }
    )
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
    return this.withAudit(
      {
        projectPath,
        action: 'sql_fix',
        snapshot: {
          prompt_preview: `Error: ${error.substring(0, 100)}`,
          column: originalSql,
        },
      },
      client => fixSQL(client, originalSql, error, schemas, this.model, domainRules)
    )
  }

  async getContextAnalysis(
    schemas: TableSchema[],
    language: 'en' | 'zh' = 'en',
    projectPath: string | null
  ): Promise<ContextAnalysisResult> {
    return this.withAudit(
      {
        projectPath,
        action: 'context_analysis',
        snapshot: { prompt_preview: `Analyzing ${schemas.length} tables` },
      },
      client => analyzeContext(client, schemas, this.model, language)
    )
  }

  async analyzeSemantics(
    tableName: string,
    columns: ColumnSchema[],
    language: 'en' | 'zh' = 'zh',
    projectPath: string | null
  ) {
    const langName = language === 'zh' ? 'Chinese (Simplified)' : 'English'

    return this.withAudit(
      {
        projectPath,
        action: 'semantic_analyze',
        snapshot: {
          table: tableName,
          prompt_preview: `Inferring meanings for ${columns.length} columns`,
        },
      },
      client =>
        analyzeSemanticsEngine(client, this.model || 'gpt-4o', tableName, columns, langName)
    )
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

    return this.withAudit(
      { projectPath, action: 'metric_gen', snapshot: { prompt_preview: input } },
      async client => {
        const columnList = columns.map(c => `- ${c.name} (${c.type})`).join('\n')
        const systemPrompt = METRIC_GEN_SYSTEM_PROMPT(columnList)
        const userPrompt = getMetricGenUserPrompt(input, mode)

        const response = await client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0,
        })

        return response.choices[0].message.content?.trim() || ''
      }
    )
  }

  /**
   * Generate natural language insight from aggregated chart data.
   * This is part of the AI Insight feature with explicit user consent.
   */
  async generateChartInsight(
    context: InsightGenerationContext,
    projectPath: string | null
  ): Promise<any> {
    return this.withAudit(
      {
        projectPath,
        action: 'insight_gen',
        snapshot: { prompt_preview: context.chartTitle || context.chartType },
      },
      client => {
        // Ensure default values if not provided in context
        const enrichedContext = {
          ...context,
          language: context.language || 'en',
          domainRules: context.domainRules || [],
        }
        return generateInsight(client, enrichedContext, this.model)
      }
    )
  }

  // [V1.7] Preview Extraction
  async previewExtraction(
    inputData: any[],
    prompt: string,
    projectPath: string | null
  ): Promise<{ results: string[]; usage?: { input: number; output: number } }> {
    return this.withAudit(
      { projectPath, action: 'batch_extract', snapshot: { prompt_preview: prompt } },
      async client => {
        const inputsStr = inputData.map((v, i) => `${i + 1}. ${String(v)}`).join('\n')
        const systemPrompt = `You are a data extraction engine. Process inputs and return a JSON object with a "results" key containing an array of strings matching the input order. Format: { "results": ["Result1", "Result2"] }`
        const userPrompt = `Instruction: ${prompt}\n\nInputs:\n${inputsStr}`

        try {
          const { data, usage } = await callAIAndParse(client, {
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0,
            response_format: { type: 'json_object' }
          }, z.object({ results: z.array(z.string()) }))

          return { 
            results: data.results, 
            usage: usage ? { input: usage.prompt_tokens, output: usage.completion_tokens } : undefined 
          }
        } catch (e) {
          console.error('[AI Service] Failed to parse extraction preview', e)
          return { results: [] }
        }
      }
    )
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
