import { OpenAI } from 'openai';
import { z } from 'zod';
import { TableSchema, AnalysisResult, RelationSuggestion } from '../../shared/types';

let openaiInstance: OpenAI | null = null;
let currentApiKey: string | undefined = undefined;
let currentBaseURL: string | undefined = undefined;
let currentModel: string = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

function getOpenAI(apiKey?: string, baseURL?: string): OpenAI {
  const keyToUse = apiKey || currentApiKey || process.env.OPENAI_API_KEY;
  const urlToUse = baseURL || currentBaseURL || process.env.OPENAI_BASE_URL;

  if (!keyToUse) {
    throw new Error('OpenAI API key is not configured.');
  }

  // Re-initialize if key or url changed, or instance is null
  if (!openaiInstance || keyToUse !== currentApiKey || urlToUse !== currentBaseURL) {
    openaiInstance = new OpenAI({
      apiKey: keyToUse,
      baseURL: urlToUse,
    });
    currentApiKey = keyToUse;
    currentBaseURL = urlToUse;
  }
  return openaiInstance;
}

export function setAIConfig(config: { apiKey?: string; baseURL?: string; model?: string }) {
  if (config.apiKey !== undefined) currentApiKey = config.apiKey;
  if (config.baseURL !== undefined) currentBaseURL = config.baseURL;
  if (config.model !== undefined) currentModel = config.model;
  
  openaiInstance = null; // Force re-initialization
}

export function isAIConfigured(): boolean {
  return !!(currentApiKey || process.env.OPENAI_API_KEY);
}

const AnalysisResultSchema = z.object({
  sql: z.string(),
  title: z.string(),
  summary: z.string(),
  viz_type: z.enum(['bar', 'line', 'pie', 'table']),
  viz_config: z.object({
    x_axis: z.string(),
    y_axis: z.string(),
    series_name: z.string().optional(),
  }),
  reasoning: z.string(),
});

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
2.  **USE CTEs (Common Table Expressions)**:
    -   Do not write nested JOINs. Break logic into \`WITH\` steps.
    -   Step 1: Clean/Rename columns. Step 2: Join. Step 3: Aggregate.
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

### 📊 VISUALIZATION RULES
1.  **AUTO-DETECT CHART**: Based on the query result, recommend the best ECharts type:
    -   Time Series -> \`'line'\`
    -   Categorical Comparison -> \`'bar'\`
    -   Part-to-Whole -> \`'pie'\`
    -   Detailed List -> \`'table'\`
2.  **CONFIG**: Provide \`x_axis\` and \`y_axis\` mapping.

---

### 📤 OUTPUT FORMAT (JSON ONLY)
Return a **raw JSON object**. Do not wrap in markdown code blocks.

Structure:
{
  "sql": "String (The executable DuckDB SQL)",
  "title": "String (A short, professional report title)",
  "summary": "String (A 1-sentence business insight summary of what this query checks)",
  "viz_type": "bar" | "line" | "pie" | "table",
  "viz_config": {
    "x_axis": "column_name_for_x",
    "y_axis": "column_name_for_y",
    "series_name": "Label for the data"
  },
  "reasoning": "String (Briefly explain which columns you used and why)"
}

---

### 💡 FEW-SHOT EXAMPLES

**Example 1: Basic Aggregation**
User: "统计各省份的销售额，按从高到低排"
Schema: Table "data" ["省份", "销售额"]
Output:
{
  "sql": "SELECT \"省份\", SUM(\"销售额\") AS \"total_sales\" FROM \"data\" GROUP BY \"省份\" ORDER BY \"total_sales\" DESC LIMIT 100",
  "viz_type": "bar",
  "viz_config": { "x_axis": "省份", "y_axis": "total_sales" }
}

**Example 2: Time Series (Date Handling)**
User: "看下每月的订单趋势"
Schema: Table "orders" ["下单时间" (VARCHAR), "id"]
Output:
{
  "sql": "WITH clean AS (SELECT strptime(\"下单时间\", '%Y-%m-%d') AS dt, \"id\" FROM \"orders\") SELECT strftime(dt, '%Y-%m') AS \"month\", COUNT(\"id\") AS \"count\" FROM clean GROUP BY \"month\" ORDER BY \"month\" ASC",
  "viz_type": "line",
  "viz_config": { "x_axis": "month", "y_axis": "count" }
}
`;

