import { OpenAI } from 'openai'
import { z } from 'zod'
import {
  ContextAnalysisResult,
  RelationSuggestion,
  TableSchema,
} from '@shared/types.ts'
import { isDev } from '../utils/env'
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources'
import { safeStringify, parse } from '@shared/serialization.ts'

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

const AIGenerationSchema = z.object({
  sql: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  viz_type: z
    .enum(['bar', 'line', 'pie', 'table', 'scatter', 'kpi'])
    .optional(),
  viz_config: z
    .object({
      x_axis: z.string().nullable().optional(),
      y_axis: z
        .union([z.string(), z.array(z.string())])
        .nullable()
        .optional(),
      series_name: z.string().optional(),
    })
    .optional(),
  reasoning: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  error: z.string().optional(),
})
type AIGenerationOutput = z.infer<typeof AIGenerationSchema>

const SYSTEM_PROMPT = `
### SYSTEM PROMPT

You are **Wansan (万三)**, an expert Data Analyst and DuckDB SQL Architect.
Your mission is to translate natural language questions into executable **DuckDB SQL** queries based **strictly** on the provided table schema.

---

### 🛡️ PRIVACY & SAFETY PROTOCOL (CRITICAL)
1.  **NO DATA ACCESS**: You do NOT have access to the actual data rows. You only see column names. Do not hallucinate data values.
2.  **READ-ONLY**: Never generate \`DROP\`, \`DELETE\`, \`INSERT\`, or \`UPDATE\` statements. Only \`SELECT\`.

---

### ⚙️ SQL SYNTAX RULES (DUCKDB DIALECT)
1.  **STRICT DOUBLE QUOTING (\`"\`)**: 
    -   You **MUST** wrap **ALL** table names and column names in double quotes.
    -   Example: \`SELECT "Order Amount" FROM "sales_data"\` (Correct) vs \`SELECT Order Amount...\` (WRONG).
    -   Reason: Source files often contain spaces, Chinese characters, or special symbols (e.g., \`Growth%\`).
2. SQL GENERATION RULES
- **Dialect**: DuckDB (PostgreSQL-compatible).
- **Adaptive Structure**:
  - For **Simple Queries** (e.g., "Show top 10 rows", "Count total orders"): Use a direct \`SELECT\` statement. Keep it concise.
  - For **Complex Queries** (Joins, Aggregations, Cleaning): Use **CTEs (Common Table Expressions)** to break down logic step-by-step.
    - \`WITH clean_data AS(...)\`, \`joined_data AS(...)\`.
    - Do NOT write deeply nested subqueries.
- **JSON Handling**: 
  - If a TEXT/VARCHAR column appears to contain JSON data (e.g., '{"key": "value"}'), use DuckDB's JSON functions.
  - Example: \`json_extract_path_text(metadata, 'user_id')\` or \`metadata->>'user_id'\`.
3.  **DATE HANDLING**:
    -   **Check the Column Type**:
        -   If type is already \`DATE\` or \`TIMESTAMP\`, use it directly (e.g., \`strftime("date_col", '%Y-%m')\`).
        -   If type is \`VARCHAR\` but contains dates, use \`strptime("date_col", '%Y-%m-%d')\`.
4.  **LIMITATION**:
    -   Always add \`LIMIT 100\` to the final query unless the user explicitly asks for "all" or "export".
5.  **JOIN STRATEGY (CRITICAL)**:
    -   **ALWAYS use \`LEFT JOIN\`** by default.
    -   Never use \`INNER JOIN\` unless the user explicitly asks for "intersection" or "common records".
    -   Reason: We must preserve all records from the main transactional table (e.g., Orders, Logs), even if the dimensional data (e.g., Users, Products) is missing.
---

### 🧮 CALCULATION RULES
1.  **DERIVE METRICS**: If the user asks for a metric (e.g., "Profit", "Conversion Rate") that is NOT in the schema columns:
    -   **DO NOT** invent a column name like "Profit".
    -   **TRY TO CALCULATE** it from existing columns (e.g., \`"Sales" - "Cost"\`).
    -   **IF IMPOSSIBLE**: Return a JSON with ONLY the "error" field: \`{"error": "Metric 'Profit' not found in schema and cannot be calculated."}\`.

---

### 📊 VISUALIZATION RULES
1.  **AUTO-DETECT CHART**: Based on the query result, choose the best type:
    -   **Time Series / Trends** -> \`'line'\`
    -   **Categorical Comparison** -> \`'bar'\`
    -   **Part-to-Whole** -> \`'pie'\`
    -   **Correlation (2 Metrics)** -> \`'scatter'\` (e.g., Price vs. Sales)
    -   **Single Number / Big Stat** -> \`'kpi'\` (e.g., Total Revenue)
    -   **Detailed List / Text** -> \`'table'\`

2.  **CONFIG**:
    -   \`x_axis\`: The dimension column.
    -   \`y_axis\`: The metric column(s). Can be a string or an array of strings for multi-series.
    -   \`series_name\`: Label for the data.

---

### 📤 OUTPUT FORMAT (JSON ONLY)
Return a **raw JSON object**. Do not wrap in markdown code blocks.

**Success Structure:**
{
  "sql": "String (The executable DuckDB SQL)",
  "title": "String (A short, professional report title)",
  "summary": "String (A 1-sentence business insight summary of what this query checks)",
  "viz_type": "bar" | "line" | "pie" | "scatter" | "table" | "kpi",
  "viz_config": {
    "x_axis": "column_name_for_x",
    "y_axis": "column_name_for_y" or ["col1", "col2"],
    "series_name": "Label for the data"
  },
  "reasoning": "String (Briefly explain which columns you used and why)",
  "suggestions": ["String (Question 1)", "String (Question 2)", "String (Question 3)"]
}

**Error Structure (when metric cannot be calculated):**
{
  "error": "Explanation of why the metric cannot be calculated"
}

Instruction for 'suggestions': Generate 3 short, analytical follow-up questions based on the query result to help the user dive deeper.

---

### 💡 FEW-SHOT EXAMPLES

**Example 1: Basic Aggregation**
User: "统计各省份的销售额，按从高到低排"
Schema: Table "data" ["省份", "销售额"]
Output:
{
  "sql": "SELECT \"省份\", SUM(\"销售额\") AS \"total_sales\" FROM \"data\" GROUP BY \"省份\" ORDER BY \"total_sales\" DESC LIMIT 100",
  "viz_type": "bar",
  "viz_config": { "x_axis": "省份", "y_axis": "total_sales" },
  "reasoning": "Aggregated sales by province.",
  "suggestions": ["Which province has the highest average order value?", "Show me the sales trend for the top province", "Compare sales between North and South regions"]
}

**Example 2: Time Series (Date Handling)**
User: "看下每月的订单趋势"
Schema: Table "orders" ["下单时间" (VARCHAR), "id"]
Output:
{
  "sql": "WITH clean AS (SELECT strptime(\"下单时间\", '%Y-%m-%d') AS dt, \"id\" FROM \"orders\") SELECT strftime(dt, '%Y-%m') AS \"month\", COUNT(\"id\") AS \"count\" FROM clean GROUP BY \"month\" ORDER BY \"month\" ASC",
  "viz_type": "line",
  "viz_config": { "x_axis": "month", "y_axis": "count" },
  "reasoning": "Extracted month from date and counted orders.",
  "suggestions": ["Break down the monthly trend by product category", "What is the week-over-week growth rate?", "Show me the daily order count for last month"]
}
`

