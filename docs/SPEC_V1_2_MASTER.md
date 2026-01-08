# 📦 Spec: v1.2 Master - Advanced Data & Intelligence

> **Target Version**: v1.2.0
> **Status**: Implemented
> **Core Value**: Empowering users with Smart Metrics, Templates, and deep data understanding.

## 1. Overview

This release focuses on data semantics. We introduce **Smart Metrics** (allowing users to define business logic like `profit = sales - cost`), **Analysis Templates** (reusable query patterns), and a smarter **Schema Understanding** engine.

---

## 2. Smart Metrics (Virtual Wide Tables)

### 2.1 Core Concept
Instead of relying on AI to guess formulas every time, we solidify business logic into **DuckDB Views**.
*   **Virtual Wide Table**: The system automatically `LEFT JOIN`s relevant dimension tables based on metrics' dependencies.
*   **Schema Masking**: The AI sees `v_{tableName}` (View) instead of the raw table, forcing it to use the defined metrics.

### 2.2 View Construction Logic (`rebuildView`)
When a metric is added to `FileNode(A)`:
1.  **Base**: `SELECT T1.* FROM A AS T1`
2.  **Auto-Join**: Identify relations where `A` is the source and generate `LEFT JOIN`.
3.  **Injection**: Inject calculated columns: `({metric.sqlExpression}) AS {metric.name}`.
4.  **Execution**: `CREATE OR REPLACE VIEW v_A AS ...`.

### 2.3 Data Structures
```typescript
export interface SmartMetric {
  id: string;
  name: string;          // e.g., "profit_margin"
  label: string;         // e.g., "Profit Margin"
  sqlExpression: string; // e.g., "amount - cost"
  description?: string;
}
```

---

## 3. Analysis Templates (Smart Filters)

### 3.1 Template Mode
*   **Concept**: Pre-defined analysis paths (e.g., "Sales Trend", "Customer Segmentation") that guide the user.
*   **UI**: `SmartFilterModal` allows users to configure parameters (Time Range, Categories) before running the analysis.

### 3.2 Parameter Injection
*   The AI generates SQL templates with placeholders.
*   The UI resolves these placeholders into SQL `WHERE` clauses based on user input.

---

## 4. Engineering Improvements

*   **Schema Preprocessing**: Enhanced schema mapper to support `TIMESTAMP` recognition from numeric columns.
*   **Migration Service**: Robust migration logic to upgrade v1.1 data to v1.2 structures.