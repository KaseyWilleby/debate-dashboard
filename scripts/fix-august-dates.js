/**
 * Fix dates for August tournaments that were incorrectly dated as 2026 instead of 2025
 * Run this with: node scripts/fix-august-dates.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');

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

async function fixAugustDates() {
  console.log('Fixing August 2026 tournament dates to August 2025...\n');

  try {
    // Get all tournaments
    const tournamentsRef = collection(db, 'tournaments');
    const tournamentsSnapshot = await getDocs(tournamentsRef);

    let fixedCount = 0;

    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const tournament = tournamentDoc.data();
      const tournamentId = tournamentDoc.id;

      // Check if date is in August 2026
      if (tournament.date && tournament.date.startsWith('2026-08-')) {
        const oldDate = tournament.date;
        const newDate = tournament.date.replace('2026-08-', '2025-08-');

        console.log(`Fixing tournament: ${tournament.name}`);
        console.log(`  Old date: ${oldDate}`);
        console.log(`  New date: ${newDate}`);

        // Update tournament date
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        await updateDoc(tournamentRef, {
          date: newDate
        });

        // Also update all results for this tournament
        const resultsRef = collection(db, 'tournamentResults');
        const resultsQuery = query(resultsRef, where('tournamentId', '==', tournamentId));
        const resultsSnapshot = await getDocs(resultsQuery);

        console.log(`  Updating ${resultsSnapshot.size} results...`);

        for (const resultDoc of resultsSnapshot.docs) {
          const resultRef = doc(db, 'tournamentResults', resultDoc.id);
          await updateDoc(resultRef, {
            date: newDate
          });
        }

        fixedCount++;
        console.log(`  ✓ Fixed!\n`);
      }
    }

    if (fixedCount === 0) {
      console.log('No tournaments needed fixing.');
    } else {
      console.log(`\nTotal tournaments fixed: ${fixedCount}`);
    }

  } catch (error) {
    console.error('Error fixing dates:', error);
    process.exit(1);
  }
}

// Run the script
fixAugustDates()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
