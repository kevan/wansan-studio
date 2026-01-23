import { OpenAI } from 'openai'
import { ColumnSchema, ColumnSemantic } from '@shared/types'

/**
 * AI Powered Semantic Analysis Engine
 * Uses LLM to infer column meanings, generate aliases, and suggest visibility.
 */
export async function analyzeSemantics(
  client: OpenAI,
  model: string,
  tableName: string,
  columns: ColumnSchema[],
  sampleValues: any[][]
): Promise<Record<string, ColumnSemantic>> {
  const columnContext = columns.map((col, idx) => {
    const samples = sampleValues.map(row => row[idx]).filter(v => v !== null).slice(0, 5)
    return {
      name: col.name,
      type: col.type,
      samples: samples
    }
  })

  const systemPrompt = `You are a Data Analyst and Business Intelligence expert. 
Your task is to analyze a database table schema and sample data to provide semantic metadata.

For each column, you must:
1. Infer its business meaning (Description).
2. Suggest 2-3 natural language synonyms/aliases in Chinese (Simplified).
3. Determine if it's an "Internal/Technical" column (e.g. IDs, Hashes, Create Time, System Logs).
4. Assign a high-level Business Category: ID, Money, Category, Text, Date, Time, Quantity, Location, or Other.

OUTPUT FORMAT:
Return ONLY a valid JSON object where keys are the column names.
Example:
{
  "amt": {
    "aliases": ["销售额", "收入", "业绩"],
    "businessType": "Money",
    "description": "Total sales amount for the transaction",
    "isVisibleToAI": true
  },
  "id": {
    "aliases": ["编号", "序号"],
    "businessType": "ID",
    "description": "Primary key identifier",
    "isVisibleToAI": false
  }
}`

  const userPrompt = `Table Name: ${tableName}
Columns and Samples:
${JSON.stringify(columnContext, null, 2)}`

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

  try {
    return JSON.parse(content)
  } catch (e) {
    console.error('Failed to parse semantic analysis JSON', e)
    throw new Error('Failed to parse AI response')
  }
}
