/**
 * Delete placeholder documents that don't have teamId
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function deletePlaceholders() {
  console.log('🗑️  Deleting placeholder documents...\n');

  try {
    // Delete appointments placeholder
    console.log('Deleting appointments/_placeholder...');
    await db.collection('appointments').doc('_placeholder').delete();
    console.log('✅ Deleted appointments/_placeholder');

    // Delete officerAvailability placeholder
    console.log('\nDeleting officerAvailability/_placeholder...');
    await db.collection('officerAvailability').doc('_placeholder').delete();
    console.log('✅ Deleted officerAvailability/_placeholder');

    console.log('\n🎉 Successfully deleted placeholder documents!');
    console.log('The appointments page should now work correctly.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

deletePlaceholders();
