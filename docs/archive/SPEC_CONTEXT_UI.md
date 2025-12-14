# 🎨 Spec: Context Awareness UI

> **Goal**: Visually indicate to the user when an analysis is a **refinement** of a previous query.

## 1. Chat Message Bubble Update

**Target**: `src/renderer/src/components/chat/message-bubble.tsx`

### New Prop
```typescript
interface MessageProps {
  // ...
  contextRef?: {
    query: string;
    sqlSummary: string; // e.g., "SELECT sum(sales)..."
  };
}
```

### Visual Implementation
If `contextRef` exists, render a "Context Badge" above the main report card.

```tsx
// Inside AI Message Bubble
{isAI && message.contextRef && (
  <div className="flex items-center gap-1.5 mb-2 text-xs text-indigo-500/80 bg-indigo-50/50 w-fit px-2 py-0.5 rounded-full border border-indigo-100/50">
    <GitBranch className="h-3 w-3" />
    <span>Based on: "{message.contextRef.query}"</span>
  </div>
)}
```

## 2. Store Logic (`use-chat-store.ts`)

当我们收到 AI 的回复时，如果后端返回了 `reasoning` 包含 "Modified previous SQL" 或者我们前端显式发送了 context，就在 Message 对象里记录下来。

## 3. Interaction Flow

1.  **User** types: "Split by region".
2.  **Frontend** detects `history.last` has SQL.
3.  **Frontend** sends `context: { lastSql: ... }`.
4.  **Backend** returns result.
5.  **Frontend** creates new Message with `contextRef` pointing to the previous ID.
6.  **UI** renders the "Based on..." badge.
