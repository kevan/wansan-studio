import * as XLSX from 'xlsx';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Database } from 'duckdb';
import { ingestExcelFile } from '../src/main/engine/ingestion';
import { generateAnalysis } from '../src/main/engine/ai-bridge';
import { executeSQL } from '../src/main/engine/executor';
import { TableSchema } from '../src/shared/types';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Ensure OpenAI Key
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  WARNING: OPENAI_API_KEY is not set. AI tests will fail or must be mocked.");
}

async function createNastyExcel(filePath: string) {
  const wb = XLSX.utils.book_new();
  
  // Data with:
  // 1. Empty rows at start
  // 2. Merged Cells (Category A covers 2 rows)
  // 3. Chinese Headers
  // 4. Duplicate Headers (Test, Test)
  // 5. Special Chars (Profit %)
  // 6. Dates (Mixed format if possible, but let's stick to standard Excel dates)
  
  const headers = ["日期", "Category", "Sub-Category", "销售额", "Profit %", "Test", "Test"];
  const data = [
    [null, null, null, null, null, null, null], // Empty Row
    [null, null, null, null, null, null, null], // Empty Row
    headers,
    ["2023-01-01", "Electronics", "Phone", 1000, 0.1, "A", "B"],
    ["2023-01-02", null,          "Laptop", 2000, 0.2, "C", "D"], // Should take "Electronics" from merge
    ["2023-01-01", "Clothing",    "Shirt",  500,  0.3, "E", "F"],
    ["2023-01-02", null,          "Pants",  600,  0.4, "G", "H"]  // Should take "Clothing" from merge
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Add Merges
  // "Electronics" is at Row 3 (index 3), Col 1 (index 1). It should cover Row 3 and 4.
  // "Clothing" is at Row 5 (index 5), Col 1 (index 1). It should cover Row 5 and 6.
  ws['!merges'] = [
    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
    { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "NastySheet");
  XLSX.writeFile(wb, filePath);
  console.log(`✅ Generated Nasty Excel at: ${filePath}`);
}

async function runTest() {
  console.log("🚀 Starting Robustness Test...");
  const db = new Database(':memory:');
  const testFilePath = path.join(__dirname, 'test_nasty.xlsx');

  try {
    // --- Step 1: Generate File ---
    await createNastyExcel(testFilePath);
    const fileBuffer = await fs.readFile(testFilePath);

    // --- Step 2: Test Ingestion (Task A) ---
    console.log("\n🧪 Task A: Testing Ingestion...");
    const schema = await ingestExcelFile(fileBuffer, db);
    console.log("Schema Detected:", JSON.stringify(schema, null, 2));

    // Validation A1: Check Header Normalization
    const columnNames = schema.columns.map(c => c.name);
    if (columnNames.includes("Test_1")) {
      console.log("✅ Header Normalization passed (Duplicates handled).");
    } else {
      console.error("❌ Header Normalization failed. Expected 'Test_1', got:", columnNames);
    }

    // Validation A2: Check Unmerge
    // Query the data to see if 'Electronics' was filled down
    const checkMerge = await new Promise<any[]>((resolve, reject) => {
      db.all(`SELECT "Category" FROM "${schema.tableName}" WHERE "Sub-Category" = 'Laptop'`, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    
    if (checkMerge[0]?.Category === 'Electronics') {
      console.log("✅ Unmerge Logic passed (Value filled down).");
    } else {
      console.error("❌ Unmerge Logic failed. Expected 'Electronics', got:", checkMerge[0]?.Category);
    }


    // --- Step 3: Test AI Bridge (Task B) ---
    console.log("\n🧪 Task B: Testing AI Bridge (Schema-Only Prompt)...");
    const userQuery = "按日期统计销售额总和，并展示趋势";
    
    let aiResult;
    // Check if API key is present before calling
    if (!process.env.OPENAI_API_KEY) {
        console.log("⚠️  Skipping AI Test (No API Key). Using MOCK response for Task C.");
        aiResult = {
          sql: `SELECT strptime("日期", '%Y-%m-%d') AS "dt", SUM("销售额") AS "total_sales" FROM "${schema.tableName}" GROUP BY "dt" ORDER BY "dt" ASC LIMIT 100`,
          title: "销售趋势分析",
          summary: "销售额随日期的变化趋势。",
          viz_type: "line",
          viz_config: { x_axis: "dt", y_axis: "total_sales" },
          reasoning: "Mocked response"
        };
    } else {
        aiResult = await generateAnalysis(userQuery, [schema]);
        console.log("AI Result:", JSON.stringify(aiResult, null, 2));

        // Validation B1: SQL Quote Check
        if (aiResult.sql.includes(`"日期"`)) {
          console.log("✅ SQL Quoting passed (Chinese columns quoted).");
        } else {
          console.error("❌ SQL Quoting failed. SQL:", aiResult.sql);
        }
    }

    // --- Step 4: Test Execution & Visualization (Task C) ---
    console.log("\n🧪 Task C: Testing Execution & Viz Config...");
    const data = await executeSQL(aiResult.sql, db);
    console.log(`Received ${data.length} rows of data.`);

    if (aiResult.viz_type === 'line') {
      console.log("✅ Visualization Type passed (Detected 'line' for trend).");
    } else {
      console.warn(`⚠️  Visualization Type warning. Expected 'line', got '${aiResult.viz_type}'.`);
    }

    if (data.length > 0) {
       console.log("✅ Data Execution passed.");
    }

  } catch (error) {
    console.error("💥 Test Failed:", error);
  } finally {
    // Cleanup
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

runTest();
