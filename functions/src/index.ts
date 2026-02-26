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
      await page.goto('https://www.tabroom.com/user/login/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait longer for dynamic content to load
      functions.logger.info('Waiting for page to fully load...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Wait for any form or input to appear
      try {
        await page.waitForSelector('form, input, button', { timeout: 10000 });
      } catch (e) {
        functions.logger.warn('No form elements detected after waiting');
      }

      // Debug: Get full page HTML and structure
      const pageInfo = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const forms = Array.from(document.querySelectorAll('form'));

        return {
          url: window.location.href,
          title: document.title,
          bodyText: document.body.textContent?.substring(0, 500),
          inputs: inputs.map(i => ({
            type: (i as HTMLInputElement).type,
            name: (i as HTMLInputElement).name,
            id: i.id,
            className: i.className,
            placeholder: (i as HTMLInputElement).placeholder,
          })),
          buttons: buttons.map(b => ({
            type: (b as HTMLButtonElement | HTMLInputElement).type,
            textContent: b.textContent?.trim(),
            id: b.id,
            className: b.className,
          })),
          forms: forms.map(f => ({
            action: (f as HTMLFormElement).action,
            method: (f as HTMLFormElement).method,
            id: f.id,
          })),
          bodyHTML: document.body.innerHTML.substring(0, 1000),
        };
      });
      functions.logger.info('Page structure:', JSON.stringify(pageInfo, null, 2));

      // Try multiple selector strategies
      try {
        let usernameSelector: string | null = null;
        let passwordSelector: string | null = null;

        // Try different selectors for username field
        const usernameSelectors = [
          'input[name="username"]',
          'input[name="email"]',
          'input[type="email"]',
          'input[id*="user"]',
          'input[id*="email"]',
          'input[placeholder*="mail"]',
          'input[placeholder*="user"]',
        ];

        for (const selector of usernameSelectors) {
          try {
            await page.waitForSelector(selector, { visible: true, timeout: 2000 });
            usernameSelector = selector;
            functions.logger.info(`Found username field with selector: ${selector}`);
            break;
          } catch (e) {
            // Try next selector
          }
        }

        // Try different selectors for password field
        const passwordSelectors = [
          'input[name="password"]',
          'input[type="password"]',
          'input[id*="pass"]',
        ];

        for (const selector of passwordSelectors) {
          try {
            await page.waitForSelector(selector, { visible: true, timeout: 2000 });
            passwordSelector = selector;
            functions.logger.info(`Found password field with selector: ${selector}`);
            break;
          } catch (e) {
            // Try next selector
          }
        }

        if (!usernameSelector || !passwordSelector) {
          throw new Error('Could not find login form fields');
        }

        functions.logger.info('Login form found, filling credentials...');

        await page.type(usernameSelector, email, { delay: 50 });
        await page.type(passwordSelector, password, { delay: 50 });

        // Find and click submit button
        const submitSelectors = [
          'input[type="submit"]',
          'button[type="submit"]',
          'button:has-text("Login")',
          'button:has-text("Sign in")',
        ];

        let submitClicked = false;
        for (const selector of submitSelectors) {
          try {
            await page.waitForSelector(selector, { visible: true, timeout: 2000 });
            functions.logger.info(`Submitting login form with: ${selector}`);

            await Promise.all([
              page.click(selector),
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
            ]);
            submitClicked = true;
            break;
          } catch (e) {
            // Try next selector
          }
        }

        if (!submitClicked) {
          // Try pressing Enter as fallback
          functions.logger.info('Submitting form via Enter key...');
          await Promise.all([
            page.keyboard.press('Enter'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          ]);
        }

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
