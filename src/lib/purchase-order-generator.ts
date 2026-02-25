'use server';
/**
 * @fileOverview Utility for generating Purchase Orders from fee sheet data
 */

import ExcelJS from 'exceljs';
import type { FeeSheet, Tournament } from './types';
import { format } from 'date-fns';
import path from 'path';

export interface PurchaseOrderData {
  dateOfRequest: string;
  requestorName: string;
  accountName: string;
  budgetCode: string;
  vendorName: string;
  reasonForPurchase: string;
  address: string;
  roomToBeDelivered: string;
  feeSheet: FeeSheet;
  tournament: Tournament;
}

/**
 * Generates a Purchase Order Excel file from fee sheet data
 */
export async function generatePurchaseOrder(data: PurchaseOrderData): Promise<Buffer> {
  try {
    // Load the template
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(process.cwd(), 'templates', 'Purchase_Request_Template.xlsx');

    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.getWorksheet('Electronic');
    if (!worksheet) {
      throw new Error('Electronic worksheet not found in template');
    }

    // Fill in header information
    // Date of Request (Row 15, Column B)
    const dateCell = worksheet.getCell('B15');
    dateCell.value = data.dateOfRequest;

    // Requestor Name (Row 15, Column I)
    const requestorCell = worksheet.getCell('I15');
    requestorCell.value = data.requestorName;

    // Account Name (Row 17, Column B)
    const accountCell = worksheet.getCell('B17');
    accountCell.value = data.accountName;

    // Budget Code (Row 17, Column I)
    const budgetCell = worksheet.getCell('I17');
    budgetCell.value = data.budgetCode;

    // Vendor Name (Row 18, Column B)
    const vendorCell = worksheet.getCell('B18');
    vendorCell.value = data.vendorName;

    // Reason for Purchase (Row 18, Column I)
    const reasonCell = worksheet.getCell('I18');
    reasonCell.value = data.reasonForPurchase;

    // Address (Row 19, Column B)
    const addressCell = worksheet.getCell('B19');
    addressCell.value = data.address;

    // Room to be Delivered (Row 19, Column I)
    const roomCell = worksheet.getCell('I19');
    roomCell.value = data.roomToBeDelivered;

    // Fill in line items from fee sheet
    let currentRow = 22; // Start at row 22 for line items
    let currentPage = 1;
    let itemNumber = 1;

    for (const entry of data.feeSheet.entries) {
      // Check if we need to move to the next page
      if (currentPage === 1 && currentRow > 41) {
        // Move to Page 2
        const page2 = workbook.getWorksheet('Page 2');
        if (page2) {
          worksheet.name; // Keep current sheet reference
          currentRow = 4; // Start at row 4 on page 2
          currentPage = 2;
        }
      } else if (currentPage === 2 && currentRow > 25) {
        // Move to Page 3
        const page3 = workbook.getWorksheet('Page 3');
        if (page3) {
          currentRow = 4; // Start at row 4 on page 3
          currentPage = 3;
        }
      }

      // Get the appropriate worksheet
      const currentWorksheet = currentPage === 1
        ? worksheet
        : workbook.getWorksheet(`Page ${currentPage}`);

      if (!currentWorksheet) {
        throw new Error(`Worksheet for page ${currentPage} not found`);
      }

      // Item Number (Columns A-B)
      const itemNumCell = currentWorksheet.getCell(`A${currentRow}`);
      itemNumCell.value = itemNumber;

      // Description (Columns C-G)
      const descCell = currentWorksheet.getCell(`C${currentRow}`);
      descCell.value = `${entry.category} - ${entry.description}`;

      // Quantity (Column H)
      const qtyCell = currentWorksheet.getCell(`H${currentRow}`);
      qtyCell.value = entry.quantity;

      // Unit Price (Column I)
      const unitPriceCell = currentWorksheet.getCell(`I${currentRow}`);
      unitPriceCell.value = entry.unitPrice;

      // Total (Columns J-K) - Use formula
      const totalCell = currentWorksheet.getCell(`J${currentRow}`);
      totalCell.value = { formula: `H${currentRow}*I${currentRow}` };

      currentRow++;
      itemNumber++;
    }

    // Calculate and set grand total on the last page used
    const lastWorksheet = currentPage === 1
      ? worksheet
      : workbook.getWorksheet(`Page ${currentPage}`);

    if (lastWorksheet) {
      // Add a grand total row
      const totalLabelCell = lastWorksheet.getCell(`A${currentRow + 1}`);
      totalLabelCell.value = 'GRAND TOTAL';

      const grandTotalCell = lastWorksheet.getCell(`J${currentRow + 1}`);
      grandTotalCell.value = data.feeSheet.totalAmount;

      // Apply bold formatting to total row
      totalLabelCell.font = { bold: true };
      grandTotalCell.font = { bold: true };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);

  } catch (error) {
    throw new Error(`Failed to generate purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a filename for the purchase order
 */
export function generatePOFilename(tournament: Tournament): string {
  const tournamentDate = format(new Date(tournament.date), 'yyyy-MM-dd');
  const tournamentName = tournament.name.replace(/[^a-z0-9]/gi, '_');
  return `PO_${tournamentName}_${tournamentDate}.xlsx`;
}

/**
 * Helper function to extract vendor name from tournament
 */
export function extractVendorFromTournament(tournament: Tournament): string {
  // Try to extract school name from tournament name or URL
  const name = tournament.name;

  // Common patterns: "School Name Tournament", "Tournament at School Name"
  const atMatch = name.match(/at\s+(.+?)(?:\s+\d|$)/i);
  if (atMatch) return atMatch[1].trim();

  const firstPart = name.split(/tournament|invitational|classic|swing/i)[0].trim();
  if (firstPart) return firstPart;

  return 'Tournament Host School';
}
