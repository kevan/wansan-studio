const fs = require('fs');
const path = require('path');

const ROW_COUNT = 1000000;
const csvPath = path.join(process.cwd(), 'huge_test_data.csv');
const jsonPath = path.join(process.cwd(), 'huge_test_data.json');

const products = ['Gizmo A', 'Widget B', 'Gadget C', 'Doodad D', 'Thingamajig E'];
const categories = ['Electronics', 'Home', 'Office', 'Toys', 'Garden'];
const statuses = ['Completed', 'Pending', 'Cancelled', 'Shipped'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function generateHugeData() {
  console.log(`🚀 Starting generation of ${ROW_COUNT.toLocaleString()} rows...`);

  // --- CSV Generation ---
  const csvStream = fs.createWriteStream(csvPath);
  csvStream.write('ID,Date,Product,Category,Amount,Status\n');

  // --- JSON Generation ---
  const jsonStream = fs.createWriteStream(jsonPath);
  jsonStream.write('[\n');

  const startDate = new Date('2023-01-01T00:00:00Z');

  for (let i = 1; i <= ROW_COUNT; i++) {
    const date = new Date(startDate.getTime() + i * 60000); // Incremental minutes
    const dateStr = date.toISOString().split('.')[0].replace('T', ' ');
    const product = getRandomItem(products);
    const category = getRandomItem(categories);
    const amount = (Math.random() * 1000).toFixed(2);
    const status = getRandomItem(statuses);

    // CSV Row
    const csvRow = `${i},${dateStr},"${product}","${category}",${amount},${status}\n`;
    if (!csvStream.write(csvRow)) {
      await new Promise(resolve => csvStream.once('drain', resolve));
    }

    // JSON Item
    const jsonItem = {
      ID: i,
      Date: dateStr,
      Product: product,
      Category: category,
      Amount: parseFloat(amount),
      Status: status
    };
    const jsonRow = `  ${JSON.stringify(jsonItem)}${i === ROW_COUNT ? '' : ','}\n`;
    if (!jsonStream.write(jsonRow)) {
      await new Promise(resolve => jsonStream.once('drain', resolve));
    }

    if (i % 100000 === 0) {
      console.log(`✅ Processed ${i.toLocaleString()} rows...`);
    }
  }

  jsonStream.write(']');

  await Promise.all([
    new Promise(resolve => csvStream.end(resolve)),
    new Promise(resolve => jsonStream.end(resolve))
  ]);

  const csvStats = fs.statSync(csvPath);
  const jsonStats = fs.statSync(jsonPath);

  console.log('\n✨ Generation Complete!');
  console.log(`-----------------------------------`);
  console.log(`📄 CSV: ${csvPath} (${(csvStats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`📄 JSON: ${jsonPath} (${(jsonStats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`-----------------------------------`);
}

generateHugeData().catch(err => {
  console.error('❌ Generation failed:', err);
});