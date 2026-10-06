/**
 * Create dummy documents to ensure collections exist
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function createDummyDocs() {
  console.log('📝 Creating dummy documents to initialize collections...\n');

  try {
    // Create a dummy appointment
    const appointmentRef = db.collection('appointments').doc();
    await appointmentRef.set({
      teamId: 'cywoods',
      date: '2026-10-06',
      startTime: '14:00',
      endTime: '14:30',
      status: 'available',
      providerId: 'dummy',
      providerName: 'Dummy Provider',
      windowId: 'dummy',
      isDummy: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Created dummy appointment: ${appointmentRef.id}`);

    // Create a dummy officer availability
    const availRef = db.collection('officerAvailability').doc();
    await availRef.set({
      teamId: 'cywoods',
      officerId: 'dummy',
      officerName: 'Dummy Officer',
      windowId: 'dummy',
      isActive: false,
      isDummy: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Created dummy availability: ${availRef.id}`);

    console.log('\n🎉 Collections initialized!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

createDummyDocs();
