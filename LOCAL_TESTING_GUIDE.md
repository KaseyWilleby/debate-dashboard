# Local Testing Guide - Tournament Paperwork System

## Pre-Deployment Testing Strategy

You can test most of the new features locally without deploying to production. Here's how:

---

## Option 1: Quick Dev Server Test (Recommended First Step)

This will test the UI and client-side functionality:

### Step 1: Start Development Server

```bash
cd debate-dashboard
npm run dev
```

### Step 2: Navigate to a Tournament

1. Open http://localhost:3000
2. Log in as admin
3. Go to any tournament detail page (e.g., from Tournament Scheduler)
4. You should see three tabs: **Entries**, **Fee Sheet**, **Paperwork**

### Step 3: Visual Inspection

**Check the Fee Sheet Tab:**
- Does it render without errors?
- Do you see the "Fetch Fee Sheet" button?
- Does the empty state show correctly?

**Check the Paperwork Tab:**
- Does the checklist render?
- Are all 8 default items visible?
- Is the progress bar showing "0/8 completed"?
- Can you check/uncheck items?

### What You CAN'T Test Yet:
- ❌ Actual fee sheet fetching (requires Tabroom credentials + network)
- ❌ File uploads to Storage (requires deployed storage rules)
- ❌ Purchase Order generation (requires fee sheet data)

---

## Option 2: Firebase Local Emulator Suite (Full Local Testing)

This lets you test Storage uploads without touching production:

### Step 1: Install Firebase Emulators

```bash
cd debate-dashboard
firebase init emulators
# Select: Firestore, Storage, Authentication
# Use default ports
```

### Step 2: Start Emulators

```bash
firebase emulators:start
```

### Step 3: Update Firebase Config for Local Testing

Temporarily modify `src/firebase/index.ts`:

```typescript
// Add at the top after imports
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';
import { connectAuthEmulator } from 'firebase/auth';

// After firebaseApp initialization, add:
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### Step 4: Test with Emulators

Now you can test file uploads locally:
- Upload documents in the Paperwork tab
- Files will be stored in local emulator
- View in Firebase Emulator UI: http://localhost:4000

**Advantages:**
- ✅ Test Storage uploads without deploying rules
- ✅ Test Firestore updates safely
- ✅ No risk to production data

**What You Still CAN'T Test:**
- ❌ Tabroom scraping (requires actual network access)

---

## Option 3: Mock Data Testing

Test Purchase Order generation without Tabroom:

### Create Test Fee Sheet Data

Add this temporary button to the Fee Sheet tab in `tournaments/[id]/page.tsx`:

```typescript
// Add after the "Fetch Fee Sheet" button
<Button
  onClick={() => {
    const mockFeeSheet = {
      entries: [
        { category: 'Entry Fees', description: 'LD Debate', quantity: 2, unitPrice: 25, totalPrice: 50 },
        { category: 'Judge Fees', description: 'Judge Hire', quantity: 1, unitPrice: 100, totalPrice: 100 },
      ],
      totalAmount: 150,
      currency: 'USD',
      extractedAt: new Date().toISOString(),
      tabroomUrl: tournament.webpageUrl,
    };

    if (firestore) {
      updateDoc(doc(firestore, 'tournaments', tournament.id), {
        feeSheet: mockFeeSheet,
      });
    }
  }}
  variant="outline"
>
  Add Mock Fee Sheet (Test)
