export type ColumnType = 'VARCHAR' | 'DOUBLE' | 'BOOLEAN' | 'DATE';

export interface ColumnSchema {
  name: string;       // Original column name (e.g., "销售额(万元)")
  safeName: string;   // Sanitized name for SQL (e.g., "销售额(万元)") - *DuckDB supports utf8, but quoting is mandatory*
  type: ColumnType;   // Inferred DuckDB type
  sampleValues: any[]; // Top 3 non-null values for AI context
  nullable?: boolean; // From UI state, indicates if column can have nulls
  isKey?: boolean;    // From UI state, indicates if column is a join key
}

export interface TableSchema {
  tableName: string;  // Normalized table name (e.g., "t_orders")
  columns: ColumnSchema[];
  primaryKey?: string; // [NEW FIELD] Optional hint for AI to know the Primary Key
}

export interface AnalysisResult {
  sql: string;
  title: string;
  summary: string;
  viz_type: 'bar' | 'line' | 'pie' | 'table';
  viz_config: {
    x_axis: string;
    y_axis: string;
    series_name?: string;
  };
  reasoning: string;
  error?: string;
}

// [UPDATE] Add this new interface
export interface RelationSuggestion {
  sourceTable: string;  // e.g., "t_orders"
  sourceColumn: string; // e.g., "product_id"
  targetTable: string;  // e.g., "t_products"
  targetColumn: string; // e.g., "id"
  confidence: number;   // 0.0 to 1.0
  reason: string;       // Explanation for the UI (e.g. "Column names match")
}
