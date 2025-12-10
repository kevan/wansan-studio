import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as XLSX from 'xlsx'
import fs from 'fs-extra'
import * as path from 'path'
import duckdb from 'duckdb'
import { ingestExcelFile } from '../ingestion'
import { generateAnalysis, analyzeContext } from '../ai-bridge'
import { executeSQL } from '../executor'
import * as dotenv from 'dotenv'

// Load env vars
dotenv.config()

const TEST_FILE_DIR = path.join(__dirname, 'temp_test_files')
const TEST_FILE_PATH = path.join(TEST_FILE_DIR, 'nasty.xlsx')
const ORDERS_FILE_PATH = path.join(TEST_FILE_DIR, 'orders.xlsx')
const CUSTOMERS_FILE_PATH = path.join(TEST_FILE_DIR, 'customers.xlsx')

describe('Engine Robustness & Integration', () => {
  let db: duckdb.Database
  let schema: any
  let ordersSchema: any
  let customersSchema: any

  beforeAll(async () => {
    // 1. Prepare Environment
    await fs.ensureDir(TEST_FILE_DIR)
    db = new duckdb.Database(':memory:')

    // 2. Generate Nasty Excel
    const wb = XLSX.utils.book_new()
    const headers = [
      '日期',
      'Category',
      'Sub-Category',
      '销售额',
      'Profit %',
      'Test',
      'Test',
    ]
    const data = [
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
      headers,
      ['2023-01-01', 'Electronics', 'Phone', 1000, 0.1, 'A', 'B'],
      ['2023-01-02', null, 'Laptop', 2000, 0.2, 'C', 'D'],
      ['2023-01-01', 'Clothing', 'Shirt', 500, 0.3, 'E', 'F'],
      ['2023-01-02', null, 'Pants', 600, 0.4, 'G', 'H'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!merges'] = [
      { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
      { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'NastySheet')
    XLSX.writeFile(wb, TEST_FILE_PATH)

    // 3. Generate Orders & Customers for Join Test
    const wbOrders = XLSX.utils.book_new()
    const ordersData = [
      ['order_id', 'customer_id', 'amount'],
      [101, 'C001', 100],
      [102, 'C001', 200],
      [103, 'C002', 500],
    ]
    XLSX.utils.book_append_sheet(
      wbOrders,
      XLSX.utils.aoa_to_sheet(ordersData),
      'Orders',
    )
    XLSX.writeFile(wbOrders, ORDERS_FILE_PATH)

    const wbCustomers = XLSX.utils.book_new()
    const custData = [
      ['id', 'name', 'region'],
      ['C001', 'Alice', 'North'],
      ['C002', 'Bob', 'South'],
      ['C003', 'Charlie', 'North'],
    ]
    XLSX.utils.book_append_sheet(
      wbCustomers,
      XLSX.utils.aoa_to_sheet(custData),
      'Customers',
    )
    XLSX.writeFile(wbCustomers, CUSTOMERS_FILE_PATH)
  })

  afterAll(async () => {
    await fs.remove(TEST_FILE_DIR)
  })

  it('Task A: Ingestion should handle nasty files', async () => {
    const fileBuffer = await fs.readFile(TEST_FILE_PATH)
    schema = await ingestExcelFile(fileBuffer, db, 'nasty.xlsx')

    expect(schema).toBeDefined()
    expect(schema.columns).toHaveLength(7)
    const columnNames = schema.columns.map((c: any) => c.name)
    expect(columnNames).toContain('Test_1')

    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT "Category"
         FROM "${schema.tableName}"
         WHERE "Sub-Category" = 'Laptop'`,
        (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        },
      )
    })
    expect(rows[0].Category).toBe('Electronics')
  })

  it('Task B: AI Bridge should generate valid SQL', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('Skipping AI test due to missing API Key')
      return
    }

    const userQuery = '按日期统计销售额总和，并展示趋势'
    const aiResult = await generateAnalysis(userQuery, [schema], [])

    expect(aiResult.sql).toBeDefined()
    expect(aiResult.viz_type).toBe('line')
    expect(aiResult.sql).toContain('"日期"')
    ;(global as any).lastAiResult = aiResult
  })

  it('Task C: Execution should return correct aggregated data', async () => {
    const aiResult = (global as any).lastAiResult
    if (!aiResult) return

    const data = await executeSQL(aiResult.sql, db)

    expect(data).toBeDefined()
    expect(data.length).toBeGreaterThan(0)

    const xCol = aiResult.viz_config.x_axis
    const yCol = aiResult.viz_config.y_axis
    const findRow = (dateStr: string) =>
      data.find(r => String(r[xCol]).includes(dateStr))

    const row1 = findRow('2023-01-01')
    const row2 = findRow('2023-01-02')

    expect(row1).toBeDefined()
    expect(row2).toBeDefined()
    expect(Number(row1![yCol])).toBe(1500)
    expect(Number(row2![yCol])).toBe(2600)
  })

  // --- NEW: Multi-Table Tests ---

  it('Task D: Multi-Table Ingestion & Relationship Inference', async () => {
    if (!process.env.OPENAI_API_KEY) return

    // Ingest
    ordersSchema = await ingestExcelFile(
      await fs.readFile(ORDERS_FILE_PATH),
      db,
      'orders.xlsx',
    )
    customersSchema = await ingestExcelFile(
      await fs.readFile(CUSTOMERS_FILE_PATH),
      db,
      'customers.xlsx',
    )

    // AI Inference
    const { relationships, suggestedPrompts } = await analyzeContext([
      ordersSchema,
      customersSchema,
    ])
    console.log('Relation Suggestions:', JSON.stringify(relationships, null, 2))

    expect(relationships.length).toBeGreaterThan(0)

    // Look for customer_id -> id relationship
    const rel = relationships.find(
      s =>
        (s.sourceColumn === 'customer_id' && s.targetColumn === 'id') ||
        (s.sourceColumn === 'id' && s.targetColumn === 'customer_id'),
    )
    expect(rel).toBeDefined()
    // Use toBeGreaterThanOrEqual(0.5) to be slightly more lenient but still strict
    expect(rel?.confidence).toBeGreaterThanOrEqual(0.5)
  })

  it('Task E: Multi-Table Query Generation', async () => {
    if (!process.env.OPENAI_API_KEY) return

    const userQuery = '统计各区域(region)的订单总金额'
    // We pass both schemas to let AI know about available tables
    const aiResult = await generateAnalysis(
      userQuery,
      [ordersSchema, customersSchema],
      [],
    )
    console.log('Multi-Table SQL:', aiResult.sql)

    // Check for JOIN keyword (case insensitive)
    expect(aiResult.sql.toUpperCase()).toMatch(/JOIN/)

    // Execute
    const data = await executeSQL(aiResult.sql, db)
    console.log('Multi-Table Result:', data)

    // Validation
    // North: 100 (C001) + 200 (C001) + 0 (C003 has no orders) = 300
    // South: 500 (C002) = 500

    const xCol = aiResult.viz_config.x_axis // Should be region
    const yCol = aiResult.viz_config.y_axis // Should be amount

    const north = data.find(r => r[xCol] === 'North')
    const south = data.find(r => r[xCol] === 'South')

    expect(north).toBeDefined()
    expect(Number(north![yCol])).toBe(300)
    expect(Number(south![yCol])).toBe(500)
  })
})