</Button>
```

Now you can:
1. Click "Add Mock Fee Sheet"
2. See the fee data display
3. Click "Generate Purchase Order"
4. Verify the Excel file downloads correctly
5. Open the Excel file and check all fields are filled

---

## Option 4: Staged Testing Approach (Safest)

Test one feature at a time:

### Phase 1: UI Only (No Backend)
✅ **Can Test Now:**
- Component rendering
- Tab navigation
- Checklist UI interactions
- Form validation
- Button states

```bash
npm run dev
# Just click around and verify no console errors
```

### Phase 2: Firestore Only (No Storage)
✅ **Can Test Now:**
- Checking/unchecking checklist items
- Saving paperwork state to Firestore
- Reading tournament data

**Test Steps:**
1. Check a checklist item
2. Refresh the page
3. Verify item is still checked (saved to Firestore)

### Phase 3: Storage (After Deploying Rules)
✅ **Can Test After:** `firebase deploy --only storage`
- File uploads
- File downloads
- File deletions

### Phase 4: AI Flows (Requires Credentials)
✅ **Can Test After:** Adding Tabroom credentials
- Fee sheet fetching
- PDF parsing
- Purchase Order generation

---

## TypeScript Error Checking

Most TypeScript errors in the codebase are pre-existing. To check if YOUR new code has errors:

```bash
cd debate-dashboard
npm run typecheck 2>&1 | grep -E "(fetch-tabroom-fee-sheet|purchase-order-generator|tournament-paperwork-checklist|tournaments/\[id\])"
```

This filters to only show errors in your new files.

---

## Build Test (Safe Pre-Deploy Check)

See if the code compiles for production:

```bash
cd debate-dashboard
npm run build
```

**Note:** The project has `typescript: { ignoreBuildErrors: true }` in next.config.ts, so the build will succeed even with TypeScript errors. This is intentional for development.

---

## Recommended Testing Flow

**Day 1: UI Testing (No Deploy Needed)**
```bash
npm run dev
# Click through all new UI elements
# Verify no console errors
# Test checklist interactions
```

**Day 2: Mock Data Testing**
```bash
# Add mock fee sheet button (see Option 3)
npm run dev
# Test Purchase Order generation with fake data
# Verify Excel file format
```

**Day 3: Deploy Storage Rules**
```bash
firebase deploy --only storage
# Now test file uploads in dev server
# Upload/download/delete documents
```

**Day 4: Add Tabroom Credentials**
```bash
# Add tabroomEmail/tabroomPassword to Firestore user doc
npm run dev
# Test fee sheet fetching from real tournament
# Verify PDF parsing works
```

**Day 5: Full Integration Test**
```bash
# Test complete workflow:
# 1. Fetch fee sheet
# 2. Generate Purchase Order
# 3. Upload to paperwork checklist
# 4. Mark items complete
```

---

## Troubleshooting Local Testing

### Error: "Firebase app not initialized"
**Fix:** Make sure you're logged in and user context is loaded

### Error: "Permission denied" on Storage upload
**Fix:** Deploy storage rules first: `firebase deploy --only storage`

### Error: Purchase Order template not found
**Fix:** Verify `templates/Purchase_Request_Template.xlsx` exists in project root

### Dev server won't start
**Fix:**
```bash
rm -rf .next node_modules
npm install
npm run dev
```

### Puppeteer errors on fee sheet fetch
**Fix:** Puppeteer needs Chrome installed. On Windows, it should auto-install with npm.

---

## What's Safe to Test Locally?

✅ **100% Safe (No Deploy Needed):**
- UI rendering
- Component interactions
- Client-side state management
- Mock data testing

✅ **Safe After Storage Deploy:**
- File uploads
- File downloads
- Document attachments

⚠️ **Requires Credentials:**
- Tabroom fee sheet fetching
- PDF parsing
- Real tournament data

❌ **Should NOT Test Locally:**
- Production data modifications
- Large-scale Firestore writes
- Actual purchases/payments

---

## Clean Up After Testing

### Remove Test Data from Firestore
```javascript
// Firebase Console → Firestore
// Delete test tournaments or fee sheets
```

### Remove Emulator Data
```bash
firebase emulators:start --export-on-exit=./emulator-data
# Data saved for next session

firebase emulators:start --import=./emulator-data
# Restore data
```

### Remove Mock Buttons
Don't forget to remove any test buttons before final deploy!

---

## Summary

**Best Testing Path:**
1. ✅ Start dev server → Test UI (5 min)
2. ✅ Add mock fee data → Test PO generation (10 min)
3. ✅ Deploy storage rules → Test file uploads (15 min)
4. ✅ Add Tabroom creds → Test fee fetching (20 min)
5. ✅ Run full workflow test (30 min)

**Total Testing Time:** ~1-2 hours before full production deploy

This approach lets you catch bugs early without risking production data!
