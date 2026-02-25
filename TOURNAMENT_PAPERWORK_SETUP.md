# Tournament Paperwork Management System - Setup Guide

## Overview

I've successfully built a comprehensive tournament paperwork tracking system for your debate-dashboard. This system allows you to:

1. **Automatically import tournaments** from Tabroom.com (using existing scraper)
2. **Fetch fee sheets** from Tabroom (with authentication)
3. **Auto-generate Purchase Orders** from fee sheet data
4. **Track paperwork** with checklists and document attachments
5. **Manage all tournament documents** in one place

---

## Features Implemented

### 1. Tournament Fee Sheet Fetching
- **Authenticated Tabroom Login**: Uses Puppeteer to log into your Tabroom account
- **PDF Download**: Automatically finds and downloads fee sheet PDFs
- **AI-Powered Extraction**: Uses Google Gemini AI to parse PDF text and extract structured fee data
- **Data Storage**: Saves fee information directly to Firestore with each tournament

### 2. Purchase Order Auto-Fill
- **Excel Template Processing**: Reads your CFISD Purchase Request Template
- **Automatic Population**: Fills in all fields including:
  - Date, Requestor Name, Account, Budget Code
  - Vendor information (extracted from tournament name)
  - Line items from fee sheet (category, description, quantity, price, total)
- **Multi-Page Support**: Handles overflow to pages 2 and 3
- **Download**: Generates .xlsx file for immediate use

### 3. Paperwork Checklist System
- **Default Items**: Pre-configured checklist with common items:
  - Travel Request Form
  - Purchase Order
  - Transfer Form
  - Payment Received
  - Attendance Form
  - Travel Card Request (overnight only)
  - Hotel Information (overnight only)
  - Overnight Forms (overnight only)
- **Progress Tracking**: Visual progress bar showing completion status
- **Document Attachments**: Upload and link documents to specific checklist items
- **File Management**: View, download, and delete attached documents

### 4. Firebase Storage Integration
- **Secure Upload**: Files stored at `tournaments/{tournamentId}/paperwork/`
- **Access Control**: Security rules limit access to authenticated users
- **Progress Monitoring**: Real-time upload progress feedback
- **Supported Formats**: PDF, Word, Excel, images

### 5. Enhanced Tournament Detail Page
- **Tabbed Interface**: Organized into Entries, Fee Sheet, and Paperwork tabs
- **Admin-Only Features**: Fee and paperwork tabs only visible to admins
- **Real-Time Updates**: All changes sync immediately to Firestore

---

## Setup Instructions

### Step 1: Deploy Firebase Storage Rules

Deploy the new storage rules to enable file uploads:

