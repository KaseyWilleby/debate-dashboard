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

    const { tournamentUrl, email, password, chapterId } = data;

    if (!tournamentUrl || !email || !password || !chapterId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'tournamentUrl, email, password, and chapterId are required'
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

      // Extract tourn_id from tournament URL
      const tournIdMatch = tournamentUrl.match(/tourn_id=(\d+)/);
      if (!tournIdMatch) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Could not extract tourn_id from tournament URL'
        );
      }
      const tournId = tournIdMatch[1];
      functions.logger.info(`Tournament ID: ${tournId}`);

      // Navigate to results page with chapter ID
      const resultsUrl = `https://www.tabroom.com/user/results/index.mhtml?chapter_id=${chapterId}`;
      functions.logger.info(`Navigating to results: ${resultsUrl}`);

      await page.goto(resultsUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      functions.logger.info('Searching for tournament with tourn_id: ' + tournId);

      // Find the school_id for this tournament
      const schoolId = await page.evaluate((targetTournId) => {
        const links = Array.from(document.querySelectorAll('a'));
        const tournLink = links.find(link => {
          const href = link.href || '';
          return href.includes(`tourn_id=${targetTournId}`) && href.includes('school_id=');
        });

        if (tournLink) {
          const match = tournLink.href.match(/school_id=(\d+)/);
          return match ? match[1] : null;
        }
        return null;
      }, tournId);

      if (!schoolId) {
        throw new functions.https.HttpsError(
          'not-found',
          `Could not find school_id for tournament ${tournId}. Make sure you've registered for this tournament.`
        );
      }

      functions.logger.info(`Found school_id: ${schoolId}`);

      // Navigate to invoice page with school_id
      const invoiceUrl = `https://www.tabroom.com/user/results/invoice_print.mhtml?school_id=${schoolId}`;
      functions.logger.info(`Navigating to invoice: ${invoiceUrl}`);

      await page.goto(invoiceUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      functions.logger.info('Loaded invoice page, generating PDF from HTML...');

      // Generate PDF from the HTML page
      const pdfBuffer = Buffer.from(await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
      }));

      functions.logger.info(`Generated PDF (${pdfBuffer.length} bytes)`);

      // Upload PDF to Firebase Storage
      const bucket = admin.storage().bucket();

      // Use the tournId already extracted earlier
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

