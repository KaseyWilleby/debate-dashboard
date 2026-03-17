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

    const { tournamentUrl, tournamentName, email, password, chapterId } = data;

    if (!tournamentUrl || !tournamentName || !email || !password || !chapterId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'tournamentUrl, tournamentName, email, password, and chapterId are required'
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

      functions.logger.info(`Searching for tournament: "${tournamentName}" (tourn_id: ${tournId})`);

      // Find the school_id for this tournament by matching tournament name
      const { schoolId, debugInfo } = await page.evaluate((targetTournId, targetTournName) => {
        let schoolId = null;
        let matchedLink = null;

        // Normalize tournament name for comparison (remove extra spaces, lowercase)
        const normalizeText = (text: string) => {
          return text.trim().toLowerCase().replace(/\s+/g, ' ');
        };
        const normalizedTargetName = normalizeText(targetTournName);

        // First, let's collect all Results links and their associated tournament info for debugging
        const allResultsLinks: Array<{text: string, href: string, rowText: string}> = [];
        const allRows = Array.from(document.querySelectorAll('tr'));

        for (const row of allRows) {
          const links = Array.from(row.querySelectorAll('a'));
          const resultsLink = links.find(link => {
            const text = link.textContent?.trim().toLowerCase() || '';
            const href = link.href || '';
            return text.includes('result') && href.includes('school_id=');
          });

          if (resultsLink) {
            allResultsLinks.push({
              text: resultsLink.textContent?.trim() || '',
              href: resultsLink.href,
              rowText: normalizeText(row.textContent || '').substring(0, 200), // First 200 chars
            });
          }
        }

        // Try to match by tournament name in the row
        for (const row of allRows) {
          const rowText = row.textContent || '';
          const normalizedRowText = normalizeText(rowText);

          // Check if this row mentions the tournament name
          if (normalizedRowText.includes(normalizedTargetName)) {
            const links = Array.from(row.querySelectorAll('a'));
            const resultsLink = links.find(link => {
              const text = link.textContent?.trim().toLowerCase() || '';
              const href = link.href || '';
              return text.includes('result') && href.includes('school_id=');
            });

            if (resultsLink) {
              matchedLink = resultsLink;
              const match = resultsLink.href.match(/school_id=(\d+)/);
              schoolId = match ? match[1] : null;
              break;
            }
          }
        }

        // Fallback: Try partial matching with key words from tournament name
        if (!schoolId) {
          // Extract key words from tournament name (skip common words)
          const skipWords = ['the', 'a', 'an', 'of', 'and', 'or', 'in', 'at', 'to'];
          const targetWords = normalizedTargetName.split(' ').filter(w => w.length > 2 && !skipWords.includes(w));

          for (const row of allRows) {
            const rowText = normalizeText(row.textContent || '');

            // Check if row contains multiple key words from the target name
            const matchedWords = targetWords.filter(word => rowText.includes(word));
            if (matchedWords.length >= 2) { // At least 2 matching words
              const links = Array.from(row.querySelectorAll('a'));
              const resultsLink = links.find(link => {
                const text = link.textContent?.trim().toLowerCase() || '';
                const href = link.href || '';
                return text.includes('result') && href.includes('school_id=');
              });

              if (resultsLink) {
                matchedLink = resultsLink;
                const match = resultsLink.href.match(/school_id=(\d+)/);
                schoolId = match ? match[1] : null;
                break;
              }
            }
          }
        }

        // Debug info
        const debugInfo = {
          targetName: targetTournName,
          normalizedTargetName: normalizedTargetName,
          allResultsLinksCount: allResultsLinks.length,
          allResultsLinks: allResultsLinks,
          matchedLinkHref: matchedLink?.href || null,
          matchedLinkText: matchedLink?.textContent || null,
        };

        return { schoolId, debugInfo };
      }, tournId, tournamentName);

      functions.logger.info('Debug info:', debugInfo);

      if (!schoolId) {
        throw new functions.https.HttpsError(
          'not-found',
          `Could not find school_id for tournament ${tournId}. Make sure you've registered for this tournament.`
        );
      }

      functions.logger.info(`Found school_id: ${schoolId}`);

      // Navigate to tournament results page
      const resultsPageUrl = `https://www.tabroom.com/user/results/tourn.mhtml?school_id=${schoolId}`;
      functions.logger.info(`Navigating to results page: ${resultsPageUrl}`);

      await page.goto(resultsPageUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      functions.logger.info('Results page loaded');

      // Find the Print Invoice / Receipt link
      functions.logger.info('Looking for Print Invoice / Receipt link...');

      const invoiceLinkInfo = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));

        // First, let's collect all links for debugging
        const allLinksInfo = links.map(link => ({
          href: link.href,
          text: link.textContent?.trim().substring(0, 50), // First 50 chars
        })).slice(0, 20); // First 20 links

        // Find link specifically with invoice_print.mhtml in href
        const invoiceLink = links.find(link => {
          const href = link.href || '';
          return href.includes('invoice_print.mhtml');
        });

        if (invoiceLink) {
          return {
            found: true,
            href: invoiceLink.href,
            text: invoiceLink.textContent?.trim(),
            target: (invoiceLink as HTMLAnchorElement).target,
            allLinksInfo, // Include for debugging
          };
        }

        // If not found by href, try by text
        const invoiceLinkByText = links.find(link => {
          const text = link.textContent?.trim().toLowerCase() || '';
          return text.includes('print invoice') || text.includes('invoice');
        });

        if (invoiceLinkByText) {
          return {
            found: true,
            href: invoiceLinkByText.href,
            text: invoiceLinkByText.textContent?.trim(),
            target: (invoiceLinkByText as HTMLAnchorElement).target,
            foundBy: 'text',
            allLinksInfo,
          };
        }

        return { found: false, allLinksInfo };
      });

      if (!invoiceLinkInfo.found) {
        throw new functions.https.HttpsError(
          'internal',
          'Could not find Print Invoice / Receipt link on results page'
        );
      }

      functions.logger.info('Found invoice link:', invoiceLinkInfo);

      // Just navigate directly to the invoice URL from the link href
      // (we're already authenticated from the results page)
      if (!invoiceLinkInfo.href) {
        throw new functions.https.HttpsError(
          'internal',
          'Invoice link found but has no href'
        );
      }

      // Since direct navigation keeps failing, fetch the invoice HTML from within the page context
      functions.logger.info('Fetching invoice HTML using in-page fetch API...');

      try {
        // Use fetch API from within the authenticated page to get the invoice (which is actually a PDF)
        const invoiceData = await page.evaluate(async (invoiceUrl) => {
          const response = await fetch(invoiceUrl, {
            method: 'GET',
            credentials: 'include', // Include cookies
            headers: {
              'Accept': 'application/pdf,text/html,*/*',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch invoice: ${response.status} ${response.statusText}`);
          }

          // Get the response as an array buffer
          const arrayBuffer = await response.arrayBuffer();

          // Convert to base64 for transfer
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

          return {
            base64,
            contentType: response.headers.get('content-type') || 'application/pdf',
          };
        }, invoiceLinkInfo.href);

        functions.logger.info(`Fetched invoice data (${invoiceData.base64.length} base64 chars, type: ${invoiceData.contentType})`);

        // Convert base64 back to buffer
        const pdfBuffer = Buffer.from(invoiceData.base64, 'base64');

        functions.logger.info(`PDF buffer created (${pdfBuffer.length} bytes)`);

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
      } catch (fetchError) {
        functions.logger.error('Failed to fetch invoice using fetch API:', fetchError);
        throw new functions.https.HttpsError(
          'internal',
          `Could not fetch invoice page: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        );
      }
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
 * Cloud Function to generate Purchase Order from fee sheet
 */
export const generatePurchaseOrder = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
  })
  .https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate purchase orders'
      );
    }

    const { feeSheetUrl, tournamentName, requestorName, accountName, budgetCode } = data;

    if (!feeSheetUrl || !tournamentName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'feeSheetUrl and tournamentName are required'
      );
    }

    let browser = null;

    try {
      functions.logger.info(`Downloading fee sheet from: ${feeSheetUrl}`);

      // Download the PDF from Firebase Storage
      const response = await fetch(feeSheetUrl);
      if (!response.ok) {
        throw new Error(`Failed to download fee sheet: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const pdfData = new Uint8Array(arrayBuffer);
      functions.logger.info(`Downloaded PDF (${pdfData.length} bytes)`);

      // Parse the PDF to extract text using pdf-parse v2 API
      functions.logger.info('Parsing PDF...');
      const { PDFParse, VerbosityLevel } = require('pdf-parse');
      const parser = new PDFParse(pdfData, { verbosity: VerbosityLevel.ERRORS });
      const textResult = await parser.getText();
      const pdfText = textResult.text;
      functions.logger.info(`Extracted PDF text (${pdfText.length} characters)`);

      // Extract relevant information from PDF text
      const extractedData = extractFeeSheetData(pdfText, tournamentName);

      functions.logger.info('Extracted data:', {
        vendor: extractedData.vendor,
        totalAmount: extractedData.totalAmount,
        itemCount: extractedData.lineItems.length,
      });

      // Generate HTML for the Purchase Order
      const today = new Date();
      const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

      const poHtml = generatePurchaseOrderHtml({
        dateOfRequest: formattedDate,
        requestorName: requestorName || 'Debate Team',
        accountName: accountName || 'Debate Team',
        budgetCode: budgetCode || '',
        vendorName: extractedData.vendor,
        reasonForPurchase: `Tournament Entry Fees - ${tournamentName}`,
        address: extractedData.address || '',
        roomToDeliver: 'Debate Room',
        lineItems: extractedData.lineItems,
        totalAmount: extractedData.totalAmount,
      });

      // Use Puppeteer to convert HTML to PDF
      functions.logger.info('Generating PDF from HTML...');

      const puppeteer = (await import('puppeteer-core')).default;
      const chromium = (await import('@sparticuz/chromium')).default;

      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();
      await page.setContent(poHtml, { waitUntil: 'networkidle0' });

      // Generate PDF with proper formatting
      const pdfBytes = await page.pdf({
        format: 'letter',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
      });

      functions.logger.info(`Generated PDF (${pdfBytes.length} bytes)`);

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const fileName = `purchase-orders/${Date.now()}-${tournamentName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      const file = bucket.file(fileName);

      await file.save(Buffer.from(pdfBytes), {
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000',
          metadata: {
            tournamentName,
            feeSheetUrl,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make file publicly readable
      await file.makePublic();

      const bucketName = bucket.name;
      const downloadUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      functions.logger.info(`P.O. uploaded successfully: ${downloadUrl}`);

      return {
        poUrl: downloadUrl,
        fileName,
        uploadedAt: new Date().toISOString(),
        extractedData,
      };
    } catch (error) {
      functions.logger.error('Error generating purchase order:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to generate purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

/**
 * Extract fee sheet data from PDF text
 */
function extractFeeSheetData(pdfText: string, tournamentName: string): {
  vendor: string;
  address: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
} {
  // Extract vendor name and address from "Payable To:" section
  let vendor = 'Tournament Host';
  let address = '';

  // Look for "Payable To:" section
  const payableToMatch = pdfText.match(/Payable To:?\s*\n?\s*([^\n]+(?:\n(?!.*?:)[^\n]+)*)/i);

  if (payableToMatch) {
    // Get the text after "Payable To:"
    let payableToText = payableToMatch[1].trim();

    // Remove instructional text like "Please make all checks out to:"
    payableToText = payableToText.replace(/Please make all checks (?:payable )?(?:out )?to:?\s*/gi, '');
    payableToText = payableToText.replace(/Make checks payable to:?\s*/gi, '');

    // Split into lines
    const lines = payableToText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length > 0) {
      // First line is the vendor name
      vendor = lines[0];

      // Process remaining lines for address and Attn
      const addressLines: string[] = [];
      const attnLines: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^Attn:/i)) {
          // Attn goes with vendor name
          attnLines.push(line);
        } else if (!line.match(/^(Phone|Email|Fax):/i)) {
          // Everything else (except phone/email/fax) is address
          addressLines.push(line);
        }
      }

      // Add Attn to vendor name if present
      if (attnLines.length > 0) {
        vendor += '\n' + attnLines.join('\n');
      }

      // Join address lines
      if (addressLines.length > 0) {
        address = addressLines.join(', ');
      }
    }
  }

  // Extract total amount
  const totalMatch = pdfText.match(/Total[:\s]+\$?([\d,]+\.?\d*)/i) ||
                     pdfText.match(/Amount Due[:\s]+\$?([\d,]+\.?\d*)/i) ||
                     pdfText.match(/Grand Total[:\s]+\$?([\d,]+\.?\d*)/i);
  const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;

  // Create a single line item for Tournament Entry Fees
  const lineItems: Array<{ description: string; quantity: number; unitPrice: number }> = [
    {
      description: 'Tournament Entry Fees',
      quantity: 1,
      unitPrice: totalAmount,
    }
  ];

  return {
    vendor,
    address,
    lineItems,
    totalAmount,
  };
}

/**
 * Generate HTML for Purchase Order matching the template layout
 */
function generatePurchaseOrderHtml(data: {
  dateOfRequest: string;
  requestorName: string;
  accountName: string;
  budgetCode: string;
  vendorName: string;
  reasonForPurchase: string;
  address: string;
  roomToDeliver: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  totalAmount: number;
}): string {
  const lineItemsHtml = data.lineItems
    .map((item, index) => {
      const total = item.quantity * item.unitPrice;
      return `
        <tr>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #000; padding: 8px;">${item.description}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.quantity}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">$${total.toFixed(2)}</td>
        </tr>
      `;
    })
    .join('');

  const subtotal = data.totalAmount;
  const shipping = 0;
  const totalPurchase = subtotal + shipping;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 11pt;
        }
        .header {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 15px;
          padding: 10px;
          border: 2px solid #000;
        }
        .instructions {
          margin-bottom: 15px;
          font-size: 9pt;
          line-height: 1.4;
        }
        .instructions-title {
          font-weight: bold;
          margin-bottom: 8px;
        }
        .instruction-item {
          margin-bottom: 4px;
        }
        .info-section {
          margin-bottom: 15px;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          width: 140px;
          font-size: 10pt;
        }
        .info-value {
          flex: 1;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          font-size: 10pt;
        }
        .spacer {
          width: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th {
          background-color: #f0f0f0;
          border: 1px solid #000;
          padding: 6px;
          text-align: center;
          font-weight: bold;
          font-size: 10pt;
        }
        td {
          font-size: 10pt;
        }
        .subtotal-row {
          background-color: #f9f9f9;
          font-weight: bold;
        }
        .total-row {
          background-color: #e0e0e0;
          font-weight: bold;
        }
        .internal-use {
          margin-top: 20px;
          padding: 10px;
          background-color: #f5f5f5;
          border: 2px solid #000;
        }
        .internal-use-header {
          text-align: center;
          font-weight: bold;
          font-size: 11pt;
          margin-bottom: 10px;
        }
        .internal-row {
          display: flex;
          margin-bottom: 8px;
        }
        .internal-label {
          font-weight: bold;
          width: 140px;
          font-size: 10pt;
        }
        .internal-value {
          flex: 1;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          font-size: 10pt;
        }
        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: 10pt;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        CYPRESS-FAIRBANKS ISD PURCHASE REQUEST<br/>
        (CAMPUS/DEPARTMENT)
      </div>

      <div class="instructions">
        <div class="instructions-title">Instructions</div>
        <div class="instruction-item">1) Before any purchase can be made, this form must be completed and provided to the Financial Secretary. Purchases include items or services paid by purchase orders, distribution orders, reimbursement, petty cash, or procurement cards (PCards). This form is not to be used for grant money purchases.</div>
        <div class="instruction-item">2) For public money, purchases should be made from the Distribution Center, or from a bid or contracted vendor. If a different vendor is needed, contact Procurement Services at 281-897-4576.</div>
        <div class="instruction-item">3) For agency money, purchases do not have to be from a bid or contracted vendor.</div>
        <div class="instruction-item">4) For any fundraisers using public or agency money, the vendor must be on the approved fundraiser vendor list.</div>
        <div class="instruction-item">5) The Financial Secretary will provide you a copy of the purchase order after it has been approved.</div>
        <div class="instruction-item">6) When placing an order, provide a copy of the purchase order to the vendor.</div>
        <div class="instruction-item">7) Orders should be placed only after the purchase order has been approved by Finance.</div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <div class="info-label">Date of Request:</div>
          <div class="info-value">${data.dateOfRequest}</div>
          <div class="spacer"></div>
          <div class="info-label">Requestor Name:</div>
          <div class="info-value">${data.requestorName}</div>
        </div>

        <div class="info-row">
          <div class="info-label">Account Name:</div>
          <div class="info-value">${data.accountName}</div>
          <div class="spacer"></div>
          <div class="info-label">Budget Code:</div>
          <div class="info-value">${data.budgetCode}</div>
        </div>

        <div class="info-row">
          <div class="info-label">Vendor Name:</div>
          <div class="info-value">${data.vendorName}</div>
          <div class="spacer"></div>
          <div class="info-label">Reason for Purchase:</div>
          <div class="info-value">${data.reasonForPurchase}</div>
        </div>

        <div class="info-row">
          <div class="info-label">Address:</div>
          <div class="info-value">${data.address}</div>
          <div class="spacer"></div>
          <div class="info-label">Room to be Delivered:</div>
          <div class="info-value">${data.roomToDeliver}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 60px;">Item #</th>
            <th>Description</th>
            <th style="width: 80px;">Quantity</th>
            <th style="width: 100px;">Unit Price</th>
            <th style="width: 100px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
          <tr class="subtotal-row">
            <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: right;">Subtotal:</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">$${subtotal.toFixed(2)}</td>
          </tr>
          <tr class="subtotal-row">
            <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: right;">Page 2 Subtotal (if needed):</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">$0.00</td>
          </tr>
          <tr class="subtotal-row">
            <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: right;">Page 3 Subtotal (if needed):</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">$0.00</td>
          </tr>
          <tr class="subtotal-row">
            <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: right;">Shipping:</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">$${shipping.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" style="border: 1px solid #000; padding: 8px; text-align: right;">Total of Purchase:</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right;">$${totalPurchase.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="internal-use">
        <div class="internal-use-header">FINANCIAL SECRETARY USE ONLY</div>
        <div class="internal-row">
          <div class="internal-label">Requisition #:</div>
          <div class="internal-value"></div>
          <div class="spacer"></div>
          <div class="internal-label">Contract # or Quotation #:</div>
          <div class="internal-value"></div>
        </div>
        <div class="internal-row">
          <div class="internal-label">Purchase Order #:</div>
          <div class="internal-value"></div>
          <div class="spacer"></div>
          <div class="internal-label">Entered in General Fund</div>
          <div class="internal-value"></div>
        </div>
        <div class="internal-row">
          <div class="internal-label">Vendor #:</div>
          <div class="internal-value"></div>
          <div class="spacer"></div>
          <div class="internal-label">Ledger / SchoolCash:</div>
          <div class="internal-value"></div>
        </div>
      </div>

      <div class="footer">
        This is not an official CFISD purchase order.
      </div>
    </body>
    </html>
  `;
}

