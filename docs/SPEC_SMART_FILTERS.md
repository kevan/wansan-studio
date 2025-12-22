### 📄 1. 技术规格书: `docs/SPEC_SMART_FILTERS.md`

```markdown
# 🛠️ Spec: Smart Filters (Intelligent Parameterization)

> **Version**: 1.0 (Lite / Template Mode)
> **Goal**: Eliminate AI hallucinations of data values via "Human-in-the-Loop" parameter injection.
> **Architecture**: Optimistic Template Filling (AI generates Logic, User provides Data).

## 1. 核心理念 (Core Philosophy)

* **Ask, Don't Guess**: 当 AI 无法确定具体的数据值（如城市名、产品型号）时，绝不应该瞎猜。
* **Zero Latency**: 利用本地 DuckDB 极速执行模糊搜索，无需再通过 AI 回合。
* **Privacy First**: 没有任何 `DISTINCT` 数据值会被发送给 LLM。

## 2. 协议定义 (Protocol Definition)

我们要扩展现有的 AI 分析结果协议，支持“模板模式”。

### 2.1 Extended JSON Schema
我们在原有的 `AnalysisResult` 基础上增加两个字段：

```json
{
  // --- 兼容 v1.1 原有字段 ---
  "sql": "SELECT sum(sales) FROM orders WHERE region = {{REGION_VAR}}", // 允许包含占位符
  "title": "Regional Sales Analysis",
  "summary": "Checking sales performance for the specific region.",
  "viz_type": "bar",
  "viz_config": { ... },
  "reasoning": "...",
  "suggestions": [...],

  // --- v1.2 新增字段 ---
  "is_template": true, // [Boolean] 标记这是一条需要填充的模板 SQL
  "missing_params": [
    {
      "placeholder": "{{REGION_VAR}}", // 必须与 SQL 中的占位符一致
      "label": "Select Region",         //用于 UI 显示的标题
      "column": "Region",               // 目标列名 (必须存在于 Schema 中)
      "hint": "south"                   // 从用户 Prompt 提取的模糊搜索词
    }
  ]
}

```

## 3. 交互流程 (Interaction Flow)

### Phase 1: AI Analysis (Server Side)

1. 用户输入："帮我看下南方的销售额"。
2. AI 检测到 "南方" 是模糊描述，且不知道数据库里具体叫 "South China" 还是 "CN-South"。
3. AI 生成 JSON：
* `sql`: `... WHERE region = {{REGION}}`
* `missing_params`: `[{ hint: "南方", column: "region", ... }]`



### Phase 2: Client Hydration (Frontend)

1. 前端接收到 JSON，校验发现 `is_template: true`。
2. **拦截执行**：不运行 SQL，而是唤起 `<SmartFilterModal />`。
3. **自动预检索**：组件挂载时，立即运行本地 SQL：
```sql
SELECT DISTINCT "region" 
FROM orders 
WHERE "region" ILIKE '%南方%' 
LIMIT 100

```


4. **用户决策**：弹窗显示候选列表（如 "华南大区", "西南大区"）。用户点击 "华南大区"。

### Phase 3: Local Execution

1. 前端执行字符串替换：`sql.replace('{{REGION}}', '华南大区')`。
2. 将最终 SQL 发送给 DuckDB 执行。
3. 渲染图表。

## 4. UI 组件规范

### `SmartFilterModal`

* **Type**: Dialog (Shadcn UI).
* **Content**:
* Title: "Parameter Required".
* Body: 动态表单。目前主要支持 `Combobox` (带搜索的下拉框)。
* Action: "Run Analysis".

## 4.1 Cancellation Flow (取消流程)

* **Trigger**: User clicks "Cancel" (X) or clicks outside the modal.
* **Action**:
    1.  `SmartFilterModal` calls `onCancel()`.
    2.  **Parent Component**:
        * Sets `showFilterModal = false`.
        * Sets `isAnalyzing = false` (stops the spinner).
        * (Optional) Updates the message status to `CANCELLED` to prevent auto-reopening.
* **UI Feedback**:
    * Show a small toast: "Analysis cancelled".
    * The chat bubble remains text-only (no chart).
