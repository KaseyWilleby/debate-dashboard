'use server';
/**
 * @fileOverview AI flow for fetching fee sheets from Tabroom.com with authentication
 *
 * - fetchTabroomFeeSheet - Logs into Tabroom, downloads fee sheet PDF, and extracts fee data
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { FeeSheet } from '@/lib/types';
import type { Browser, Page } from 'puppeteer';

const FetchFeeSheetInputSchema = z.object({
  tournamentUrl: z.string().url().describe('The Tabroom tournament URL'),
  email: z.string().email().describe('Tabroom login email'),
  password: z.string().describe('Tabroom login password'),
});

const FeeSheetEntrySchema = z.object({
  category: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

const FeeSheetSchema = z.object({
  entries: z.array(FeeSheetEntrySchema),
  totalAmount: z.number(),
  currency: z.string(),
  extractedAt: z.string(),
  tabroomUrl: z.string().optional(),
});

type FetchFeeSheetInput = z.infer<typeof FetchFeeSheetInputSchema>;

/**
 * Logs into Tabroom.com and navigates to the fee sheet page
 */
async function loginToTabroom(page: Page, email: string, password: string): Promise<void> {
  try {
    // Navigate to Tabroom login page
    await page.goto('https://www.tabroom.com/user/login/login_save.mhtml', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Fill in login credentials
    await page.type('input[name="username"]', email);
    await page.type('input[name="password"]', password);

    // Submit login form
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    // Verify login was successful by checking for common logged-in elements
    const isLoggedIn = await page.evaluate(() => {
      // Check if we're redirected to the main page or if logout link exists
      return document.body.textContent?.includes('Logout') ||
             document.querySelector('a[href*="logout"]') !== null;
    });

    if (!isLoggedIn) {
      throw new Error('Login failed - credentials may be incorrect');
    }

  } catch (error) {
    throw new Error(`Failed to login to Tabroom: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Downloads the fee sheet PDF from a tournament page
 */
async function downloadFeeSheetPDF(page: Page, tournamentUrl: string): Promise<Buffer> {
  try {
    // Navigate to tournament page
    await page.goto(tournamentUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Look for fee sheet link (common patterns)
    const feeSheetLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const feeLink = links.find(link =>
        link.textContent?.toLowerCase().includes('fee') ||
        link.textContent?.toLowerCase().includes('invoice') ||
        link.href.includes('invoice') ||
        link.href.includes('fees')
      );
      return feeLink?.href;
    });

    if (!feeSheetLink) {
      throw new Error('Fee sheet link not found on tournament page');
    }

    // Navigate to fee sheet page and download PDF
    const response = await page.goto(feeSheetLink, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    if (!response) {
      throw new Error('Failed to load fee sheet page');
    }

    const buffer = await response.buffer();
    return buffer;

  } catch (error) {
    throw new Error(`Failed to download fee sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses a PDF buffer and extracts fee information using AI
 */
async function parseFeeSheetPDF(pdfBuffer: Buffer): Promise<FeeSheet> {
  try {
    // Dynamically import pdf-parse
    const pdf = (await import('pdf-parse')).default;

    // Parse PDF to extract text
    const pdfData = await pdf(pdfBuffer);
    const pdfText = pdfData.text;

    // Use AI to extract structured fee information from the PDF text
    const extractFeeDataFlow = ai.defineFlow(
      {
        name: 'extractFeeData',
        inputSchema: z.string(),
        outputSchema: FeeSheetSchema,
      },
      async (pdfText: string) => {
        const result = await ai.generate({
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: `You are a data extraction assistant. Extract fee information from this tournament fee sheet PDF text.

Extract all fee entries with the following information:
- Category (e.g., "Entry Fees", "Judge Fees", "Late Fees", "Registration")
- Description (specific item description)
- Quantity (number of items)
- Unit Price (price per item)
- Total Price (quantity * unit price)

Also extract:
- Total Amount (sum of all fees)
- Currency (usually USD)

PDF Text:
${pdfText}

Return the data in the specified JSON format.`,
          output: {
            schema: FeeSheetSchema,
          },
        });

        if (!result.output) {
          throw new Error('Failed to extract fee data from PDF');
        }

        return result.output;
      }
    );

    const feeSheet = await extractFeeDataFlow(pdfText);

    if (!feeSheet) {
      throw new Error('Failed to parse fee sheet data');
    }

    // Add extraction timestamp
    feeSheet.extractedAt = new Date().toISOString();

    return feeSheet;

  } catch (error) {
    throw new Error(`Failed to parse fee sheet PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main flow to fetch and parse Tabroom fee sheet
 */
const fetchTabroomFeeSheetFlow = ai.defineFlow(
  {
    name: 'fetchTabroomFeeSheet',
    inputSchema: FetchFeeSheetInputSchema,
    outputSchema: FeeSheetSchema,
  },
  async (input: FetchFeeSheetInput) => {
    let browser: Browser | null = null;

    try {
      // Dynamically import puppeteer
      const puppeteer = (await import('puppeteer')).default;

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Login to Tabroom
      await loginToTabroom(page, input.email, input.password);

      // Download fee sheet PDF
      const pdfBuffer = await downloadFeeSheetPDF(page, input.tournamentUrl);

      // Parse PDF and extract fee data
      const feeSheet = await parseFeeSheetPDF(pdfBuffer);

      // Add tournament URL to result
      feeSheet.tabroomUrl = input.tournamentUrl;

      return feeSheet;

    } catch (error) {
      throw new Error(`Fee sheet fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
);

export async function fetchTabroomFeeSheet(
  tournamentUrl: string,
  email: string,
  password: string
): Promise<FeeSheet> {
  return fetchTabroomFeeSheetFlow({ tournamentUrl, email, password });
}