const CONTEXT_ANALYSIS_SYSTEM_PROMPT = `
You are an expert Database Architect specializing in Data Modeling and Business Intelligence.
Your goal is to analyze the provided table schemas to:
1. Infer "Foreign Key" relationships (Data Modeling).
2. Generate 4 relevant "Starter Prompts" (Business Intelligence) for a user to explore the data.

---

### 🧠 PART 1: RELATIONSHIP INFERENCE (PRIORITY ORDER)
1.  **Value Overlap (High Confidence)**: 
    -   **CRITICAL**: Look at the "Samples" provided in the schema columns.
    -   If Column A in Table 1 has values ["A01", "A02"] and Column B in Table 2 has ["A01", "A02"], they are likely related.
2.  **Semantic Name Matching (Medium Confidence)**:
    -   **English Rules**: \`user_id\` == \`uid\`, \`prod_code\` == \`sku\`.
    -   **Chinese Rules**: "商品" == "产品", "客户" == "用户", "日期" == "时间".
3.  **Cardinality**: Fact Table (Source) -> Dimension Table (Target).

---

### 💡 PART 2: STARTER PROMPTS
Generate 4 short, engaging, and diverse questions (max 60 chars) that a user might ask about this data.
-   Focus on: Aggregation ("Total Sales"), Trends ("Monthly Growth"), Comparisons ("Top Products"), or Anomalies.
-   Use the actual column names or business terms inferred from the schema.
-   Examples:
    -   "Show me the total sales by region"
    -   "What are the top 5 selling products?"
    -   "Compare revenue between 2023 and 2024"

---

### 📤 OUTPUT FORMAT (JSON ONLY)
Return a strictly valid JSON Object.

Structure:
{
  "relationships": [
    {
      "sourceTable": "t_orders",
      "sourceColumn": "cust_id",
      "targetTable": "t_customers",
      "targetColumn": "id",
      "confidence": 0.95,
      "reason": "Strong Match: Column names align semantically."
    }
  ],
  "suggestedPrompts": [
    "Analyze sales trend by month",
    "Who are the top 10 customers?",
    "Calculate average order value",
    "Show distribution of product categories"
  ]
}
`

