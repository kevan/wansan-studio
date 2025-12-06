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
