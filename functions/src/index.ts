import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { Browser } from 'puppeteer';

// Initialize Firebase Admin
admin.initializeApp();

interface FeeSheetEntry {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface FeeSheet {
  entries: FeeSheetEntry[];
  totalAmount: number;
  currency: string;
  extractedAt: string;
  tabroomUrl?: string;
}

/**
 * Cloud Function to fetch fee sheet from Tabroom
 * This runs with Puppeteer support in a proper Cloud Function environment
 */
export const fetchTabroomFeeSheet = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to fetch fee sheets'
      );
    }

    const { tournamentUrl, email, password } = data;

    if (!tournamentUrl || !email || !password) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'tournamentUrl, email, and password are required'
      );
    }

    let browser: Browser | null = null;

    try {
      // Dynamically import Puppeteer and Chromium
      const puppeteer = (await import('puppeteer-core')).default;
      const chromium = (await import('@sparticuz/chromium')).default;

      // Launch Puppeteer with serverless Chrome
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      // Login to Tabroom
      functions.logger.info('Logging into Tabroom...');
      await page.goto('https://www.tabroom.com/user/login/login_save.mhtml', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for login form elements to be visible
      try {
        await page.waitForSelector('input[name="username"]', { visible: true, timeout: 10000 });
        await page.waitForSelector('input[name="password"]', { visible: true, timeout: 10000 });

        functions.logger.info('Login form found, filling credentials...');

        await page.type('input[name="username"]', email, { delay: 50 });
        await page.type('input[name="password"]', password, { delay: 50 });

        // Find and click submit button
        await page.waitForSelector('input[type="submit"]', { visible: true, timeout: 10000 });

        functions.logger.info('Submitting login form...');

        await Promise.all([
          page.click('input[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        ]);

        functions.logger.info('Login navigation complete, verifying...');

        // Verify login
        const isLoggedIn = await page.evaluate(() => {
          return (
            document.body.textContent?.includes('Logout') ||
            document.querySelector('a[href*="logout"]') !== null
          );
        });

        if (!isLoggedIn) {
          throw new functions.https.HttpsError(
            'unauthenticated',
            'Tabroom login failed - credentials may be incorrect'
          );
        }

        functions.logger.info('Successfully logged into Tabroom');
      } catch (error) {
        functions.logger.error('Login error:', error);
        throw new functions.https.HttpsError(
          'unauthenticated',
          `Failed to login to Tabroom: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Navigate to fee sheet URL
      functions.logger.info(`Navigating to fee sheet: ${tournamentUrl}`);
      const response = await page.goto(tournamentUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      if (!response) {
        throw new functions.https.HttpsError(
          'not-found',
          'Failed to load fee sheet page'
        );
      }

      // Get PDF buffer
      const pdfBuffer = await response.buffer();
      functions.logger.info(`Downloaded PDF (${pdfBuffer.length} bytes)`);

      // Dynamically import pdf-parse
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule.default || pdfParseModule) as any;

      // Parse PDF
      const pdfData = await pdfParse(pdfBuffer);
      const pdfText = pdfData.text;
      functions.logger.info('Successfully extracted text from PDF');

      // Parse fee data using simple text extraction
      // This is a basic parser - you can enhance it based on the actual PDF structure
      const feeSheet: FeeSheet = await parseFeeSheetText(pdfText, tournamentUrl);

      functions.logger.info('Successfully parsed fee sheet');
      return feeSheet;
    } catch (error) {
      functions.logger.error('Error fetching fee sheet:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to fetch fee sheet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

/**
 * Parse fee sheet text from PDF
 * This is a basic implementation - enhance based on actual PDF structure
 */
async function parseFeeSheetText(
  pdfText: string,
  tabroomUrl: string
): Promise<FeeSheet> {
  // Basic parsing logic - this will need to be customized based on actual PDF format
  const lines = pdfText.split('\n').map(line => line.trim()).filter(line => line);

  const entries: FeeSheetEntry[] = [];
  let totalAmount = 0;

  // Look for common patterns in Tabroom fee sheets
  // This is a placeholder - you'll need to adjust based on actual PDF format
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for lines with currency amounts
    const amountMatch = line.match(/\$\s*(\d+\.?\d*)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);

      // Try to extract description from previous or current line
      const description = line.replace(/\$\s*\d+\.?\d*/, '').trim() || lines[i - 1] || 'Fee';

      entries.push({
        category: 'Tournament Fee',
        description,
        quantity: 1,
        unitPrice: amount,
        totalPrice: amount,
      });

      totalAmount += amount;
    }
  }

  // Look for total in the last few lines
  const lastLines = lines.slice(-5).join(' ');
  const totalMatch = lastLines.match(/total[:\s]*\$?\s*(\d+\.?\d*)/i);
  if (totalMatch) {
    totalAmount = parseFloat(totalMatch[1]);
  }

  return {
    entries,
    totalAmount,
    currency: 'USD',
    extractedAt: new Date().toISOString(),
    tabroomUrl,
  };
}
