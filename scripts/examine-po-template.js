// Utility script to examine Purchase Order template structure
const ExcelJS = require('exceljs');
const path = require('path');

async function examinePOTemplate() {
  const workbook = new ExcelJS.Workbook();
  const templatePath = path.join('C:', 'Users', 'kasey', 'Downloads', 'Purchase_Request_Template.xlsx');

  try {
    await workbook.xlsx.readFile(templatePath);

    console.log('=== PURCHASE ORDER TEMPLATE STRUCTURE ===\n');
    console.log(`Number of worksheets: ${workbook.worksheets.length}\n`);

    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`--- Worksheet ${index + 1}: "${worksheet.name}" ---`);
      console.log(`Row count: ${worksheet.rowCount}`);
      console.log(`Column count: ${worksheet.columnCount}\n`);

      console.log('Cell contents (first 30 rows):');
      for (let rowNum = 1; rowNum <= Math.min(30, worksheet.rowCount); rowNum++) {
        const row = worksheet.getRow(rowNum);
        const cells = [];

        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const value = cell.value;
          const address = cell.address;

          // Show cell value and formatting
          if (value !== null && value !== undefined && value !== '') {
            cells.push(`${address}: "${value}"`);
          }
        });

        if (cells.length > 0) {
          console.log(`  Row ${rowNum}: ${cells.join(', ')}`);
        }
      }
      console.log('\n');
    });

  } catch (error) {
    console.error('Error reading template:', error.message);
  }
}

examinePOTemplate();
