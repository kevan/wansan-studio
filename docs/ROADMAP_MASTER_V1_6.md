# 🗺️ Wansan Studio: Master Roadmap (v1.6 - v2.0+)

> **Core Philosophy**: **Local-First, Cloud-Enhanced.**
> **Strategic Goal**: Transform from a "Power User Tool" into a "Universal Intelligent BI Platform" by combining deep data intelligence with seamless cloud accessibility.

---

## 🚀 v1.6: The "Foundations" Update (基石版本)

**Theme**: Improving SQL reliability and lowering the barrier to entry.

### 🧠 Track A: Intelligence (Intelligence & Power)
1.  **Semantic Layer (语义层) [P0]**:
    *   **AI Auto-Tagging**: Ingest time auto-aliasing (e.g., `amt` -> `业绩`, `revenue`).
    *   **Business Types**: Recognition of Cities, Currency, IDs for smarter visualization choices.
2.  **Silent Reflection (反思层) [P1]**:
    *   **Pre-Execution Validation**: Use `EXPLAIN` to catch Binder Errors.
    *   **Background Self-Healing**: Fix SQL before the user sees an error.
3.  **Engine Expansion**:
    *   **Native Connectors**: Read-only connection to **PostgreSQL** and **MySQL** (Snapshot mode).
    *   **Format Support**: Native **Parquet** support with Hive-Partitioning write/read capability (Cloud Ready).
    *   **Robust Type System**: Enforce `DECIMAL` for currency and `INT64` for timestamps to align with Enterprise standards.

### ☁️ Track B: Reach (Infrastructure)
1.  **Managed AI Gateway (托管 AI 网关) [P0 - Strategic Pivot]**:
    *   **Zero-Config Mode**: Users can use Wansan without their own OpenAI Key.
    *   **SaaS Subscription**: Introduce a Pro plan with bundled AI tokens.
    *   **Privacy Guard**: Schema-only protocol maintained through the gateway.

---

## 🧠 v1.7: The "Augmentation" Update (数据增强版本)

**Theme**: Processing dirty data and enabling simple sharing.

### 🧠 Track A: Intelligence
1.  **AI Column Extractor (非结构化转结构化) [Killer Feature]**:
    *   Extract sentiment, topics, and entities from long-text columns (e.g., Customer Reviews).
2.  **Fuzzy Join (模糊匹配关联)**:
    *   Link tables with non-identical names (e.g., "Apple" vs "Apple Inc.") using DuckDB string similarity.
3.  **Advanced DuckDB Syntax**:
    *   Support for `PIVOT` / `UNPIVOT` and `SELECT * EXCLUDE` in AI generated plans.

### ☁️ Track B: Reach
1.  **Cloud Project Sync (项目云同步)**:
    *   **BYOS (Bring Your Own Storage)**: Support for Cloudflare R2 / AWS S3 sync.
    *   **One-Click Publish**: Generate a public/private URL for the Web Export report.
2.  **Web Viewer (Lite)**:
    *   A server-side component to host and view exported reports online without downloading HTML files.

---

## 📈 v1.8: The "Insight" Update (深度分析版本)

**Theme**: Professional-grade analytical capabilities.

### 🧠 Track A: Intelligence
1.  **Auto-Attribution (自动归因分析)**:
    *   "Why did metric X change?" -> System automatically drills down to find the root cause.
2.  **Smart Time Intelligence**:
    *   Native MoM (环比) / YoY (同比) analysis with period-over-period templates.
3.  **Auto-Analyst (主动概览)**:
    *   AI proactively scans data upon import to generate a "First Impression Report".

### ☁️ Track B: Reach
1.  **Team Collaboration (团队协作)**:
    *   Shared Project Bundles with access control.
    *   Shared Business Domain Memory across the team.
2.  **Data Alerts (数据预警)**:
    *   Schedule-based checks on local DuckDB -> Push notifications/emails via Wansan Cloud.

---

## 🔬 v2.0 & Beyond: The "Ecosystem" Era (平台生态)

1.  **Visualization Plugin System**: Allow 3rd party React/D3 components as chart types.
2.  **Local LLM Integration**: Full offline mode via **Ollama** support for maximum privacy.
3.  **DuckDB VSS**: Semantic search within data rows using vector embeddings.
4.  **Mobile Companion**: Read-only mobile app for checking cloud-synced dashboards.

---

## 🛑 Summary of Priorities

| Version | Focus | Cloud Component |
| :--- | :--- | :--- |
| **v1.6** | Reliability & Ease of Use | **Managed AI Gateway** |
| **v1.7** | Data Cleaning & AI ETL | **Cloud Sync & Hosting** |
| **v1.8** | Professional Root Cause | **Team Collaboration** |