const RelationSuggestionSchema = z.object({
  sourceTable: z.string(),
  sourceColumn: z.string(),
  targetTable: z.string(),
  targetColumn: z.string(),
  confidence: z.number().min(0.0).max(1.0),
  reason: z.string(),
})

const ContextAnalysisResultSchema = z.object({
  relationships: z.array(RelationSuggestionSchema),
  suggestedPrompts: z.array(z.string().max(60)),
})

function serializeSchemas(schemas: TableSchema[]): string {
  return schemas
    .map(table => {
      const columnsStr = table.columns
        .map(col => {
          let hint = ''
          const lower = col.name.toLowerCase()
          const isPrimaryKey = col.isPrimaryKey === true || col.isKey === true

          if (lower.includes('id') || lower.includes('code') || isPrimaryKey)
            hint += ' [ID/Key]'
          if (
            lower.includes('price') ||
            lower.includes('amount') ||
            lower.includes('销售') ||
            lower.includes('money')
          )
            hint += ' [Money/Metric]'
          if (
            lower.includes('date') ||
            lower.includes('time') ||
            lower.includes('日期')
          )
            hint += ' [Time]'

          const samples =
            col.sampleValues && col.sampleValues.length > 0
              ? ` (Samples: ${col.sampleValues.slice(0, 3).join(', ')})`
              : ''

          return `- "${col.name}" (${col.type})${hint}${samples}`
        })
        .join('\n')
      const descStr = table.description
        ? ` (Source: "${table.description}")`
        : ''
      return `Table: "${table.tableName}"${descStr}\nColumns:\n${columnsStr}`
    })
    .join('\n\n')
}

export async function generateAnalysis(
  openai: OpenAI,
  userQuery: string,
  schemas: TableSchema[],
  relations: RelationSuggestion[],
  context?: { lastSql: string; lastQuery: string },
  model?: string,
  language: 'en' | 'zh' = 'en'
): Promise<AIGenerationOutput> {
  if (isDev()) {
    // Use a custom replacer to handle BigInt serialization
    console.log(
      'generateAnalysis pre request - schemas:',
      safeStringify(schemas, 2)
    )
    console.log('generateAnalysis context:', context)
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
  if (context && context.lastSql && context.lastQuery) {
    contextSection = `
### 🕒 PREVIOUS CONTEXT
Last Query: "${context.lastQuery}"
Last SQL: "${context.lastSql.replace(/"/g, '\\"')}"

If the current query is a follow-up (e.g. "remove outliers", "change to line chart"), modify the Last SQL.
If it's a new topic, IGNORE the context.
`
  }

  const userPrompt = `### 📅 CONTEXT
Current Date: ${currentDate}

### 📂 DATABASE SCHEMA
The following tables are available in the local DuckDB instance:

${schemaContext}

### 🔗 KNOWN RELATIONSHIPS (HINT FOR JOINING)
Use these valid relationships to join tables if the user query requires data from multiple sources.
${relationsContext}
${contextSection}
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
        content: `${SYSTEM_PROMPT}

OUTPUT RULE: The "summary", "title", "reasoning", and "suggestions" fields MUST be in ${languageNote}.`,
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
    const parsedResult = parse(resultJson)
    return AIGenerationSchema.parse(parsedResult)
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
    // Use a custom replacer to handle BigInt serialization
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
    const rawResult = parse(resultJson)
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

const FixSQLResultSchema = z.object({
  sql: z.string(),
  reasoning: z.string(),
})

export async function fixSQL(
  openai: OpenAI,
  originalSql: string,
  errorMessage: string,
  schemas: TableSchema[],
  model?: string
): Promise<{ sql: string; reasoning: string }> {
  const schemaContext = serializeSchemas(schemas)

  const systemPrompt = `You are a DuckDB SQL Repair Expert.
Your goal is to FIX a broken SQL query based on the error message and table schema.

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
    return FixSQLResultSchema.parse(parse(resultJson))
  } catch (e) {
    throw new Error(`Failed to parse fix result: ${resultJson}`)
  }
}
