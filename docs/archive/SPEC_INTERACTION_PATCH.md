# 🛠️ Spec: Interaction Polish & Gaps

> **Status**: Supplement to Core Specs.
> **Focus**: Refinements identified during UI Audit.

## 1. Data Management Polish

### 1.1 "Start Analysis" Floating Action
*   **Context**: `DataWorkspaceLayout`.
*   **Behavior**:
    *   **Visibility**: Only show when `activeView !== 'chat'`.
    *   **Position**: Fixed center bottom (`bottom-6`).
    *   **Z-Index**: `z-50`, must be above scrolling content.
    *   **Action**: `setView('chat')`.

### 1.2 Relationship Manager Form
*   **Components**: Use Shadcn `Select` (Not native).
*   **Display**: Show `fileName` (Not UUID).
*   **Validation**: Disable "Link" button if Source/Target or Columns are empty.

## 2. Dashboard Polish

### 2.1 Header Controls
*   **Page Counter**: `[ - ] N Pages [ + ]`. Only visible in `A4` mode.
*   **Zoom Reset**: Double-click Zoom percentage to reset to 100%.

### 2.2 Card Actions
*   **Expand**: Opens `ChartFullView` (Modal).
*   **Refine**: In Chat, sets `replyToId`. In Dashboard, maybe disabled or links back to chat? (Decision: Disable Refine in Dashboard for now).

## 3. Global Polish

### 3.1 Toast System
*   **Position**: Top Center.
*   **Style**: Glassmorphism (`backdrop-blur`).
*   **Z-Index**: `99999` (Above everything).

### 3.2 Window Drag
*   **Region**: Only the top Global Header bar.
*   **Exceptions**: Inputs/Buttons inside header must be `.non-draggable`.
*   **Double Click**: Middle empty space toggles maximize.

