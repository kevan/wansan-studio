# 🛠️ Technical Spec: Smart Metrics (Virtual Wide Tables)

> **Version**: 1.0
> **Status**: Approved
> **Feature**: User-defined computed columns with auto-join capabilities.

## 1. Core Concept: The Semantic Layer

Smart Metrics allows users to define business logic (e.g., `profit = sales - cost`) directly within the application.
Instead of relying on AI to construct these formulas ad-hoc (which leads to inconsistency), we solidify them into **DuckDB Views**.

* **Virtual Wide Table**: The system automatically `LEFT JOIN`s relevant dimension tables based on the metrics' dependencies.
* **Schema Masking**: The AI is presented with the `v_{tableName}` (View) *instead* of the raw `{tableName}`, ensuring it always uses the defined metrics.

## 2. Data Structures

### 2.1 Type Definitions (`src/shared/types/index.ts`)

```typescript
export interface SmartMetric {
  id: string;            // UUID
  name: string;          // Database column alias (e.g., "profit_margin")
  label: string;         // Human readable (e.g., "Profit Margin")
  sqlExpression: string; // SQL Fragment (e.g., "amount - products__cost")
  description?: string;  // Context for AI
  dataType?: string;     // Cached type (e.g., "DOUBLE")
}

export interface FileNode {
  // ... existing fields
  smartMetrics?: SmartMetric[]; // Persisted metrics
}

```

## 3. Architecture: DuckDB View Manager

We do not modify physical tables. We manage a parallel layer of Views.

## 3.1 Naming Convention (Updated)

* **Raw Table**: `orders`
* **Metric View**: `v_orders`
* **Joined Columns Strategy**:
    * **Prefix**: The **Source Join Column** (Foreign Key).
    * **Format**: `{sourceColumn}__{targetField}` (Double underscore separator).
    * **Example**: If `orders.product_id` links to `products.id` and we fetch `cost`:
        * Result: `product_id__cost`
    * **Rationale**: Source columns (e.g., `product_id`, `sales_rep_id`) are significantly shorter and more semantic than table names (e.g., `data_export_2024_final`).

### 3.2 View Construction Logic (`rebuildView`)

When a metric is added/updated in `FileNode(A)`, we rebuild `v_A`:

1. **Base**: `SELECT T1.* FROM A AS T1`
2. **Auto-Join**:
* Identify all relations where `A` is the source.
* Generate `LEFT JOIN B AS T_{i} ON T1.fk = T_{i}.pk`


3. **Column Injection**:
* Inject Dimension Columns: `T_{i}.col AS B__col`
* Inject Metrics: `({metric.sqlExpression}) AS {metric.name}`


4. **Execution**: `CREATE OR REPLACE VIEW v_A AS ...`

## 4. AI Integration: Schema Masking

To enforce consistency, the AI must prefer the View over the Raw Table.

### 4.1 Prompt Engineering (`src/main/engine/prompts.ts`)

When generating the schema context for the LLM:

* **IF** `file.smartMetrics` exists:
* **Hide**: Do not list `orders`.
* **Show**: List `v_orders`.
* **Describe**: "v_orders (Enriched View with Metrics)".
* **Columns**: List Native Columns + Metric Columns (marked `[Calculated]`) + Joined Columns (marked `[Joined]`).


* **ELSE**:
* Show `orders` as normal.
