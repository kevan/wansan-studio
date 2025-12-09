# 🚀 Task: Implement "Analyze Data Context" (Merged Logic)

> **Goal**: Perform a single AI pass after file ingestion to extract **Relationships** AND **Starter Questions**.
> **Reasoning**: Saves tokens, reduces latency, simplifies the async flow.

## 1. Type Definitions (`src/shared/types.ts`)

Define the combined payload structure.

```typescript
export interface SchemaAnalysisResult {
  relations: RelationSuggestion[]; // Existing interface
  suggestedPrompts: string[];      // New: 4 starter questions
}
```

## 2. Store Updates (`use-project-store.ts`)

Ensure the store can hold the prompts.

```typescript
interface ProjectState {
  // ... existing
  suggestedPrompts: string[];
  setSuggestedPrompts: (prompts: string[]) => void;
}
```

## 3. AI Bridge Logic (`src/main/engine/ai-bridge.ts`)

Refactor the existing `inferRelationships` function (or create new `analyzeDataContext`).

*   **Prompt**:
    > "Analyze the provided table schemas.
    > 1. Identify potential Foreign Key relationships between tables (default to LEFT JOIN logic).
    > 2. Generate 4 concise, analytical questions a business user might ask about this data (e.g., 'Top 10 sales', 'Trend over time').
    >
    > Return JSON:
    > {
    >   'relations': [{ sourceTable, sourceColumn, targetTable, targetColumn, reason, confidence }],
    >   'prompts': ['Question 1', 'Question 2', 'Question 3', 'Question 4']
    > }"

*   **Implementation**: Call OpenAI, parse JSON, map `prompts` to `suggestedPrompts`.

## 4. Integration Hook (`use-auto-link.ts` or `use-file-ingestion.ts`)

Update the logic that triggers after ingestion.

```typescript
// Previous logic:
// await inferRelationships();

// New logic:
const result = await window.electron.analyzeDataContext(allFiles);

// 1. Handle Relations
const highConf = result.relations.filter(r => r.confidence > 0.8);
addRelations(highConf);

// 2. Handle Prompts
setSuggestedPrompts(result.suggestedPrompts);

// 3. UI Feedback
toast.success(`Data analyzed: ${highConf.length} links found.`);
```

## 5. UI Update (`empty-state.tsx`)

*   Read `suggestedPrompts` from store.
*   If array is not empty, map them to the cards.
*   If empty (e.g., first run or API fail), fall back to hardcoded generic prompts.
