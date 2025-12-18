# 🏗️ Spec: Normalized Project Store (v1.1 Final)

> **Goal**: Establish a Single Source of Truth (SSOT) for all charts.
> **Change**: Decouple `Widget Data` from `View Containers` (Chat/Dashboard).

## 1. Normalized Data Model

```typescript
export interface Session {
  id: string;
  // ... metadata ...

  // --- 1. The Entity Pool (SSOT) ---
  // Stores the SQL, Data, Config for every chart created in this session.
  widgetRegistry: Record<string, ReportWidget>; 

  // --- 2. The Chat View ---
  messages: {
    id: string;
    role: 'user' | 'ai';
    content?: string; // Text reasoning
    widgetId?: string; // Reference to Registry
    // No 'data' here!
  }[];

  // --- 3. The Dashboard View ---
  dashboard: {
    layout: {
      i: string; // matches widgetId
      x: number; y: number; w: number; h: number;
    }[];
    // No 'data' here!
  };
}
```

## 2. Store Actions Refactor

### `addMessage`
*   If message contains a chart:
    1.  Create `widget` object.
    2.  Add to `widgetRegistry`.
    3.  Add message with `widgetId`.

### `pinWidget`
*   Input: `widgetId`.
*   Action: Add an entry to `dashboard.layout` pointing to that ID.
*   **Result**: Zero data duplication.

### `refreshData`
*   Action: Iterate `widgetRegistry` values.
*   Logic: Re-run SQL -> Update `widgetRegistry`.
*   **Result**: Chat bubble and Dashboard card update simultaneously.

## 3. UI Component Updates

*   `MessageBubble`: Accepts `message`. If `widgetId` exists, fetch widget from `useProjectStore(s => s.sessions[active].widgetRegistry[id])`.
*   `ReportCard`: Accepts `widget`.
