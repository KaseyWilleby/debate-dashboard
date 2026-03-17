// Read entire P.O. template to see all sections
const ExcelJS = require('exceljs');
const path = require('path');

async function readFullTemplate() {
  const workbook = new ExcelJS.Workbook();
  const templatePath = path.join(__dirname, '..', 'templates', 'Purchase_Request_Template.xlsx');

  try {
    await workbook.xlsx.readFile(templatePath);

    console.log('=== COMPLETE P.O. TEMPLATE CONTENT ===\n');

    const worksheet = workbook.worksheets[0];

    console.log('Total rows:', worksheet.rowCount);
    console.log('Total columns:', worksheet.columnCount);
    console.log('\n--- All Rows with Content ---\n');

    worksheet.eachRow((row, rowNumber) => {
      const cells = [];
      let hasContent = false;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const colLetter = String.fromCharCode(64 + colNumber);
        let value = cell.value;

        if (value !== null && value !== undefined && value !== '') {
          hasContent = true;

          if (typeof value === 'object' && value.richText) {
            value = value.richText.map(t => t.text).join('');
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }

          cells.push(`${colLetter}: "${value}"`);
        }
      });

      if (hasContent) {
        console.log(`Row ${rowNumber}:`);
        cells.forEach(cell => console.log(`  ${cell}`));
        console.log('');
      }
    });

  } catch (error) {
    console.error('Error reading template:', error.message);
  }
}

readFullTemplate();
