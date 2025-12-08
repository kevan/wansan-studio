# 🛠️ Spec: Chat Stream 2.0

> **Goal**: Transform the chat into a rich, interactive analysis log.

## 1. Message Bubble Redesign (`message-bubble.tsx`)

*   **Layout**: Align ALL messages to the left.
*   **User Message**:
    *   Avatar: User Initials.
    *   Content: Text (Bold).
    *   Meta: Timestamp (Small, gray).
*   **AI Message**:
    *   Avatar: Bot Icon.
    *   **Container**: A comprehensive card structure.
    *   **Section 1: The "Brain" (Collapsible)**
        *   Label: "Analysis Details"
        *   Content: Generated SQL, Reasoning text.
    *   **Section 2: The "Answer"**
        *   Summary Text (Markdown).
        *   Chart Preview (Small height, e.g., 200px).
    *   **Section 3: The "Next Steps"**
        *   Horizontal scroll list of Suggestion Chips.

## 2. Store Updates (`use-chat-store.ts`)

*   Add `reasoning` and `sql` fields to the `Message` interface (if not already there).
*   Add `suggestions` array (string[]) to the `Message` interface.

## 3. Auto-Suggestions Logic (AI Bridge)
*   When generating the report, ask the LLM to also return: `next_questions: string[]`.
*   Example Prompt Add-on: *"Also provide 3 short follow-up questions relevant to this data."*
