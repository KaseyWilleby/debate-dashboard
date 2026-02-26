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

      // Login to Tabroom - the login is a popup on the main page
      functions.logger.info('Logging into Tabroom...');
      await page.goto('https://www.tabroom.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      functions.logger.info('Page loaded, waiting for login popup...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Make the login box visible via JavaScript
      await page.evaluate(() => {
        const loginBox = document.getElementById('login-box');
        if (loginBox) {
          (loginBox as HTMLElement).style.display = 'block';
        }
      });

      functions.logger.info('Login box made visible, waiting for form...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to find and fill the login form (in the popup)
      try {
        // Wait for username field in the login popup
        await page.waitForSelector('#login-box #username', { visible: true, timeout: 10000 });
        functions.logger.info('Found username field in login popup');

        // Wait for password field
        await page.waitForSelector('#login-box input[type="password"]', { visible: true, timeout: 10000 });
        functions.logger.info('Found password field in login popup');

        // Fill in credentials
        await page.type('#login-box #username', email, { delay: 50 });
        await page.type('#login-box input[type="password"]', password, { delay: 50 });

        functions.logger.info('Credentials filled, submitting form...');

        // Submit the form - look for submit button in the login box
        const submitSelectors = [
          '#login-box input[type="submit"]',
          '#login-box button[type="submit"]',
          '#login-box form',
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              functions.logger.info(`Submitting with selector: ${selector}`);

              if (selector === '#login-box form') {
                // Submit the form programmatically
                await Promise.all([
                  page.evaluate(() => {
                    const form = document.querySelector('#login-box form') as HTMLFormElement;
                    if (form) form.submit();
                  }),
                  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
                ]);
              } else {
                await Promise.all([
                  element.click(),
                  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
                ]);
              }
              submitted = true;
              break;
            }
          } catch (e) {
            functions.logger.warn(`Failed with selector ${selector}:`, e);
          }
        }

        if (!submitted) {
          // Try pressing Enter as fallback
          functions.logger.info('Submitting via Enter key...');
          await Promise.all([
            page.keyboard.press('Enter'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          ]);
        }

        functions.logger.info('Login submitted, verifying...');

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
