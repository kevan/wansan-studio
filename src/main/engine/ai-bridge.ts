import { OpenAI } from 'openai';
import { z } from 'zod';
import { TableSchema, AnalysisResult } from '../../shared/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    -   If a column looks like a date (e.g., "2023-01-01"), use \`strptime("date_col", '%Y-%m-%d')\` or \`CAST("date_col" AS DATE)\` if safe.
4.  **LIMITATION**:
    -   Always add \`LIMIT 100\` to the final query unless the user explicitly asks for "all" or "export".

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
  "sql": "SELECT \\"省份\\", SUM(\\"销售额\\") AS \\"total_sales\\" FROM \\"data\\" GROUP BY \\"省份\\" ORDER BY \\"total_sales\\" DESC LIMIT 100",
  "viz_type": "bar",
  "viz_config": { "x_axis": "省份", "y_axis": "total_sales" }
}

**Example 2: Time Series (Date Handling)**
User: "看下每月的订单趋势"
Schema: Table "orders" ["下单时间" (VARCHAR), "id"]
Output:
{
  "sql": "WITH clean AS (SELECT strptime(\\"下单时间\\", '%Y-%m-%d') AS dt, \\"id\\" FROM \\"orders\\") SELECT strftime(dt, '%Y-%m') AS \\"month\\", COUNT(\\"id\\") AS \\"count\\" FROM clean GROUP BY \\"month\\" ORDER BY \\"month\\" ASC",
  "viz_type": "line",
  "viz_config": { "x_axis": "month", "y_axis": "count" }
}
`;

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

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
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
