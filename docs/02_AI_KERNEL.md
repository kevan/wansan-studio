# 📕 02_AI_KERNEL.md - Prompt Engineering & Workflow

> **Version**: 1.0
> **Status**: Authoritative
> **Scope**: System Prompts, Two-Phase Flow, Auto-Fix, Context.

---

## 1. The Two-Phase Workflow (双阶段交互流)

为了建立“隐私信任”，我们将 AI 的思考过程与执行过程物理分离。

### 1.1 Phase 1: Generation (生成)
*   **Actor**: Cloud LLM (via OpenAI API).
*   **Input**: `User Query` + `Schema Context`.
*   **Output**: `AnalysisPlan` (JSON).
    *   `sql`: DuckDB Dialect SQL.
    *   `viz_type`: Chart recommendation.
    *   `reasoning`: Step-by-step logic explanation.
*   **UI State**: 展示 "Thinking..." -> "Plan Generated" (显示 SQL 代码块)。

### 1.2 Phase 2: Execution (执行)
*   **Actor**: Local DuckDB WASM.
*   **Trigger**: Automatic (after 800ms "Cinematic Delay") or Manual (if configured).
*   **Action**: Run `db.query(plan.sql)`.
*   **Output**: `Result Rows`.
*   **UI State**: 渲染最终图表。

---

## 2. Prompt Strategy (提示工程策略)

我们构建了一套 **"Defensive SQL" (防御性 SQL)** 规则集，旨在对抗脏数据和模糊指令。

### 2.1 System Prompt Rules (`src/main/engine/prompts.ts`)

1.  **Strict Double Quoting (`"`)**:
    *   **Rule**: ALL identifiers (tables, columns) must be quoted.
    *   **Why**: Handles Chinese characters, spaces, and special symbols (e.g., `Growth%`).
2.  **Adaptive Complexity**:
    *   **Simple**: Use direct `SELECT`.
    *   **Complex**: Use `CTE` (Common Table Expressions) to break down logic (Clean -> Join -> Agg).
3.  **JSON Output**:
    *   Response must be valid JSON. No Markdown wrappers.
4.  **Join Strategy**:
    *   Default to `LEFT JOIN` to preserve transactional data.
5.  **Data Privacy**:
    *   Explicit instruction: "You do not have access to data rows. Do not hallucinate values."

### 2.2 Dynamic Context Injection
*   **Schema**: Generated from `useFileStore`. Includes `name`, `type`, and `sampleValues` (top 3 distinct).
*   **Relations**: Explicitly list known joins: `t_orders.uid <-> t_users.id`.
*   **Time**: Inject `Current Date` for relative time queries ("last month").

---

## 3. Resilience: Auto-Fix Loop (自愈机制)

这是 Wansan 的核心护城河。

### 3.1 The Loop
1.  **Execute**: DuckDB throws error (e.g., `Binder Error: Column "prce" not found`).
2.  **Catch**: Frontend store catches the error.
3.  **Re-Prompt**: Call `aiBridge.fixSQL()`.
    *   **Prompt**: "The SQL you generated failed with error: [Error]. The schema is: [Schema]. Fix it."
4.  **Retry**: Execute the new SQL. (Max retries: 1).

### 3.2 Handling "Semantic Mismatch"
*   **Scenario**: User asks for "Profit", but schema only has "Sales" and "Cost".
*   **Instruction**: If AI cannot find the column, try to **calculate** it. If impossible, return a structured error JSON instead of hallucinating a column.

---

## 4. SQL Lab (The Escape Hatch)

当 AI 实在搞不定时，我们将控制权交还给用户。

### 4.1 Integration
*   **Entry**: `<Code />` button on Report Card.
*   **UI**: **Analysis Inspector** Modal.
    *   **Top**: Reasoning text (Read-only).
    *   **Bottom**: SQL Editor (Editable).
*   **Action**: User edits SQL -> Click [Run] -> Chart updates immediately.

---

## 5. Token Optimization (成本控制)

*   **Schema Pruning (Planned)**: 目前发送全量 Schema。未来将先用一次轻量级 LLM 调用筛选出相关表，再发送详细 Schema。
*   **Short Context**: 仅保留上一轮 SQL，不保留整个对话历史。

