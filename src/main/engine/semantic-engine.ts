import { OpenAI } from 'openai'
import { ColumnSchema, ColumnSemantic } from '@shared/types'
import { isDev } from '../utils/env'
import { safeStringify } from '@shared/serialization'

/**
 * AI Powered Semantic Analysis Engine
 * Uses LLM to infer column meanings and generate aliases.
 */
export async function analyzeSemantics(
  client: OpenAI,
  model: string,
  tableName: string,
  columns: ColumnSchema[],
  language: string = 'Chinese (Simplified)'
): Promise<Record<string, ColumnSemantic>> {
  // Use existing sample values from ColumnSchema
  const columnContext = columns.map((col) => {
    return {
      name: col.name,
      type: col.type,
      samples: col.sampleValues?.slice(0, 5) || []
    }
  })

  const systemPrompt = `You are a Data Analyst and Business Intelligence expert. 
Your task is to analyze a database table schema and sample data to provide semantic metadata.

For each column, you must:
1. Infer its business meaning (Description). **IMPORTANT**: The description MUST be in ${language}.
2. Suggest 2-3 natural language synonyms/aliases in ${language}.
3. Assign a high-level Business Category: ID, Money, Category, Text, Date, Time, Quantity, Location, or Other.

OUTPUT RULE:
Return ONLY a valid JSON object where keys are the column names. Do NOT include any technical flags like visibility.

Example:
{
  "amt": {
    "aliases": ["销售额", "收入", "业绩"],
    "businessType": "Money",
    "description": "该笔交易的总销售金额"
  },
  "user_id": {
    "aliases": ["用户ID", "账号", "UID"],
    "businessType": "ID",
    "description": "用户的唯一身份标识符"
  }
}`

  const userPrompt = `Table Name: ${tableName}
Columns and Samples:
${JSON.stringify(columnContext, null, 2)}`

  if (isDev()) {
    console.log('[SemanticEngine] Request context:', {
      tableName,
      language,
      schema: safeStringify(columnContext, 2)
    })
  }

  const response = await client.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('AI returned empty response')

  if (isDev()) {
    console.log(`[SemanticEngine] AI Raw Response for ${tableName}:`, content)
  }

  try {
    return JSON.parse(content)
  } catch (e) {
    console.error('[SemanticEngine] Failed to parse analysis JSON', e)
    throw new Error('Failed to parse AI response')
  }
}
