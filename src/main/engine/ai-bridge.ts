import { OpenAI } from 'openai'
import {
  AIAnalysisContext,
  ContextAnalysisResult,
  DomainRule,
  TableSchema,
} from '@shared/types.ts'
import {
  AnalysisResult,
  AnalysisResultSchema,
  ContextAnalysisResultSchema,
  FixSQLResultSchema,
  InsightResultSchema,
} from '@shared/schemas/analysis.ts'
import {
  CONTEXT_ANALYSIS_SYSTEM_PROMPT,
  getAnalysisSystemPrompt,
  getFixSystemPrompt,
  serializeSchemas,
} from './prompts.ts'
import { isDev } from '../utils/env'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources'
import { parse } from '@shared/serialization.ts'
import { extractJSON } from '@shared/utils/json-utils'
import { autospaceInsight } from '@shared/utils/autospace'
import { InsightGenerationContext, InsightResult } from '@shared/types/dashboard'
import { ZodSchema } from 'zod'

function getModelToUse(preferredModel?: string) {
  const envModel = process.env.OPENAI_MODEL
  if (isDev()) {
    console.log('[AI Bridge] getModelToUse debug:', {
      preferredModel,
      envModel,
      allEnvKeys: Object.keys(process.env).filter(k => k.startsWith('OPENAI')),
    })
  }
  return preferredModel || envModel || 'gpt-4-turbo-preview'
}

/**
 * Universal helper to call OpenAI and parse/validate the response.
 */
async function callAIAndParse<T>(
  openai: OpenAI,
  body: ChatCompletionCreateParamsNonStreaming,
  schema: ZodSchema<T>
): Promise<T> {
  if (isDev()) {
    console.log('[AI Bridge] Request Body:', JSON.stringify(body, null, 2))
  }

  const response = await openai.chat.completions.create(body)
  const resultJson = response.choices[0].message.content

  if (!resultJson) {
    throw new Error('AI returned an empty response.')
  }

  if (isDev()) {
    console.log('[AI Bridge] Raw Response:', resultJson)
  }

  try {
    const cleanedJson = extractJSON(resultJson)
    const parsedResult = parse(cleanedJson)
    return schema.parse(parsedResult)
  } catch (error) {
    console.error('Failed to parse or validate AI response:', error)
    throw new Error(
      `AI returned invalid JSON or structure. Raw response: ${resultJson}`
    )
  }
}

export async function generateAnalysis(
  openai: OpenAI,
  context: AIAnalysisContext,
  model?: string
): Promise<AnalysisResult> {
  const {
    userQuery,
    schemas,
    prevContext,
    language = 'en',
    domainRules = [],
    suggestionCount = 3,
  } = context

  const schemaContext = serializeSchemas(schemas)
  const currentDate = new Date().toISOString().split('T')[0]

  // [NEW] Aggregate relationships from all schemas
  const allRelations = schemas.flatMap(s => s.relations || [])

  const relationsContext =
    allRelations.length > 0
      ? allRelations
          .map(
            r =>
              `- Table "${r.sourceTable}" can act as Fact Table, joining to Dimension Table "${r.targetTable}" via: ON "${r.sourceTable}"."${r.sourceColumn}" = "${r.targetTable}"."${r.targetColumn}"`
          )
          .join('\n')
      : 'No specific relationships defined. Infer joins if necessary based on column names.'

  let contextSection = ''
  if (prevContext && prevContext.lastSql && prevContext.lastQuery) {
    contextSection = `
### 🕒 PREVIOUS CONTEXT
Last Query: "${prevContext.lastQuery}"
Last SQL: "${prevContext.lastSql.replace(/\s+/g, ' ').trim()}"`
  }

  const userPrompt = `### 📅 CONTEXT
Current Date: ${currentDate}

### 📂 DATABASE SCHEMA
The following tables are available in the local DuckDB instance:

${schemaContext}

### 🔗 KNOWN RELATIONSHIPS (HINT FOR JOINING)
Use these valid relationships to join tables if the user query requires data from multiple sources.
${relationsContext}${contextSection}
### 👤 USER QUESTION
"${userQuery}"

### 🤖 YOUR RESPONSE (JSON)`

  const languageNote = language === 'zh' ? 'Chinese (Simplified)' : 'English'

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: getModelToUse(model),
    messages: [
      {
        role: 'system',
        content: `${getAnalysisSystemPrompt(domainRules, language, suggestionCount)}

OUTPUT RULE:
1. The "summary", "title", "reasoning", and "suggestions" fields MUST be in ${languageNote}.
2. **CRITICAL**: DO NOT mention "Smart Filter" or any technical internal mechanisms in the "reasoning" field. Focus on business logic and data interpretation for the end user.`,
      },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  }

  return await callAIAndParse(openai, body, AnalysisResultSchema)
}

