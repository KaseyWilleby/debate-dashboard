const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "debate-dashboard",
  "appId": "1:1029624329741:web:f064242d9f0ec880ea4744",
  "storageBucket": "debate-dashboard.firebasestorage.app",
  "apiKey": "AIzaSyBauNWN3vrIV5JdK6_MVzJwR-d2pnBUYz8",
  "authDomain": "debate-dashboard.firebaseapp.com",
  "messagingSenderId": "1029624329741",
  "measurementId": "G-F77FZFJJ3R"
};

async function checkNotifications() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const providerId = 'bxAa8Hr1o6OCVpqvPzvaOs60xJo1';

    console.log(`\nChecking notifications for user: ${providerId}`);
    console.log('='.repeat(60));

    const notificationsRef = collection(db, 'users', providerId, 'notifications');
    const snapshot = await getDocs(notificationsRef);

    console.log(`\nFound ${snapshot.size} notification(s)\n`);

    snapshot.forEach(doc => {
      console.log('Notification ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
      console.log('-'.repeat(60));
    });

    // Also check the user document itself
    console.log('\nChecking user document...');
    const userRef = collection(db, 'users');
    const userSnapshot = await getDocs(query(userRef));

    const user = userSnapshot.docs.find(doc => doc.id === providerId);
    if (user) {
      console.log('User found:', user.data().email || user.data().name);
      console.log('User ID:', user.id);
    } else {
      console.log('ERROR: User document not found!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkNotifications();
