const ExcelJS = require('exceljs');
const path = require('path');

const ROW_COUNT = 1000000;
const outputPath = path.join(process.cwd(), 'huge_test_data.xlsx');

async function generate() {
  console.log(`Starting generation of ${ROW_COUNT} rows...`);
  const start = Date.now();

  // Create a stream writer
  const options = {
    filename: outputPath,
    useStyles: false,
    useSharedStrings: false,
  };
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter(options);
  const worksheet = workbook.addWorksheet('Sheet1');

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Product', key: 'product', width: 20 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Status', key: 'status', width: 10 },
  ];

  const categories = ['Electronics', 'Furniture', 'Clothing', 'Grocery', 'Toys'];
  const products = ['Widget', 'Gizmo', 'Gadget', 'Thingamajig', 'Doodad'];
  const statuses = ['Completed', 'Pending', 'Cancelled'];

  for (let i = 1; i <= ROW_COUNT; i++) {
    const row = {
      id: i,
      date: new Date(2023, 0, 1 + (i % 365)), // Cyclic dates in 2023
      product: `${products[i % 5]} ${String.fromCharCode(65 + (i % 26))}`,
      category: categories[i % 5],
      amount: parseFloat((Math.random() * 1000).toFixed(2)),
      status: statuses[i % 3],
    };

    worksheet.addRow(row).commit();

    if (i % 100000 === 0) {
      console.log(`Progress: ${i} rows written...`);
    }
  }

  await workbook.commit();
  
  const end = Date.now();
  console.log(`\nSuccess! Generated ${ROW_COUNT} rows in ${(end - start) / 1000}s`);
  console.log(`File saved at: ${outputPath}`);
}

generate().catch(err => {
  console.error('Error generating file:', err);
});
