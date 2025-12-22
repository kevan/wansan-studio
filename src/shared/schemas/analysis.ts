import { z } from 'zod'

export const ParamSchema = z.object({
  placeholder: z.string().describe('The placeholder in SQL, e.g., {{CITY}}'),
  label: z.string().describe('Human readable label for the parameter'),
  column: z.string().describe('Target column name for distinct query'),
  table: z.string().describe('Target table name for distinct query'),
  hint: z.string().optional().describe('Fuzzy search term provided by user')
})

export type FilterParam = z.infer<typeof ParamSchema>

// Base visualization schema (assuming structure based on existing usage)
const VisualizationSchema = z.object({
  type: z.enum(['bar', 'line', 'pie', 'area', 'scatter', 'kpi', 'table', 'text']),
  config: z.object({
    x_axis: z.string().optional().nullable(),
    y_axis: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    series_name: z.string().optional()
  }).optional()
})

export const AnalysisResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  sql: z.string(),
  reasoning: z.string().optional(),
  visualization: VisualizationSchema.optional(),
  suggestions: z.array(z.string()).optional(),
  
  // v1.2 Smart Filter Fields
  is_template: z.boolean().optional().default(false),
  missing_params: z.array(ParamSchema).optional()
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>
