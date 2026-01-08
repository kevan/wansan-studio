# ⌨️ Spec: Smart SQL Editor (Pro Mode)

> **Target Version**: v1.5.0
> **Core Value**: Providing a VS-Code-like SQL editing experience for professional users.

## 1. Overview
Upgrade the existing lightweight SQL editor to a full-featured **Monaco Editor** with intelligent auto-completion aware of the local DuckDB schema.

## 2. Technical Stack
*   **Editor**: `@monaco-editor/react`
*   **Data Source**: `useProjectStore` (FileNodes -> TableSchema)
*   **Language**: SQL (PostgreSQL dialect for DuckDB compatibility)

## 3. Key Features

### 3.1 Schema-Aware Autocomplete
The editor will provide suggestions for:
*   **Table Names**: All tables currently ingested into the project.
*   **Column Names**: Context-sensitive columns based on the table name.
*   **DuckDB Functions**: Common functions like `date_trunc`, `approx_count_distinct`, etc.

### 3.2 SQL Formatting
Leverage `sql-formatter` (already in project) to provide a "Format SQL" button and `Shift+Alt+F` support.

### 3.3 Smart Snippets
Provide common patterns for Wansan analysis:
*   `SELECT * FROM table LIMIT 10`
*   Aggregation templates (`GROUP BY`, `COUNT(*)`)

## 4. Implementation Plan

### 4.1 Global Completion Registry
Create a utility function `registerSqlCompletion(monaco, schemas)` that:
1.  Clears previous table/column definitions.
2.  Registers `monaco.languages.registerCompletionItemProvider`.
3.  Maps `TableSchema` from `useProjectStore` to `CompletionItem` objects.

### 4.2 Component: `MonacoSqlEditor.tsx`
A wrapper around `@monaco-editor/react` that:
*   Handles theme switching.
*   Triggers schema registration on mount/update.
*   Provides a clean API for `value` and `onChange`.

### 4.3 Integration Points
*   **Query Panel**: The primary SQL Lab interface.
*   **Metric Editor**: For defining formula-based Smart Metrics.

## 5. UI/UX Refinement
*   **Loading State**: Show a skeleton or spinner while Monaco bundles are loading.
*   **Pro Gate**: Ensure this remains a Pro-only feature as defined in requirements.
