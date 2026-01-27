import Store from 'electron-store'
import path from 'path'
import fs from 'fs-extra'
import { v4 as uuidv4 } from 'uuid'
import { TokenBudgetConfig, TokenAuditLog, TokenTransaction } from '../../shared/types/token-audit'

// Schema for Global Token Settings
interface StoreType {
  dailyUsageUSD: number
  lastResetDate: string
  budgetConfig: TokenBudgetConfig
}

const storeSchema = {
  dailyUsageUSD: { type: 'number', default: 0 },
  lastResetDate: { type: 'string', default: '' }, // YYYY-MM-DD
  budgetConfig: {
    type: 'object',
    properties: {
      dailyHardLimitUSD: { type: 'number', default: 5.0 }, // $5.00 default hard limit
      projectSoftLimitUSD: { type: 'number', default: 1.0 }, // $1.00 warning threshold
      pricingOverrides: { type: 'array', default: [] }
    },
    default: {
      dailyHardLimitUSD: 5.0,
      projectSoftLimitUSD: 1.0,
      pricingOverrides: []
    }
  }
} as const

// Default Pricing (can be overridden by store)
const DEFAULT_PRICING = {
  'gpt-4o': { input: 2.5, output: 10.0 }, // per 1M tokens
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'deepseek-chat': { input: 0.14, output: 0.28 }, // Example cheap pricing
  'default': { input: 1.0, output: 3.0 }
}

export class TokenManager {
  private store: Store<StoreType>
  
  constructor() {
    this.store = new Store<StoreType>({
      name: 'wansan-token-audit',
      schema: storeSchema as any
    })
    this.checkDailyReset()
  }

  private checkDailyReset() {
    const today = new Date().toISOString().split('T')[0]
    const lastDate = this.store.get('lastResetDate') as string
    
    if (lastDate !== today) {
      this.store.set('dailyUsageUSD', 0)
      this.store.set('lastResetDate', today)
    }
  }

  public getBudgetConfig(): TokenBudgetConfig {
    return this.store.get('budgetConfig') as TokenBudgetConfig
  }

  public setBudgetConfig(config: Partial<TokenBudgetConfig>) {
    const current = this.getBudgetConfig()
    this.store.set('budgetConfig', { ...current, ...config })
  }

  public getDailyUsage(): number {
    this.checkDailyReset()
    return this.store.get('dailyUsageUSD') as number
  }

  /**
   * Pre-flight Check: Can we afford this operation?
   * @returns { allowed: boolean, reason?: string }
   */
  public checkBudget(estimatedCostUSD: number): { allowed: boolean, reason?: string } {
    this.checkDailyReset()
    const dailyUsage = this.getDailyUsage()
    const config = this.getBudgetConfig()
    
    if (dailyUsage + estimatedCostUSD > config.dailyHardLimitUSD) {
      return { 
        allowed: false, 
        reason: `Daily limit exceeded. Current: $${dailyUsage.toFixed(4)}, Attempt: $${estimatedCostUSD.toFixed(4)}, Limit: $${config.dailyHardLimitUSD}`
      }
    }
    
    return { allowed: true }
  }

  /**
   * Calculate cost based on model and tokens
   */
  public calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const config = this.getBudgetConfig()
    const overrides = config.pricingOverrides || []
    
    // 1. Check User Overrides
    const userPrice = overrides.find(p => p.modelId === model)
    if (userPrice) {
      return (inputTokens / 1_000_000 * userPrice.inputPricePer1M) + 
             (outputTokens / 1_000_000 * userPrice.outputPricePer1M)
    }

    // 2. Check Built-in Defaults
    // Fuzzy match model name (e.g. 'gpt-4o-2024-05-13' -> 'gpt-4o')
    const knownModels = Object.keys(DEFAULT_PRICING)
    const matchedKey = knownModels.find(k => model.startsWith(k)) || 'default'
    const price = DEFAULT_PRICING[matchedKey as keyof typeof DEFAULT_PRICING]

    return (inputTokens / 1_000_000 * price.input) + 
           (outputTokens / 1_000_000 * price.output)
  }

  /**
   * Commit a transaction: Update global usage AND write to project audit log
   */
  public async logTransaction(
    projectPath: string | null,
    transaction: Omit<TokenTransaction, 'id' | 'timestamp' | 'cost'> & { 
      inputTokens: number, 
      outputTokens: number 
    }
  ): Promise<TokenTransaction> {
    const costUSD = this.calculateCost(transaction.model, transaction.inputTokens, transaction.outputTokens)
    
    // 1. Update Global Stats
    this.checkDailyReset()
    const currentDaily = this.getDailyUsage()
    this.store.set('dailyUsageUSD', currentDaily + costUSD)

    // 2. Construct Record
    const record: TokenTransaction = {
      id: uuidv4(),
      timestamp: Date.now(),
      action: transaction.action,
      model: transaction.model,
      snapshot: transaction.snapshot,
      cost: {
        input_tokens: transaction.inputTokens,
        output_tokens: transaction.outputTokens,
        total_usd: costUSD,
        currency: 'USD'
      }
    }

    // 3. Write to Project Log (if project context exists)
    if (projectPath) {
      try {
        const auditPath = path.join(projectPath, '.wansan', 'audit.json')
        // Ensure .wansan dir exists (it should, but safety first)
        await fs.ensureDir(path.dirname(auditPath))
        
        let log: TokenAuditLog = { version: 1, transactions: [] }
        try {
          if (await fs.pathExists(auditPath)) {
            log = await fs.readJSON(auditPath)
          }
        } catch (e) {
          console.warn('[TokenManager] Failed to read audit log, starting fresh', e)
        }

        log.transactions.push(record)
        
        // Write back
        await fs.writeJSON(auditPath, log, { spaces: 2 })
      } catch (e) {
        console.error('[TokenManager] Failed to write project audit log', e)
        // We do NOT throw here, because the global charge succeeded. 
        // Failing to write local log shouldn't crash the app logic, but it is serious.
      }
    }

    return record
  }
}

export const tokenManager = new TokenManager()
