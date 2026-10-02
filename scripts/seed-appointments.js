/**
 * Seed script for appointment collections
 * Run this once to create the initial collections in Firestore
 *
 * Usage: node scripts/seed-appointments.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'debate-dashboard',
  });
}

const db = admin.firestore();

async function seedAppointments() {
  console.log('🌱 Starting to seed appointment collections...\n');

  try {
    // 1. Create a sample workspace for cywoods team
    console.log('Creating sample workspace...');
    const workspaceRef = db.collection('workspaces').doc();
    await workspaceRef.set({
      name: 'Main Office',
      description: 'Primary coaching office',
      teamId: 'cywoods',
      capacity: 4,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
    });
    console.log('✅ Created workspace:', workspaceRef.id);

    // 2. Create a sample appointment window
    console.log('\nCreating sample appointment window...');
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
      startTime: '14:00', // 2:00 PM
      endTime: '17:00',   // 5:00 PM
      slotDuration: 30,   // 30 minutes
      daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
    });
    console.log('✅ Created appointment window:', windowRef.id);

    // 3. Create empty placeholder for appointments collection
    console.log('\nCreating appointments collection placeholder...');
    const appointmentRef = db.collection('appointments').doc('_placeholder');
    await appointmentRef.set({
      isPlaceholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created appointments collection');

    // 4. Create empty placeholder for officerAvailability collection
    console.log('\nCreating officerAvailability collection placeholder...');
    const availRef = db.collection('officerAvailability').doc('_placeholder');
    await availRef.set({
      isPlaceholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Created officerAvailability collection');

    console.log('\n🎉 Successfully seeded all appointment collections!');
    console.log('\nYou can now delete the placeholder documents from the Firebase Console if desired.');
    console.log('The collections now exist and your app should have proper access.\n');

  } catch (error) {
    console.error('❌ Error seeding collections:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed function
seedAppointments();
