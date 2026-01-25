const path = require('path');
const fs = require('fs');

const ROW_COUNT = 1000000;
const parquetPath = path.join(process.cwd(), 'huge_test_data.parquet');

async function generateHugeParquet() {
  console.log(`🚀 Starting generation of ${ROW_COUNT.toLocaleString()} rows Parquet file...`);
  
  // Dynamic import for ESM module in CJS
  const { DuckDBInstance } = await import('@duckdb/node-api');
  
  // Initialize DuckDB
  const db = await DuckDBInstance.create(':memory:');
  const connection = await db.connect();

  console.log(`🧠 Generating data in memory using SQL...`);

  // SQL to generate random data
  // ID, Date, Product, Category, Amount, Status
  const generateSql = `
    CREATE TABLE huge_data AS
    SELECT 
      i AS ID,
      (TIMESTAMP '2023-01-01 00:00:00' + i * INTERVAL '1 minute') AS Date,
      ['Gizmo A', 'Widget B', 'Gadget C', 'Doodad D', 'Thingamajig E'][floor(random() * 5 + 1)::int] AS Product,
      ['Electronics', 'Home', 'Office', 'Toys', 'Garden'][floor(random() * 5 + 1)::int] AS Category,
      round(random() * 1000, 2) AS Amount,
      ['Completed', 'Pending', 'Cancelled', 'Shipped'][floor(random() * 4 + 1)::int] AS Status
    FROM range(1, ${ROW_COUNT} + 1) AS t(i)
  `;

  const start = Date.now();
  await connection.run(generateSql);
  const mid = Date.now();
  console.log(`✅ Data generated in-memory in ${((mid - start) / 1000).toFixed(2)}s`);

  console.log(`💾 Exporting to Parquet: ${parquetPath}...`);
  
  // Export to Parquet
  // Ensure we handle backslashes for Windows paths if necessary
  const safeParquetPath = parquetPath.replace(/\\/g, '/');
  await connection.run(`COPY huge_data TO '${safeParquetPath}' (FORMAT PARQUET)`);
  
  const end = Date.now();
  console.log(`✅ Export complete in ${((end - mid) / 1000).toFixed(2)}s`);

  const stats = fs.statSync(parquetPath);
  console.log('\n✨ Generation Complete!');
  console.log(`-----------------------------------`);
  console.log(`📄 Parquet: ${parquetPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`📊 Rows: ${ROW_COUNT.toLocaleString()}`);
  console.log(`⏱️ Total Time: ${((end - start) / 1000).toFixed(2)}s`);
  console.log(`-----------------------------------`);

  // Cleanup
  // Note: Node API connection doesn't always have .close(), but instance should be terminated if possible
  // For script execution, process exit will handle it.
}

generateHugeParquet().catch(err => {
  console.error('❌ Generation failed:', err);
});