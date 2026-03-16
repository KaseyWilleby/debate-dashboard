// More detailed examination of Purchase Order template
const ExcelJS = require('exceljs');
const path = require('path');

async function examinePOTemplate() {
  const workbook = new ExcelJS.Workbook();
  const templatePath = path.join('C:', 'Users', 'kasey', 'Downloads', 'Purchase_Request_Template.xlsx');

  try {
    await workbook.xlsx.readFile(templatePath);

    console.log('=== DETAILED P.O. TEMPLATE ANALYSIS ===\n');

    const worksheet = workbook.worksheets[0]; // First worksheet

    console.log('--- Key Input Fields (Worksheet 1) ---\n');

    // Examine specific rows where we need to input data
    const importantRows = [15, 17, 18, 19, 21, 22, 23, 24];

    importantRows.forEach(rowNum => {
      const row = worksheet.getRow(rowNum);
      console.log(`Row ${rowNum}:`);

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const colLetter = String.fromCharCode(64 + colNumber); // A=1, B=2, etc.
        const value = cell.value;
        const formula = cell.formula;
        const type = cell.type;

        if (value !== null && value !== undefined && value !== '') {
          let displayValue;

          if (formula) {
            displayValue = `FORMULA: ${formula}`;
          } else if (typeof value === 'object') {
            displayValue = `OBJECT: ${JSON.stringify(value)}`;
          } else {
            displayValue = `"${value}"`;
          }

          console.log(`  ${cell.address} (${colLetter}${rowNum}): ${displayValue} [type: ${type}]`);
        }
      });
      console.log('');
    });

    // Check merged cells
    console.log('--- Merged Cells in Important Rows ---');
    const mergedCells = [];
    worksheet.eachRow((row, rowNumber) => {
      if (importantRows.includes(rowNumber)) {
        row.eachCell((cell) => {
          if (cell.isMerged && cell.master === cell) {
            mergedCells.push({
              row: rowNumber,
              range: cell.model.address,
              value: cell.value
            });
          }
        });
      }
    });

    if (mergedCells.length > 0) {
      mergedCells.forEach(mc => {
        console.log(`Row ${mc.row}: ${mc.range} - "${mc.value}"`);
      });
    } else {
      console.log('No merged cells found in important rows');
    }
    console.log('');

    // Sample the line item area
    console.log('--- Line Item Structure (Rows 21-25) ---');
    for (let rowNum = 21; rowNum <= 25; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const cells = [];

      for (let col = 1; col <= 11; col++) { // A-K
        const cell = row.getCell(col);
        const colLetter = String.fromCharCode(64 + col);

        if (cell.value) {
          if (cell.formula) {
            cells.push(`${colLetter}: FORMULA(${cell.formula})`);
          } else {
            cells.push(`${colLetter}: "${cell.value}"`);
          }
        }
      }

      if (cells.length > 0) {
        console.log(`  Row ${rowNum}: ${cells.join(', ')}`);
      }
    }

  } catch (error) {
    console.error('Error reading template:', error.message);
  }
}

examinePOTemplate();
