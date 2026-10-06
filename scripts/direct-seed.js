/**
 * Direct seed script using Firebase Admin SDK
 * This runs with local credentials and seeds the PRODUCTION Firestore database
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

// Initialize Firebase Admin with credentials from .env
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function seedCollections() {
  console.log('🌱 Seeding appointment collections in production Firestore...\n');

  try {
    // 1. Create workspace
    console.log('Creating workspace...');
    const workspaceRef = db.collection('workspaces').doc();
    await workspaceRef.set({
      name: 'Main Office',
      description: 'Primary coaching office for appointments',
      teamId: 'cywoods',
      capacity: 4,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
    });
    console.log('✅ Created workspace:', workspaceRef.id);

    // 2. Create appointment window
    console.log('\nCreating appointment window...');
    const windowRef = db.collection('appointmentWindows').doc();
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    await windowRef.set({
      name: 'Weekly Office Hours',
      workspaceId: workspaceRef.id,
      teamId: 'cywoods',
      startDate: admin.firestore.Timestamp.fromDate(today),
      endDate: admin.firestore.Timestamp.fromDate(nextWeek),
      startTime: '14:00',
      endTime: '17:00',
      slotDuration: 30,
      daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
    });
    console.log('✅ Created appointment window:', windowRef.id);

    // 3. Create placeholder in appointments collection
    console.log('\nCreating appointments collection...');
    const appointmentRef = db.collection('appointments').doc('_placeholder');
    await appointmentRef.set({
      isPlaceholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created appointments collection');

    // 4. Create placeholder in officerAvailability collection
    console.log('\nCreating officerAvailability collection...');
    const availRef = db.collection('officerAvailability').doc('_placeholder');
    await availRef.set({
      isPlaceholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created officerAvailability collection');

    console.log('\n🎉 Successfully seeded all collections in production Firestore!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedCollections();
