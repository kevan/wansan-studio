# 🛠️ Spec: Auto-Fix SQL (Error Recovery)

> **Goal**: Automatically correct SQL errors by feeding the error message back to the LLM.
> **Trigger**: User clicks "Auto Fix" on an Error Card.

## 1. Store Updates (`use-chat-store.ts`)

We need an action to handle the fix loop.

```typescript
// Action
autoFixMessage: (messageId: string, error: string) => Promise<void>;
```

## 2. AI Bridge Update (`ai-bridge.ts`)

Add a dedicated method `fixSql`.

*   **Input**: `originalPrompt`, `wrongSql`, `errorMessage`, `schema`.
*   **System Prompt**:
    > "You are a SQL Repair Expert.
    > User Query: {query}
    > Failed SQL: {sql}
    > Error: {error}
    > Schema: {schema}
    > Task: Correct the SQL to fix the error. Return JSON { sql, reasoning }."

## 3. UI Component (`error-card.tsx`)

A dedicated card variant for `status: 'error'`.

*   **Visual**: Red/Orange border.
*   **Content**:
    *   "Analysis Failed" title.
    *   Error Message (Collapsible code block).
*   **Actions**:
    *   `[✨ Auto Fix]` (Primary)
    *   `[📝 Edit SQL]` (Secondary, opens Inspector)

## 4. Implementation Logic

1.  **Frontend**: User clicks `Auto Fix`.
2.  **Store**: Sets message status to `thinking` (or `repairing`).
3.  **Backend**: Calls `ai.fixSql(...)`.
4.  **Backend**: Returns new SQL.
5.  **Frontend**: Automatically triggers `window.electron.executePlan(newSql)`.
6.  **Success**: Updates message to `success`.
