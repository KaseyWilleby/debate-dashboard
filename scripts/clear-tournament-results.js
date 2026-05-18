/**
 * Script to clear all tournament results from Firestore
 * Run this with: node scripts/clear-tournament-results.js
 *
 * This uses Firebase CLI authentication, so make sure you're logged in:
 * firebase login
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "debate-dashboard",
  "appId": "1:1029624329741:web:f064242d9f0ec880ea4744",
  "storageBucket": "debate-dashboard.firebasestorage.app",
  "apiKey": "AIzaSyBauNWN3vrIV5JdK6_MVzJwR-d2pnBUYz8",
  "authDomain": "debate-dashboard.firebaseapp.com",
  "messagingSenderId": "1029624329741",
  "measurementId": "G-F77FZFJJ3R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearTournamentResults() {
  console.log('Starting to clear tournament results...');

  try {
    // Get all tournament results
    const resultsRef = collection(db, 'tournamentResults');
    const snapshot = await getDocs(resultsRef);

    if (snapshot.empty) {
      console.log('No tournament results found. Database is already clean.');
      return;
    }

    console.log(`Found ${snapshot.size} tournament results to delete.`);

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deletedCount = 0;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);

      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`Deleted ${deletedCount} of ${docs.length} results...`);
    }

    console.log(`✅ Successfully deleted ${deletedCount} tournament results.`);
    console.log('Database is now clean and ready for fresh imports.');

  } catch (error) {
    console.error('❌ Error clearing tournament results:', error);
    console.error('Make sure you have the correct Firebase permissions.');
    process.exit(1);
  }
}

// Run the script
clearTournamentResults()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
