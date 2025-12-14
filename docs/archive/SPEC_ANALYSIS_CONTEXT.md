# 🧠 Spec: Context-Aware Analysis Generation

## 1. 目标
在生成 SQL 时，不再仅仅提供孤立的 Table Schema，而是提供一张“关系图谱”。这将允许 AI 生成准确的 `LEFT JOIN` 语句。

## 2. 数据流 (Data Flow)
1.  **Source**: 从 `ProjectStore` 获取当前的 `relations` 列表 (类型为 `RelationSuggestion[]` 或 `Relation[]`)。
2.  **Formatter**: 将对象数组序列化为自然语言描述。
3.  **Injection**: 插入到 `generateAnalysis` 的 User Prompt 模板中，位于 Schema 之后，用户提问之前。

## 3. Prompt 模板结构变更

### 原结构
1. Context (Date)
2. Database Schema
3. User Question

### 新结构
1. Context (Date)
2. Database Schema
3. **🔗 KNOWN RELATIONSHIPS** (新增)
    - *Format*: `Table "{source}" joins to Table "{target}" on "{source_col}" = "{target_col}"`
4. User Question

## 4. 逻辑约束
*   **只包含高置信度关系**：如果我们在 Store 里存储了用户确认过的关系，优先使用。如果是 AI 自动推断且未确认的，仅当 confidence > 0.8 时才包含。
*   **Schema 别名**：确保生成的 Prompt 中使用的表名与 Schema 部分完全一致。
