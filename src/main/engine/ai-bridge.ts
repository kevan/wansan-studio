import { OpenAI } from 'openai'
import {
  AIAnalysisContext,
  ContextAnalysisResult,
  DomainRule,
  RelationSuggestion,
  TableSchema,
} from '@shared/types.ts'
import {
  AnalysisResult,
  AnalysisResultSchema,
  ContextAnalysisResultSchema,
  FixSQLResultSchema,
} from '@shared/schemas/analysis.ts'
import {
  CONTEXT_ANALYSIS_SYSTEM_PROMPT,
  getSystemPrompt,
  serializeSchemas,
} from './prompts.ts'
import { isDev } from '../utils/env'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources'
import { parse, safeStringify } from '@shared/serialization.ts'
import { extractJSON } from '@shared/utils/json-utils'
import { autospaceInsight } from '@shared/utils/autospace'
import { InsightGenerationContext } from '@shared/types/dashboard'

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

export async function generateAnalysis(
  openai: OpenAI,
  context: AIAnalysisContext,
  model?: string
): Promise<AnalysisResult> {
  const {
    userQuery,
    schemas,
    relations,
    prevContext,
    language = 'en',
    domainRules = [],
    suggestionCount = 3
  } = context

  if (isDev()) {
    console.log(
      'generateAnalysis pre request - schemas:',
      safeStringify(schemas, 2)
    )
    console.log('generateAnalysis context:', prevContext)
  }
  const schemaContext = serializeSchemas(schemas)
  const currentDate = new Date().toISOString().split('T')[0]

  const relationsContext =
    relations.length > 0
      ? relations
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
  const modelToUse = getModelToUse(model)

  const languageNote = language === 'zh' ? 'Chinese (Simplified)' : 'English'

  const body: ChatCompletionCreateParamsNonStreaming = {
    model: modelToUse,
    messages: [
      {
        role: 'system',
        content: `${getSystemPrompt(domainRules, language, suggestionCount)}

OUTPUT RULE:
1. The "summary", "title", "reasoning", and "suggestions" fields MUST be in ${languageNote}.
2. **CRITICAL**: DO NOT mention "Smart Filter" or any technical internal mechanisms in the "reasoning" field. Focus on business logic and data interpretation for the end user.`,
      },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  }
  if (isDev()) {
    console.log('generateAnalysis pre request - body', body)
  }
  const response = await openai.chat.completions.create(body)

  const resultJson = response.choices[0].message.content
  if (!resultJson) {
    throw new Error('AI returned an empty response.')
  }
  if (isDev()) {
    console.log('generateAnalysis post request - resultJson:', resultJson)
  }

  try {
    const cleanedJson = extractJSON(resultJson)
    const parsedResult = parse(cleanedJson)
    return AnalysisResultSchema.parse(parsedResult)
  } catch (error) {
    console.error('Failed to parse or validate AI response:', error)
    throw new Error(
      `AI returned invalid JSON or structure. Raw response: ${resultJson}`
    )
  }
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
  if (isDev()) {
    console.log(
      'analyzeContext pre request - schemas:',
      safeStringify(schemas, 2)
    )
  }

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

OUTPUT RULE: The "suggestedPrompts" MUST be written in ${languageNote}.`,
      },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  }
  if (isDev()) {
    console.log('analyzeContext pre request - body', body)
  }

  const response = await openai.chat.completions.create(body)

  const resultJson = response.choices[0].message.content
  if (!resultJson) {
    throw new Error('AI returned an empty response for context analysis.')
  }
  if (isDev()) {
    console.log('analyzeContext post request - resultJson:', resultJson)
  }

  try {
    const cleanedJson = extractJSON(resultJson)
    const rawResult = parse(cleanedJson)
    return ContextAnalysisResultSchema.parse(rawResult)
  } catch (error) {
    console.error(
      'Failed to parse or validate AI response for context analysis:',
      error
    )
    throw new Error(
      `AI returned invalid JSON or structure for context analysis. Raw response: ${resultJson}`
    )
  }
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
${getSystemPrompt(domainRules)}

OUTPUT: JSON object { "sql": "FIXED_SQL", "reasoning": "Brief explanation of the fix (supplementary to the original plan)" }`

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
  if (isDev()) {
    console.log('fixSQL pre request - body', body)
  }

  const response = await openai.chat.completions.create(body)
  const resultJson = response.choices[0].message.content

  if (!resultJson) throw new Error('AI returned empty response for SQL fix')
  if (isDev()) {
    console.log('fixSQL post request - resultJson:', resultJson)
  }
  try {
    const cleanedJson = extractJSON(resultJson)
    return FixSQLResultSchema.parse(parse(cleanedJson))
  } catch (e) {
    throw new Error(`Failed to parse fix result: ${resultJson}`)
  }
}

/**
 * Generate a natural language insight/explanation from aggregated chart data.
 * This function receives ONLY aggregated data (not raw rows) after user consent.
 */
export async function generateInsight(
  openai: OpenAI,
  context: InsightGenerationContext,
  model?: string
): Promise<any> {
  const {
    chartTitle,
    chartType,
    aggregatedData,
    language = 'en',
    domainRules = [],
    userInstructions,
    sql,
    vizConfig,
    summary
  } = context

  const languageNote = language === 'zh' ? 'Chinese (Simplified)' : 'English'

  // Convert data to a compact representation
  const dataStr = JSON.stringify(aggregatedData.slice(0, 50), null, 2)

  // Build domain context section
  const domainContext = domainRules.length > 0
    ? `\n\nBUSINESS CONTEXT:\n${domainRules.filter(r => r.isEnabled).map(r => `- ${r.content}`).join('\n')}`
    : ''

  const systemPrompt = `You are a Senior Business Analyst specializing in data storytelling.
Your task is to analyze aggregated chart data and provide actionable business insights in structured JSON format.${domainContext}

CONSTRAINTS:
- Be concise and professional.
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
      y_axis ? `- Y-Axis (Metric): ${Array.isArray(y_axis) ? y_axis.join(', ') : y_axis}` : '',
      series_name ? `- Series: ${series_name}` : ''
    ].filter(Boolean).join('\n')
    
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

  if (isDev()) {
    console.log('generateInsight pre request - body', body)
  }

  const response = await openai.chat.completions.create(body)
  const resultJson = response.choices[0].message.content

  if (!resultJson) {
    throw new Error('AI returned empty response for insight generation')
  }

  if (isDev()) {
    console.log('generateInsight post request - result:', resultJson)
  }

  try {
    const cleanedJson = extractJSON(resultJson)
    const rawResult = parse(cleanedJson)
    // Apply autospace for better Chinese-English mixed text typography
    return autospaceInsight(rawResult)
  } catch (error) {
    console.error('Failed to parse AI insight JSON:', error)
    throw new Error(`AI returned invalid JSON for insight: ${resultJson}`)
  }
}