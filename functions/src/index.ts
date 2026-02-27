import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import type { Browser } from 'puppeteer';

// Initialize Firebase Admin
admin.initializeApp();

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

      // Navigate to tournament page
      functions.logger.info(`Navigating to tournament: ${tournamentUrl}`);
      await page.goto(tournamentUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      functions.logger.info('Looking for "Print Invoice / Receipt" link...');

      // Find and click "Print Invoice / Receipt" link
      const invoiceLink = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.find(link => link.textContent?.includes('Print Invoice / Receipt'));
      });

      if (!invoiceLink) {
        throw new functions.https.HttpsError(
          'not-found',
          'Could not find "Print Invoice / Receipt" link on the page'
        );
      }

      functions.logger.info('Found invoice link, clicking...');

      // Click the link and wait for navigation to PDF
      const [response] = await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        page.evaluate((link) => (link as HTMLElement).click(), invoiceLink),
      ]);

      if (!response) {
        throw new functions.https.HttpsError(
          'not-found',
          'Failed to navigate to fee sheet PDF'
        );
      }

      functions.logger.info(`Navigated to: ${response.url()}`);

      // Download the PDF
      const pdfBuffer = await response.buffer();
      functions.logger.info(`Downloaded PDF (${pdfBuffer.length} bytes)`);

      // Upload PDF to Firebase Storage
      const bucket = admin.storage().bucket();

      // Extract tournament ID from URL (e.g., "tourn_id=37539")
      const tournIdMatch = tournamentUrl.match(/tourn_id=(\d+)/);
      const tournId = tournIdMatch ? tournIdMatch[1] : 'unknown';
      const fileName = `fee-sheets/${Date.now()}-tournament-${tournId}.pdf`;
      const file = bucket.file(fileName);

      functions.logger.info(`Uploading PDF to Storage: ${fileName}`);
      functions.logger.info(`Bucket name: ${bucket.name}`);

      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000',
          metadata: {
            tournamentUrl,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make file publicly readable via ACL
      await file.makePublic();

      // Construct simple public URL
      const bucketName = bucket.name;
      const downloadUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      functions.logger.info(`PDF uploaded successfully`);
      functions.logger.info(`Public URL: ${downloadUrl}`);

      return {
        pdfUrl: downloadUrl,
        fileName,
        uploadedAt: new Date().toISOString(),
        tabroomUrl: tournamentUrl,
      };
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

