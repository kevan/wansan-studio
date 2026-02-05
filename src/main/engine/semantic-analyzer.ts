import { OpenAI } from 'openai'
import { ColumnSchema, ColumnSemantic } from '@shared/types'
import { callAIAndParse } from './ai-utils'
import { z } from 'zod'

const SemanticResultSchema = z.record(z.string(), z.object({
  aliases: z.array(z.string()),
  businessType: z.enum(['ID', 'Code', 'Money', 'Category', 'Text', 'Date', 'Time', 'Quantity', 'Location', 'Other'] as any),
  description: z.string()
}))

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
3. Assign a high-level Business Category. You MUST choose EXACTLY one from this list:
   - ID: Technical primary/foreign keys (e.g. 1, 2, UUID). Used for joins.
   - Code: Business-facing identifiers (e.g. SKU-001, EMP102, Contract_No). Used for searching and display labels.
   - Money: Financial values, currency.
   - Category: Dimensions, groups, types.
   - Text: Descriptive text.
   - Date: Temporal info (Date, Timestamp).
   - Time: Temporal info (Time only).
   - Quantity: Measurable counts or amounts (not money).
   - Location: Geography info.
   - Other: Anything else.

OUTPUT RULE:
1. Return ONLY a valid JSON object where keys are the column names.
2. **CRITICAL**: The "businessType" field MUST be one of the exact strings listed above (e.g., "Date", not "Date / Time").

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

  const { data } = await callAIAndParse(client, {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0
  }, SemanticResultSchema)

  return data as Record<string, ColumnSemantic>
}