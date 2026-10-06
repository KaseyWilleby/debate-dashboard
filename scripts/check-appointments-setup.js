/**
 * Check if appointment collections exist and are accessible
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

async function checkSetup() {
  console.log('🔍 Checking appointment collections setup...\n');

  try {
    // Check workspaces
    console.log('1. Checking workspaces collection...');
    const workspacesSnapshot = await db.collection('workspaces').get();
    console.log(`   Found ${workspacesSnapshot.size} workspace(s)`);
    workspacesSnapshot.forEach(doc => {
      console.log(`   - ${doc.id}: ${doc.data().name} (teamId: ${doc.data().teamId})`);
    });

    // Check appointmentWindows
    console.log('\n2. Checking appointmentWindows collection...');
    const windowsSnapshot = await db.collection('appointmentWindows').get();
    console.log(`   Found ${windowsSnapshot.size} window(s)`);
    windowsSnapshot.forEach(doc => {
      console.log(`   - ${doc.id}: ${doc.data().name} (teamId: ${doc.data().teamId})`);
    });

    // Check appointments
    console.log('\n3. Checking appointments collection...');
    const appointmentsSnapshot = await db.collection('appointments').get();
    console.log(`   Found ${appointmentsSnapshot.size} appointment(s)`);
    if (appointmentsSnapshot.size > 0) {
      appointmentsSnapshot.forEach(doc => {
        console.log(`   - ${doc.id}: ${JSON.stringify(doc.data())}`);
      });
    }

    // Check officerAvailability
    console.log('\n4. Checking officerAvailability collection...');
    const availabilitySnapshot = await db.collection('officerAvailability').get();
    console.log(`   Found ${availabilitySnapshot.size} availability record(s)`);
    if (availabilitySnapshot.size > 0) {
      availabilitySnapshot.forEach(doc => {
        console.log(`   - ${doc.id}: ${JSON.stringify(doc.data())}`);
      });
    }

    // Try a team-specific query (like the app does)
    console.log('\n5. Testing team-specific query (teamId: cywoods)...');
    const teamWorkspaces = await db.collection('workspaces')
      .where('teamId', '==', 'cywoods')
      .get();
    console.log(`   Found ${teamWorkspaces.size} workspace(s) for cywoods`);

    console.log('\n✅ All checks complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkSetup();
