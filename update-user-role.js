const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateUserRole() {
  const userId = 'bxAa8Hr1o6OCVpqvPzvaOs60xJo1';
  const userRef = db.collection('users').doc(userId);

  try {
    const doc = await userRef.get();
    if (doc.exists) {
      console.log('Current user data:', doc.data());

      await userRef.update({
        role: 'superadmin',
        approved: true
      });

      console.log('✅ User role updated to superadmin');

      const updatedDoc = await userRef.get();
      console.log('Updated user data:', updatedDoc.data());
    } else {
      console.log('User document not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

updateUserRole();
