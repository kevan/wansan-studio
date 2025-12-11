# 🛠️ Spec: Magic Chat Input (Autocomplete & Commands)

> **Goal**: A powerful, floating input bar that supports auto-growing text, `@` referencing tables, and keyboard shortcuts.
> **Stack**: `cmdk` (optional) or `Radix Popover` + `TextareaAutosize`.

## 1. UI Design (The "Capsule")

*   **Position**: Floating at the bottom center of the Chat Panel (margin-bottom: 20px).
*   **Shape**: `rounded-2xl`, `shadow-xl`, `border`.
*   **Background**: White/Glass.
*   **Max Width**: `700px` (To mimic ChatGPT/Claude).

## 2. Interaction Logic

### 2.1 Textarea
*   **Lib**: `react-textarea-autosize`.
*   **Behavior**:
    *   Starts at 1 row (`h-12`).
    *   Grows up to 6 rows.
    *   `Enter`: Submit (prevent default).
    *   `Shift + Enter`: New line.

### 2.2 Mentions (@Table)
*   **Trigger**: User types `@`.
*   **UI**: Popover menu appears *above* the caret.
*   **Data**: List of `files` (Ready status).
*   **Action**: Clicking an item inserts `[FileName]` into text and adds a hidden meta-tag to the message context.

### 2.3 Slash Commands (/)
*   **Trigger**: User types `/`.
*   **Commands**:
    *   `/clear`: Calls `clearChat`.
    *   `/export`: Triggers Markdown export.
    *   `/rerun`: Reruns last query.

## 3. Implementation Plan

1.  **Dependencies**: `npm install react-textarea-autosize`.
2.  **Component**: Create `src/renderer/src/components/chat/magic-input.tsx`.
3.  **Suggestion Engine**: 
    *   Simple regex check on `onChange`.
    *   If match `@` at end of word -> Open Popover.
4.  **Integration**: Replace old `ChatInput` in `MainLayout`.
