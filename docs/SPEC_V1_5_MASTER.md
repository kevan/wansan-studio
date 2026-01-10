# ⚡ Spec: v1.5 Release - Insight, Power & Reach

> **Release Version**: v1.5.0
> **Status**: Implemented / Ready for QA
> **Theme**: Bridging the gap between "Data Storytelling" (AI Insight) and "Professional Control" (SQL Lab), while enabling "Universal Sharing" (Web Export).

---

## 1. Overview

This milestone unifies three major capability upgrades:
1.  **Insight (Deep understanding)**: Transforming charts into narratives with **AI Business Insight** and **Visual Anchoring**.
2.  **Power (Expert control)**: Giving analysts direct, intelligent control via **Smart SQL Lab**.
3.  **Reach (Sharing)**: Breaking the local silo with offline-capable **Web Report Export**.

---

## 2. AI Business Insight (The "Why")

### 2.1 The Insight Protocol
*   **Privacy First**: Only aggregated chart data (e.g., the 10 bars in a bar chart) is sent to the LLM. No raw rows.
*   **Structure**: AI returns structured JSON (`InsightResult`) containing:
    *   `summary`: High-level conclusion.
    *   `findings`: Array of observations with `sentiment` (positive/negative/warning).
    *   `recommendation`: Actionable advice.

### 2.2 Visual Anchoring
*   **Interaction**: Hovering over a text finding -> **Highlights** the related chart elements.
*   **Mechanism**:
    *   Findings contain `relatedItems: string[]` (e.g., `["East Region", "Q3"]`).
    *   Chart engine receives these IDs and applies a **Focus/Blur** effect: Highlighted items stay opaque, others fade to 10% opacity.

### 2.3 Interactive Verification (Human-in-the-Loop)
*   **Edit Mode**: Users can manually correct AI hallucinations.
    *   **Modify**: Edit markdown text for any finding.
    *   **Anchor**: Manually add/remove `relatedItems` tags to fix visual linking.
    *   **Sentiment**: Change sentiment classification.

---

## 3. Smart SQL Lab (The "Power")

### 3.1 Monaco Editor Integration
*   **Core**: Replaced simple textarea with VS Code's editor engine (`monaco-editor`).
*   **Features**: Syntax highlighting, auto-formatting, improved performance.

### 3.2 Schema Intelligence
*   **Context Awareness**: The editor "knows" the local DuckDB schema.
*   **Autocomplete**:
    *   `SELECT * FROM t_...` -> Suggests `t_sales`, `t_users`.
    *   `t_sales.` -> Suggests `amount`, `region` (with types).
*   **Safety**: Auto-quotes identifiers to handle Chinese table names safely.

### 3.3 Direct Viz Workflow
*   **Flow**: Write SQL -> Run Preview -> "Send to Chat".
*   **Result**: The query result becomes a standard Report Card, fully editable and interactive.

---

## 4. Report Evolution (The "Flow")

### 4.1 Continuous Report Mode
*   **Concept**: A seamless, vertical document stream (breaking the "page" boundary).
*   **Features**:
    *   **Rich Text**: Direct usage of Markdown headers, lists, and quotes.
    *   **Drag & Drop**: Reorder sections naturally.
    *   **Auto-Height**: Cards expand to fit the narrative content.

### 4.2 Interactive KPI Grids
*   **Behavior**:
    *   **Hover**: Hovering one KPI card blurs the others.
    *   **Link**: Highlighting a KPI anchors to the relevant chart series.

### 4.3 Visualization 2.0
*   **New Types**: Rose, Radar, Combo, Scatter (Smart Axis).
*   **Design**: "Airy" theme (Glassmorphism, No Borders, Soft Shadows).

---

## 5. Web Export (The "Reach")

### 5.1 The "Hydration Pack" Strategy
Instead of server-side rendering, we package a lightweight React runtime into a single HTML file.

*   **Output**: Standalone `.html` file.
*   **Content**:
    *   **Runtime**: React + ReactDOM + ECharts (UMD).
    *   **Data**: JSON snapshot of the current Report state (`window.__WANSAN_SNAPSHOT__`).
    *   **Logic**: A minified "Player" component that hydrates the JSON into a read-only Dashboard.

### 5.2 Capabilities
*   **Offline First**: Works without internet.
*   **Interactive**: Tooltips, Legend Toggles, and Zooming still work.
*   **Fidelity**: 100% visual match with the Desktop App.

---