/**
 * Analyze multiple table schemas to deduce relationships and starter prompts.
 */
export async function analyzeContext(
  openai: OpenAI,
  schemas: TableSchema[],
  model?: string,
  language: 'en' | 'zh' = 'en'
): Promise<ContextAnalysisResult> {
  const schemaContext = serializeSchemas(schemas)
  const languageNote = language === 'zh' ? 'Chinese (Simplified)' : 'English'

  const userPrompt = `### 📂 DATABASE SCHEMA
The following table schemas are available. Please analyze them.

${schemaContext}

### 🤖 YOUR RESPONSE (JSON)
`

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: getModelToUse(model),
    messages: [
      {
        role: 'system',
        content: `${CONTEXT_ANALYSIS_SYSTEM_PROMPT}

OUTPUT RULE:
1. The "suggestedPrompts" MUST be written in ${languageNote}.
2. The "reason" field in "relationships" and "metrics" MUST be written in ${languageNote}.`,
      },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  }

  return await callAIAndParse(openai, body, ContextAnalysisResultSchema)
}

export async function fixSQL(
  openai: OpenAI,
  originalSql: string,
  errorMessage: string,
  schemas: TableSchema[],
  model?: string,
  domainRules: DomainRule[] = []
): Promise<{ sql: string; reasoning: string }> {
  const schemaContext = serializeSchemas(schemas)

  const systemPrompt = `You are a DuckDB SQL Repair Expert.
Your goal is to FIX a broken SQL query based on the error message and table schema.

Additional Context:
${getFixSystemPrompt(domainRules)}

OUTPUT: JSON object { 
  "sql": "FIXED_SQL", 
  "reasoning": "Brief explanation of the fix (supplementary to the original plan)",
  "is_template": boolean, // (Optional) Set to true if using placeholders
  "missing_params": [ { "placeholder": "...", "label": "...", "column": "...", "table": "...", "hint": "..." } ] // (Optional) Parameters if is_template is true
}`

  const userPrompt = `### 📂 SCHEMA
${schemaContext}

### ❌ BROKEN SQL
${originalSql}

### ⚠️ ERROR MESSAGE
${errorMessage}

### 🛠️ TASK
Fix the SQL. Ensure all table/column names are double-quoted and match the schema exactly.`

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: getModelToUse(model),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  }

  return await callAIAndParse(openai, body, FixSQLResultSchema)
}

/**
 * Smartly downsamples data to a target limit while preserving critical points.
 * - Always keeps start and end points.
 * - Keeps global max/min points for value columns.
 * - Uniformly samples the rest.
 */
function smartDownsample(
  data: any[],
  limit: number,
  valueKeys: string[] = []
): any[] {
  if (data.length <= limit) return data

  const indices = new Set<number>()
  const len = data.length

  // 1. Always keep start and end
  indices.add(0)
  indices.add(len - 1)

  // 2. Keep extremes (Max/Min) for value columns
  if (valueKeys.length > 0) {
    valueKeys.forEach(key => {
      let minVal = Infinity
      let maxVal = -Infinity
      let minIdx = -1
      let maxIdx = -1

      for (let i = 0; i < len; i++) {
        const val = Number(data[i][key])
        if (!isNaN(val)) {
          if (val < minVal) {
            minVal = val
            minIdx = i
          }
          if (val > maxVal) {
            maxVal = val
            maxIdx = i
          }
        }
      }

      if (minIdx !== -1) indices.add(minIdx)
      if (maxIdx !== -1) indices.add(maxIdx)
    })
  }

  // 3. Fill remaining slots uniformly
  const currentCount = indices.size
  const needed = limit - currentCount
  if (needed > 0) {
    // Distribute remaining points across the array
    const step = len / (needed + 1)
    for (let i = 1; i <= needed; i++) {
      const idx = Math.floor(i * step)
      if (idx > 0 && idx < len - 1) {
        indices.add(idx)
      }
    }
  }

  // 4. Sort indices and map back to data
  return Array.from(indices)
    .sort((a, b) => a - b)
    .map(i => data[i])
}

/**
 * Generate a natural language insight/explanation from aggregated chart data.
 * This function receives ONLY aggregated data (not raw rows) after user consent.
 */
