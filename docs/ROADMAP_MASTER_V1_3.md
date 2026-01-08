# 🗺️ Wansan Studio: Master Roadmap (v1.3 - v1.5)

> **Strategic Focus**: **Experience & Insight**.
> **Status**: v1.4.0 Completed.

---

## ✅ v1.3.0: The "Persistence" Update (Done)

**Goal**: Eliminate memory limits and startup latency. Enable true multi-project management.
*   **Native Persistence (.duckdb)**: File-based storage.
*   **Multi-Project Architecture**: `.wansan` project bundles.
*   **Project Launcher**: New welcome screen.

---

## ✅ v1.4.0: The "Insight & Storytelling" Update (Done)

**Goal**: Transform "Data Reading" into "Interactive Storytelling".

### 1. AI Business Insight
*   **Feature**: **Insight Protocol**. AI generates structured analysis from aggregated data.
*   **Feature**: **Visual Anchoring**. Linking text insights to chart highlights (Hover to highlight).
*   **Feature**: **Auto-Localization**. EN/ZH support for generated reports.

### 2. Visualization Engine 2.0
*   **New Charts**: **Nightingale Rose**, Radar, Combo, Scatter (Smart Axis).
*   **Theme System**: "Airy" design with glassmorphism tooltips and smart layouts.
*   **UX**: No-jump configuration, edge-aligned labels.

---

## ☁️ v1.5.0: The "Connectivity" Update (Next)

**Goal**: Break the local silo. Share results and connect to live data.

### 1. Sharing (Web Export)
*   **Feature**: **Static Report Export**.
    *   Export dashboard as a standalone `.html` file.
    *   Include interactive charts (ECharts) and insights.

### 2. Live Data (Connectors)
*   **Feature**: **Database Connectors (MySQL/PostgreSQL)**.
    *   Direct connection from Electron Main Process.
    *   Real-time query execution (Hybrid Engine: DuckDB for Analytics, SQL DB for Source).

---

## 🔬 v1.6.0: The "Deep Logic" Update (Planned)

**Goal**: Advanced BI features for Power Users.

### 1. Logic
*   **Feature**: **Computed Columns (UI Builder)**.
    *   No-code formula builder for metrics (e.g., `profit = rev - cost`).
*   **Feature**: **Advanced Drill Down Actions**.
    *   Converting textual "Recommendations" into clickable filter actions.

---

## 🅿️ Parking Lot (Backlog)

*   **Plugin System**: Allow 3rd party chart libraries.
*   **Team Sync**: P2P real-time collaboration.
*   **Cloudflare R2 Sync**: One-click publish.