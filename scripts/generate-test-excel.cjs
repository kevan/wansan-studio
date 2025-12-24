const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const outputPath = path.join(process.cwd(), 'test_data.xlsx');

// Sales Data
const salesData = [
  ['Date', 'Product', 'Sales', 'Region'],
  ['2023-01-15', 'Laptop', 1500, 'North'],
  ['2023-01-16', 'Mouse', 50, 'North'],
  ['2023-02-10', 'Keyboard', 120, 'South'],
  ['2023-02-11', 'Monitor', 800, 'South'],
  ['2023-03-05', 'Laptop', 1600, 'West'],
  ['2023-03-06', 'Webcam', 90, 'West'],
];

// Metadata
const metaData = [
  ['Key', 'Value'],
  ['Version', '1.2'],
  ['Author', 'Wansan'],
  ['Description', 'Sample sales data for testing'],
];

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();

  const wsSales = workbook.addWorksheet('SalesData');
  wsSales.addRows(salesData);

  const wsMeta = workbook.addWorksheet('Metadata');
  wsMeta.addRows(metaData);

  await workbook.xlsx.writeFile(outputPath);

  console.log(`✅ Test Excel file generated at: ${outputPath}`);
}

generateExcel().catch(err => {
  console.error('Error generating test Excel file:', err);
});