export async function generateInsight(
  openai: OpenAI,
  context: InsightGenerationContext,
  model?: string
): Promise<InsightResult> {
  const {
    chartTitle,
    chartType,
    aggregatedData,
    language = 'en',
    domainRules = [],
    userInstructions,
    sql,
    vizConfig,
    summary,
  } = context

  const languageNote = language === 'zh' ? 'Chinese (Simplified)' : 'English'

  // Identify value keys for smart downsampling
  // Strategy: Union of configured Y-axes AND all detected numeric columns to ensure we catch all series extremes
  const detectedNumericKeys =
    aggregatedData.length > 0
      ? Object.keys(aggregatedData[0]).filter(
          k => typeof aggregatedData[0][k] === 'number'
        )
      : []

  let configKeys: string[] = []
  if (vizConfig?.y_axis) {
    configKeys = Array.isArray(vizConfig.y_axis)
      ? vizConfig.y_axis
      : [vizConfig.y_axis]
  }

  const valueKeys = Array.from(new Set([...configKeys, ...detectedNumericKeys]))

  // Use smart downsampling to preserve peaks/valleys/start/end
  const sampledData = smartDownsample(aggregatedData, 100, valueKeys)
  const dataStr = JSON.stringify(sampledData, null, 2)

  // Build domain context section
  const domainContext =
    domainRules.length > 0
      ? `\n\n### BUSINESS CONTEXT / DOMAIN KNOWLEDGE:\n${domainRules
          .filter(r => r.isEnabled)
          .map((r, i) => `[Rule #${i + 1}]\n${r.content}`)
          .join('\n\n')}`
      : ''

  const systemPrompt = `You are a Senior Business Analyst specializing in data storytelling.
Your task is to analyze aggregated chart data and provide actionable business insights in structured JSON format.${domainContext}

CONSTRAINTS:
- Be concise and professional.
- **Balanced Analysis**: Actively look for BOTH **positive anomalies** (e.g., spikes, rapid growth, exceeding targets) AND **negative anomalies** (e.g., drops, underperformance, risks). Do not focus only on problems.
- Focus on trends, anomalies, and actionable recommendations.
- Write content in ${languageNote}.
- **CRITICAL**: For each finding, identify the EXACT X-axis category names from the data that support the finding (e.g., specific months, regions).
- **Sentiment**: Use one of the following specific types: 'positive', 'negative', 'neutral', 'warning' (for risks), 'growth' (for opportunities), 'discovery' (for insights), 'target' (for goals), 'info'.

OUTPUT FORMAT (JSON):
{
  "summary": "One sentence describing the overall trend.",
  "findings": [
    {
      "id": "1",
      "markdown": "**March** traffic surged by 30%...",
      "sentiment": "growth",
      "relatedItems": ["Mar"] // Must match data keys exactly
    },
    {
      "id": "2",
      "markdown": "**February** sales dropped by 15%...",
      "sentiment": "negative",
      "relatedItems": ["Feb"] // Must match data keys exactly
    }
  ],
  "recommendation": "One actionable suggestion (optional)"
}`

  let userPrompt = `### Chart Title
${chartTitle}

### Visualization Type
${chartType}`

  if (summary) {
    userPrompt += `\n\n### Analysis Summary (Context)\n${summary}`
  }

  if (vizConfig) {
    const { x_axis, y_axis, series_name } = vizConfig
    const configDesc = [
      x_axis ? `- X-Axis (Dimension): ${x_axis}` : '',
      y_axis
        ? `- Y-Axis (Metric): ${Array.isArray(y_axis) ? y_axis.join(', ') : y_axis}`
        : '',
      series_name ? `- Series: ${series_name}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    if (configDesc) {
      userPrompt += `\n\n### Visualization Config\n${configDesc}`
    }
  }

  if (sql) {
    userPrompt += `\n\n### SQL Query (Context)\n${sql}`
  }

  userPrompt += `\n\n### Aggregated Data (${aggregatedData.length} points)\n${dataStr}`

  if (userInstructions && userInstructions.trim()) {
    userPrompt += `

### 💡 SPECIFIC INSTRUCTIONS
The user has provided the following guidance for this analysis:
"${userInstructions}"
Please prioritize these instructions.`
  }

  userPrompt += `

### Your Analysis (JSON)`

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: getModelToUse(model),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  }

  const result = await callAIAndParse(openai, body, InsightResultSchema)

  return autospaceInsight(result)
}

