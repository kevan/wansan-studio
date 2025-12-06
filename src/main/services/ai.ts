export class AIService {
  private apiKey: string | null = null
  private baseURL = 'https://api.openai.com/v1'

  constructor() {
    // 从环境变量或配置文件读取 API Key
    this.apiKey = process.env.OPENAI_API_KEY || null
  }

  async generateSQL(prompt: string, schema: any): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.')
    }

    try {
      const systemPrompt = this.buildSystemPrompt(schema)
      const userPrompt = `请根据以下需求生成 DuckDB SQL 查询：\n\n${prompt}`

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as any
      const sqlContent = data.choices[0]?.message?.content

      if (!sqlContent) {
        throw new Error('No SQL generated from OpenAI')
      }

      // 提取 SQL 代码块
      const sqlMatch = sqlContent.match(/```sql\n([\s\S]*?)\n```/) || 
                      sqlContent.match(/```\n([\s\S]*?)\n```/)
      
      return sqlMatch ? sqlMatch[1].trim() : sqlContent.trim()
    } catch (error) {
      throw new Error(`Failed to generate SQL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildSystemPrompt(schema: any): string {
    const schemaDescription = this.formatSchemaForPrompt(schema)
    
    return `你是一个专业的 SQL 查询生成助手，专门为 DuckDB 数据库生成查询语句。

数据库表结构信息：
${schemaDescription}

请遵循以下规则：
1. 只生成 DuckDB 兼容的 SQL 语句
2. 使用标准 SQL 语法，避免使用特定数据库的扩展功能
3. 确保生成的 SQL 语句语法正确且可执行
4. 如果需要聚合或统计，优先使用常见的聚合函数（COUNT, SUM, AVG, MAX, MIN）
5. 对于日期时间处理，使用 DuckDB 支持的函数
6. 返回的 SQL 应该用 \`\`\`sql 代码块包围
7. 不要包含任何解释文字，只返回纯 SQL 代码

示例格式：
\`\`\`sql
SELECT column1, COUNT(*) as count
FROM table_name
WHERE condition
GROUP BY column1
ORDER BY count DESC;
\`\`\``
  }

  private formatSchemaForPrompt(schema: any): string {
    if (!schema || !schema.columns) {
      return '表结构信息不可用'
    }

    const { tableName, columns } = schema
    let description = `表名: ${tableName}\n列信息:\n`
    
    columns.forEach((col: any, index: number) => {
      description += `  ${index + 1}. ${col.name} (${col.type})`
      if (col.nullable === false) {
        description += ' NOT NULL'
      }
      description += '\n'
    })

    return description
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  hasApiKey(): boolean {
    return !!this.apiKey
  }
}
