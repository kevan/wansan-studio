# SPEC: Business Domain Memory (Custom Instructions)

## 1. Goal
Allow users to define global business rules (e.g., "Fiscal Year definition", "Currency conventions") that are injected into the AI context for every query.

## 2. Architecture

### 2.1 Data Model
* **Store**: `useSettingsStore` (Persisted in `localStorage`).
* **Structure**:
    ```typescript
    interface DomainRule {
      id: string;          // UUID
      content: string;     // The rule text (e.g., "Always use JPY for currency")
      isEnabled: boolean;  // Toggle state
      createdAt: number;
    }
    ```

### 2.2 UI Design
* **Location**: `SettingsModal` -> New Tab: "🧠 Domain Knowledge".
* **Interaction**:
    * **List View**: Show all rules with a checkbox (enable/disable) and delete button.
    * **Add Rule**: Simple text input + "Add" button.
    * **Empty State**: Show suggestions (e.g., "Click to add: 'Fiscal year starts in April'").

### 2.3 AI Integration
* **Injection Point**: `SYSTEM_PROMPT` in `src/main/engine/prompts.ts`.
* **Format**:
    ```text
    ### 🏢 BUSINESS DOMAIN RULES (CUSTOM MEMORY)
    The user has defined the following specific rules. You MUST follow them:
    1. Fiscal year starts in April.
    2. Default currency is USD.
    ```
* **Logic**: Only inject rules where `isEnabled === true`.

## 3. Scope
* **Level**: Global (Applies to all projects).
* **Persistence**: Handled by existing `useSettingsStore` persistence.
# SPEC: Business Domain Memory (Safe Injection)

## 1. Goal
Inject user-defined business rules into the AI context while preventing "Prompt Injection" attacks that could break the application (e.g., users asking for Markdown output instead of JSON).

## 2. Architecture

### 2.1 Prompt Strategy: "The Sandwich Defense"
We structure the System Prompt in three distinct layers to ensure stability:

1.  **Top Layer (Role Definition)**: "You are a Data Analyst..."
2.  **Middle Layer (Domain Context)**: User-defined rules (Soft Constraints).
  * *Header*: `### 🏢 BUSINESS DOMAIN CONTEXT (USER DEFINED)`
  * *Content*: Injected `domainRules`.
3.  **Bottom Layer (Immutable Protocol)**: System-level mandates (Hard Constraints).
  * *Header*: `### 🛡️ IMMUTABLE EXECUTION PROTOCOL (HIGHEST PRIORITY)`
  * *Content*: JSON format, DuckDB syntax, Anti-hallucination.
  * *Reasoning*: LLMs prioritize the latest instructions (Recency Bias).

### 2.2 Data Flow
1.  **Store**: `useSettingsStore` holds `domainRules`.
2.  **Chat Request**: When user sends a message, `useChatStore` retrieves active rules.
3.  **IPC Payload**: Rules are passed to Main Process via `ai-service`.
4.  **Construction**: Main Process constructs the final prompt using `getSystemPrompt(rules)`.