const RELATION_INFERENCE_SYSTEM_PROMPT = `
You are an expert Data Modeler assistant. Your task is to analyze provided table schemas and suggest potential foreign key relationships between them.

---

### 规则 (RULES)
1.  **仅识别主键到外键的关系**: 识别一个表的主键列可能与另一个表的外键列匹配的情况。
2.  **考虑列名**: 寻找名称相似的列（例如，'product_id' 和 'id'，或者 'customer_name' 和 'name'）。
3.  **考虑数据类型**: 匹配的列应该具有兼容的数据类型。
4.  **提供置信度**: 根据匹配的强度（例如，名称、类型）分配 0.0 到 1.0 的置信度。
5.  **提供理由**: 简要说明你提出关系的原因。
6.  **避免自引用**: 不要在同一个表内建议关系。

---

### 📤 输出格式 (JSON ONLY)
返回一个 JSON 数组。数组中的每个对象代表一个建议的关系。

结构:
[
  {
    "sourceTable": "String (外键所在的表名)",
    "sourceColumn": "String (外键列名)",
    "targetTable": "String (主键所在的表名)",
    "targetColumn": "String (主键列名)",
    "confidence": "Number (0.0 到 1.0)",
    "reason": "String (简要说明此关系被推断出的原因)"
  }
]
`;

const RelationSuggestionSchema = z.object({
  sourceTable: z.string(),
  sourceColumn: z.string(),
  targetTable: z.string(),
  targetColumn: z.string(),
  confidence: z.number().min(0.0).max(1.0),
  reason: z.string(),
});

const RelationSuggestionListSchema = z.array(RelationSuggestionSchema);

function serializeSchemas(schemas: TableSchema[]): string {
  return schemas.map(table => {
    const columnsStr = table.columns.map(col => `- "${col.name}" (${col.type})`).join('\n');
    return `Table: "${table.tableName}"\nColumns:\n${columnsStr}`;
  }).join('\n\n');
}

export async function generateAnalysis(
  userQuery: string,
  schemas: TableSchema[]
): Promise<AnalysisResult> {
  const schemaContext = serializeSchemas(schemas);
  const currentDate = new Date().toISOString().split('T')[0];

  const userPrompt = `### 📅 CONTEXT
Current Date: ${currentDate}

### 📂 DATABASE SCHEMA
The following tables are available in the local DuckDB instance:

${schemaContext}

### 👤 USER QUESTION
"${userQuery}"

### 🤖 YOUR RESPONSE (JSON)`;

  const response = await getOpenAI().chat.completions.create({
    model: currentModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const resultJson = response.choices[0].message.content;
  if (!resultJson) {
    throw new Error('AI returned an empty response.');
  }

  try {
    const parsedResult = JSON.parse(resultJson);
    return AnalysisResultSchema.parse(parsedResult);
  } catch (error) {
    console.error("Failed to parse or validate AI response:", error);
    throw new Error(`AI returned invalid JSON or structure. Raw response: ${resultJson}`);
  }
}

/**
 * Analyze multiple table schemas to deduce potential Foreign Key relationships.
 * This is run immediately after file ingestion to populate the "Relationship Manager" UI.
 */
export async function inferRelationships(schemas: TableSchema[]): Promise<RelationSuggestion[]> {
  const schemaContext = serializeSchemas(schemas);

  const userPrompt = `### 📂 DATABASE SCHEMA
The following table schemas are available. Please suggest potential foreign key relationships between them.

${schemaContext}

### 🤖 YOUR RESPONSE (JSON ARRAY)
`;

  const response = await getOpenAI().chat.completions.create({
    model: currentModel, // Or another suitable model
    messages: [
      { role: 'system', content: RELATION_INFERENCE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' }, // The API will return an object with a single key for the array
  });

  const resultJson = response.choices[0].message.content;
  if (!resultJson) {
    throw new Error('AI returned an empty response for relationship inference.');
  }

  try {
    // The API might return an object like { "relationships": [...] } or directly the array.
    // Let's assume it might wrap it in an object for safety if response_format is json_object
    const rawResult = JSON.parse(resultJson);
    const relationships = Array.isArray(rawResult) ? rawResult : rawResult.relationships;

    return RelationSuggestionListSchema.parse(relationships);
  } catch (error) {
    console.error("Failed to parse or validate AI response for relationship inference:", error);
    throw new Error(`AI returned invalid JSON or structure for relationships. Raw response: ${resultJson}`);
  }
}