\`\`\`bash
cd debate-dashboard
firebase deploy --only storage
\`\`\`

### Step 2: Add Tabroom Credentials (In Development)

You'll need to add a settings page where you can securely store your Tabroom credentials. For now, you can manually add them to your user document in Firestore:

1. Go to [Firebase Console](https://console.firebase.google.com/project/debate-dashboard/firestore)
2. Navigate to the `users` collection
3. Find your user document
4. Add two fields:
   - `tabroomEmail`: your Tabroom login email
   - `tabroomPassword`: your Tabroom password

**Note**: In production, passwords should be encrypted. For now, this is development-only.

### Step 3: Install Dependencies (Already Done)

The following packages have been installed:
- `exceljs` - Excel file manipulation
- `pdf-parse` - PDF text extraction
- `puppeteer` - Browser automation for Tabroom login

### Step 4: Test the System

1. Start the development server:
   \`\`\`bash
   cd debate-dashboard
   npm run dev
   \`\`\`

2. Navigate to a tournament detail page:
   - Go to `/dashboard/tournaments/[tournament-id]`
   - You should see three tabs: Entries, Fee Sheet, Paperwork

3. Test Fee Sheet Fetching:
   - Click "Fee Sheet" tab
   - Click "Fetch Fee Sheet" button
   - Wait for the fee data to load

4. Test Purchase Order Generation:
   - After fee sheet is fetched
   - Click "Generate Purchase Order"
   - Excel file should download automatically

5. Test Paperwork Checklist:
   - Click "Paperwork" tab
   - Check off items as completed
   - Upload documents using "Attach Document"

---

## How to Use

### Fetching Fee Sheets

1. Navigate to tournament detail page
2. Click "Fee Sheet" tab
3. Click "Fetch Fee Sheet" button
4. System will:
   - Log into Tabroom with your credentials
   - Navigate to tournament page
   - Find and download fee sheet PDF
   - Parse PDF with AI
   - Extract fee information
   - Save to Firestore

### Generating Purchase Orders

1. Ensure fee sheet has been fetched
2. Click "Generate Purchase Order" button
3. System will:
   - Load Purchase Order template from `templates/` folder
   - Fill in header information
   - Add line items from fee sheet
   - Calculate totals
   - Generate Excel file
   - Download to your computer

### Managing Paperwork

1. Click "Paperwork" tab
2. Check off items as you complete them
3. Upload supporting documents:
   - Click "Attach Document" next to any checklist item
   - Select file (PDF, Word, Excel, images supported)
   - File uploads to Firebase Storage
   - Document appears linked to checklist item
4. View/download documents by clicking download icon
5. Delete documents by clicking trash icon

---

## File Structure

\`\`\`
debate-dashboard/
├── src/
│   ├── ai/
│   │   └── flows/
│   │       └── fetch-tabroom-fee-sheet-flow.ts  # Tabroom authentication & scraping
│   ├── lib/
│   │   ├── types.ts  # Extended with FeeSheet, Paperwork types
│   │   └── purchase-order-generator.ts  # Excel template auto-fill
│   ├── firebase/
│   │   └── storage/
│   │       └── use-storage-upload.tsx  # File upload hook
│   ├── components/
│   │   └── dashboard/
│   │       └── tournament-paperwork-checklist.tsx  # Checklist UI
│   └── app/
│       └── dashboard/
│           └── tournaments/
│               └── [id]/
│                   └── page.tsx  # Enhanced tournament detail page
├── templates/
│   └── Purchase_Request_Template.xlsx  # Your CFISD template
├── storage.rules  # Firebase Storage security rules
└── scripts/
    └── examine-po-template.js  # Utility to inspect Excel structure
\`\`\`

---

## Data Model

### Tournament (Extended)

\`\`\`typescript
interface Tournament {
  // ... existing fields ...
  feeSheet?: FeeSheet;
  paperwork?: TournamentPaperwork;
}

interface FeeSheet {
  entries: FeeSheetEntry[];
  totalAmount: number;
  currency: string;
  extractedAt: string;
  tabroomUrl?: string;
}

interface FeeSheetEntry {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface TournamentPaperwork {
  checklist: ChecklistItem[];
  documents: DocumentAttachment[];
}

interface ChecklistItem {
  id: string;
  type: ChecklistItemType;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  required: boolean;
  isOvernightOnly: boolean;
  attachmentIds: string[];
  notes?: string;
}

interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  checklistItemId?: string;
}
\`\`\`

---

## Next Steps (Future Enhancements)

### 1. Transfer Form Auto-Fill (Not Yet Implemented)
- Similar to Purchase Order
- Need Transfer Form template
- Implement `transfer-form-generator.ts`

### 2. Settings Page for Tabroom Credentials
- Add `/dashboard/settings/tabroom` page
- Secure credential storage
- Encryption in production

### 3. Additional Paperwork Templates
- Travel Request Form
- Hotel Information Form
- Parent Permission Slips

### 4. Bulk Operations
- Generate all paperwork for multiple tournaments
- Batch fee sheet fetching
- Bulk document downloads

### 5. Notification System
- Reminders for incomplete paperwork
- Alerts when registration closes
- Payment deadline notifications

---

## Troubleshooting

### Fee Sheet Fetching Fails

**Problem**: "Login failed" or "Fee sheet link not found"

**Solutions**:
- Verify Tabroom credentials are correct
- Check if tournament has a published fee sheet
- Ensure tournament URL is correct (should be tabroom.com/index/tourn/...)
- Check Firebase console logs for detailed error messages

### Purchase Order Generation Fails

**Problem**: "Template not found" or Excel errors

**Solutions**:
- Ensure `templates/Purchase_Request_Template.xlsx` exists
- Verify template structure matches expected format
- Check that fee sheet was fetched first

### File Upload Fails

**Problem**: "Upload failed" or permission errors

**Solutions**:
- Deploy storage rules: `firebase deploy --only storage`
- Check Firebase Storage is enabled in console
- Verify user is authenticated
- Check file size (ensure under 10MB for now)

### Tabroom Scraping Stops Working

**Problem**: Puppeteer errors or login failures

**Solutions**:
- Tabroom may have changed their login flow
- Update selectors in `fetch-tabroom-fee-sheet-flow.ts`:
  - Check line 42-43 for login form selectors
  - Inspect Tabroom's HTML for current input names
- Consider adding more wait times if pages load slowly

---

## Security Considerations

### Development vs Production

**Current Setup (Development)**:
- Tabroom passwords stored in plain text in Firestore
- Storage rules allow all authenticated users to read/write

**Production Recommendations**:
1. **Encrypt Credentials**: Use Firebase Functions to encrypt passwords
2. **Tighten Storage Rules**: Limit access by user role
3. **Audit Logs**: Track who accesses sensitive documents
4. **Two-Factor Auth**: Require 2FA for admin users
5. **Session Management**: Implement session timeouts

---

## Support & Maintenance

### Logs and Monitoring

- **Client Errors**: Check browser console (F12)
- **Server Errors**: Check Firebase Functions logs in console
- **Storage Activity**: View in Firebase Storage section
- **Firestore Changes**: Monitor in Firestore console

### Updating Templates

To update the Purchase Order template:

1. Modify `C:\Users\kasey\debate-dashboard\templates\Purchase_Request_Template.xlsx`
2. Run `node scripts/examine-po-template.js` to verify structure
3. Update cell references in `purchase-order-generator.ts` if needed
4. Restart dev server

---

## Summary

You now have a fully functional tournament paperwork management system that:

✅ Fetches fee sheets from Tabroom automatically
✅ Generates Purchase Orders with one click
✅ Tracks all paperwork with checklists
✅ Stores documents securely in Firebase Storage
✅ Provides admin-only access to sensitive features

The system is built on your existing debate-dashboard architecture and integrates seamlessly with your current tournament management workflow.

**Ready to use!** Just deploy the storage rules and add your Tabroom credentials to get started.
