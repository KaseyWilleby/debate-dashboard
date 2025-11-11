const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
// Make sure you're logged in with: firebase login
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  projectId: 'debate-dashboard'
});

const db = getFirestore();

async function updateStudentIds() {
  try {
    console.log('Fetching all users...');
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('No users found.');
      return;
    }

    const batch = db.batch();
    let varsityCount = 0;
    let noviceCount = 0;
    let adminCount = 0;

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();

      // Skip if user already has a studentId
      if (userData.studentId) {
        console.log(`User ${userData.name} already has studentId: ${userData.studentId}`);
        return;
      }

      // Update based on role
      if (userData.role === 'varsity') {
        batch.update(doc.ref, { studentId: '1' });
        varsityCount++;
        console.log(`Updating ${userData.name} (varsity) with studentId: 1`);
      } else if (userData.role === 'novice') {
        batch.update(doc.ref, { studentId: '2' });
        noviceCount++;
        console.log(`Updating ${userData.name} (novice) with studentId: 2`);
      } else if (userData.role === 'admin') {
        adminCount++;
        console.log(`Skipping ${userData.name} (admin) - no studentId needed`);
      }
    });

    console.log('\nCommitting updates...');
    await batch.commit();

    console.log('\n✅ Update complete!');
    console.log(`- Updated ${varsityCount} varsity users with studentId: 1`);
    console.log(`- Updated ${noviceCount} novice users with studentId: 2`);
    console.log(`- Skipped ${adminCount} admin users`);

  } catch (error) {
    console.error('Error updating student IDs:', error);
  } finally {
    process.exit();
  }
}

updateStudentIds();
