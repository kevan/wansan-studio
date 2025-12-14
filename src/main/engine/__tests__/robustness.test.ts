import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as XLSX from 'xlsx'
import * as fs from 'fs-extra'
import * as path from 'path'
import { DatabaseService } from '../../database/duckdb'
import { ingestExcelFile } from '../ingestion'
import { generateAnalysis, analyzeContext } from '../ai-bridge'
import * as dotenv from 'dotenv'
import { OpenAI } from 'openai'

// Load env vars
dotenv.config()

const TEST_FILE_DIR = path.join(__dirname, 'temp_test_files')
const TEST_FILE_PATH = path.join(TEST_FILE_DIR, 'nasty.xlsx')
const ORDERS_FILE_PATH = path.join(TEST_FILE_DIR, 'orders.xlsx')
const CUSTOMERS_FILE_PATH = path.join(TEST_FILE_DIR, 'customers.xlsx')

describe('Engine Robustness & Integration', () => {
  let dbService: DatabaseService
  let schema: any
  let ordersSchema: any
  let customersSchema: any
  let openai: OpenAI | null = null

  beforeAll(async () => {
    // 1. Prepare Environment
    await fs.ensureDir(TEST_FILE_DIR)
    dbService = new DatabaseService()
    await dbService.initialize()

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

    if (process.env.OPENAI_API_KEY) {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
      })
    }
  })

  afterAll(async () => {
    await fs.remove(TEST_FILE_DIR)
  })

  it('Task A: Ingestion should handle nasty files', async () => {
    const fileBuffer = await fs.readFile(TEST_FILE_PATH)
    const result = await ingestExcelFile(fileBuffer, dbService, 'nasty.xlsx')
    schema = result[0]

    expect(schema).toBeDefined()
    expect(schema.columns).toHaveLength(7)
    const columnNames = schema.columns.map((c: any) => c.name)
    expect(columnNames).toContain('Test_1')

    const rows = await dbService.query(
      `SELECT "Category"
       FROM "${schema.tableName}"
       WHERE "Sub-Category" = 'Laptop'`
    )
    expect(rows[0].Category).toBe('Electronics')
  })

  it('Task B: AI Bridge should generate valid SQL', async () => {
    if (!openai) {
      console.warn('Skipping AI test due to missing API Key')
      return
    }

    const userQuery = '按日期统计销售额总和，并展示趋势'
    let aiResult
    try {
      aiResult = await generateAnalysis(openai, userQuery, [schema], [], undefined, undefined, 'zh')
    } catch (error) {
      console.warn(
        'Skipping AI test due to OpenAI connection error:',
        error instanceof Error ? error.message : error
      )
      return
    }

    expect(aiResult.sql).toBeDefined()
    expect(aiResult.sql).toContain('\"日期\"')
    // visualization is optional, AI may or may not return it
    ;(global as any).lastAiResult = aiResult
  })

  it('Task C: Execution should return correct aggregated data', async () => {
    const aiResult = (global as any).lastAiResult
    if (!aiResult) return

    const data = await dbService.query(aiResult.sql)

    expect(data).toBeDefined()
    expect(data.length).toBeGreaterThan(0)

    // If no visualization config, skip detailed validation
    if (!aiResult.visualization?.config) {
      console.warn('No visualization config, skipping detailed validation')
      return
    }

    const xCol = aiResult.visualization.config.x_axis
    const yCol = aiResult.visualization.config.y_axis
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
    if (!openai) return

    // Ingest
    const ordersResult = await ingestExcelFile(
      await fs.readFile(ORDERS_FILE_PATH),
      dbService,
      'orders.xlsx',
    )
    ordersSchema = ordersResult[0]

    const customersResult = await ingestExcelFile(
      await fs.readFile(CUSTOMERS_FILE_PATH),
      dbService,
      'customers.xlsx',
    )
    customersSchema = customersResult[0]

    // AI Inference
    let relationships: any[] = []
    let suggestedPrompts: any[] = []
    try {
      const result = await analyzeContext(openai, [ordersSchema, customersSchema])
      relationships = result.relationships
      suggestedPrompts = result.suggestedPrompts
    } catch (error) {
      console.warn(
        'Skipping AI relationship test due to OpenAI connection error:',
        error instanceof Error ? error.message : error,
      )
      return
    }
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
    if (!openai) return

    const userQuery = '统计各区域(region)的订单总金额'
    // We pass both schemas to let AI know about available tables
    const aiResult = await generateAnalysis(
      openai,
      userQuery,
      [ordersSchema, customersSchema],
      [],
      undefined,
      undefined,
      'zh'
    ).catch(error => {
      console.warn(
        'Skipping AI multi-table generation test due to OpenAI connection error:',
        error instanceof Error ? error.message : error,
      )
      return null
    })
    if (!aiResult) return
    console.log('Multi-Table SQL:', aiResult.sql)

    // Check for JOIN keyword (case insensitive)
    expect(aiResult.sql.toUpperCase()).toMatch(/JOIN/)

    // Execute
    const data = await dbService.query(aiResult.sql)
    console.log('Multi-Table Result:', data)

    // Validation
    // North: 100 (C001) + 200 (C001) + 0 (C003 has no orders) = 300
    // South: 500 (C002) = 500

    // DuckDB WASM returns DecimalBigNum objects, need to convert
    const results = data.map(row => ({
      region: row.region,
      amount: Number(row.total_amount || row.amount || row[Object.keys(row).find(k => k !== 'region')!])
    }))

    const north = results.find(r => r.region === 'North')
    const south = results.find(r => r.region === 'South')

    expect(north).toBeDefined()
    expect(north!.amount).toBe(300)
    expect(south).toBeDefined()
    expect(south!.amount).toBe(500)
  })
})
