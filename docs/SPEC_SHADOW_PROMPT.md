# SPEC: Shadow Prompt Mechanism

## 1. Goal
Decouple the "User-Facing Message" from the "AI-Facing Instruction" to allow strict constraints without polluting the chat UI.

## 2. Architecture

### 2.1 Data Model (`Message`)
* **Field**: `hiddenPrompt?` (Optional string).
* **Logic**:
    * **UI Rendering**: Always render `content`.
    * **AI Context**: If `hiddenPrompt` exists, use it as the payload for the LLM; otherwise use `content`.

### 2.2 Data Flow
1.  **Component**: Call `sendMessage("User text", "System instruction")`.
2.  **Store**: Save message to state. `content` = "User text", `hiddenPrompt` = "System instruction".
3.  **AI Service**: When constructing the `messages` array for OpenAI API:
    ```typescript
    messages.map(m => ({
      role: m.role,
      content: m.hiddenPrompt || m.content // PRIORITY LOGIC
    }))
    ```

## 3. Usage Scenario (Drill Down)
* **Display**: "🔍 Focus analysis on 'East'"
* **Hidden**: "Filter analysis by region='East'. CONSTRAINT: Keep current viz type. DO NOT show raw rows."
