const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateMrWillebyToAdmin() {
  try {
    // Find user with Mr. Willeby's email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'kaseywilleby@gmail.com')
      .get();

    if (usersSnapshot.empty) {
      console.log('No user found with email kaseywilleby@gmail.com');
      return;
    }

    // Update the user document
    const userDoc = usersSnapshot.docs[0];
    await userDoc.ref.update({
      role: 'admin',
      approved: true
    });

    console.log('Successfully updated Mr. Willeby\'s account to admin with approved status!');
    console.log('User ID:', userDoc.id);
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    process.exit();
  }
}

updateMrWillebyToAdmin();
