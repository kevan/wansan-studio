# 🗺️ Wansan Studio: Master Roadmap (v1.6 - v2.0)

> **Strategic Theme**: **Deep Data Intelligence (Local-First)**
> **Status**: Planning
> **Vision**: Empowering the desktop analyst with AI-augmented understanding (Semantics), processing (ETL), and insight (Causality), all running 100% locally.

---

## 🚀 v1.6: The "Semantic" Update (语义与连接)

**Goal**: Make the AI understand the *business meaning* of data and connect to more local sources.

### 1. Semantic Layer (语义层) [P0]
*   **AI Auto-Tagging**: Ingest time auto-aliasing (e.g., `amt` -> `业绩`, `revenue`).
*   **Business Types**: Recognition of Cities, Currency, IDs for smarter visualization choices.
*   **Metadata Injection**: Inject aliases into the System Prompt to fix "hallucinated column" errors.

### 2. Engine Expansion (引擎增强) [P1]
*   **Native Connectors**: Read-only connection to local **PostgreSQL** and **MySQL** instances (Snapshot mode).
*   **Format Support**: Native **Parquet** support with Hive-Partitioning write/read capability.
*   **Robust Type System**: Enforce `DECIMAL` for currency and `INT64` for timestamps.

### 3. Silent Reflection (反思层) [P2]
*   **Pre-Execution Validation**: Use `EXPLAIN` to catch Binder Errors before execution.
*   **Background Self-Healing**: Fix SQL silently without showing error screens to the user.

---

## 🧠 v1.7: The "Augmentation" Update (增强与清洗)

**Goal**: Use local AI to turn "Dirty/Unstructured" data into "Analytical" data.

### 1. AI Column Extractor (非结构化转结构化) [Killer Feature]
*   **Scenario**: An Excel file has a "Customer Feedback" column.
*   **Feature**: AI generates a new virtual column `sentiment` (Positive/Negative) or `tags` from the text.
*   **Tech**: Batch processing via LLM.

### 2. Fuzzy Join (模糊关联)
*   **Scenario**: Table A has "Alibaba", Table B has "Alibaba Group".
*   **Solution**: Smart linking using DuckDB string similarity (`levenshtein`) assisted by AI.

### 3. Auto-Cleaning Agent
*   **Feature**: AI suggests cleaning rules during ingestion (e.g., "Standardize Date Formats", "Fix Typos").

---

## 📈 v1.8: The "Insight" Update (深度分析)

**Goal**: Provide "Why" and "What Next", moving beyond "What Happened".

### 1. Auto-Attribution (自动归因)
*   **Scenario**: "Why did Sales drop in Q3?"
*   **Analysis**: System automatically drills down into dimensions (Region, Product) to find the segment with the largest negative contribution.

### 2. Smart Time Intelligence
*   **Native Logic**: Built-in MoM (Month-over-Month) and YoY (Year-over-Year) templates using Window Functions (`lag()`).
*   **Time Awareness**: Auto-recognition of Fiscal Years and Quarters.

### 3. Auto-Analyst (主动概览)
*   **Feature**: Upon import, AI proactively scans data to generate a "First Impression Report" (Key metrics, Trends, Outliers) without user prompting.

---

## 🔬 v2.0: The "Sovereign" Update (主权与生态)

**Goal**: Total independence from the cloud.

### 1. Local LLM Integration (Ollama)
*   **Feature**: First-class support for **Ollama**.
*   **Value**: Run Llama 3 / Mistral locally. True offline AI analysis for sensitive data.

### 2. Visualization Plugin System
*   **Feature**: Allow developers to load custom chart types (D3.js / React) via plugins.

### 3. DuckDB VSS (Vector Search)
*   **Feature**: Semantic search within data rows using local vector embeddings.

---

## 🛑 Summary of Priorities

| Version | Theme | Key Value |
| :--- | :--- | :--- |
| **v1.6** | **Semantics** | AI understands "Business Speak" & connects to SQL DBs. |
| **v1.7** | **Augmentation** | AI cleans dirty data & extracts tags from text. |
| **v1.8** | **Insight** | AI explains "Why" things changed (Attribution). |
| **v2.0** | **Sovereignty** | Full offline AI (Ollama) & Plugin Ecosystem. |
