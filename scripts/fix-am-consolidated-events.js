/**
 * Fix event names for A&M Consolidated UIL Tournament results
 * Updates "Unknown Event" entries to correct UIL event names:
 * - Bella: Informative Extemp → USX
 * - Shresta: Persuasive Extemp → IX
 * - Pranamya: Prose → Prose (should already be correct)
 *
 * Run this with: node scripts/fix-am-consolidated-events.js
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

async function fixAMConsolidatedEvents() {
  console.log('Fixing A&M Consolidated UIL Tournament event names...\n');

  try {
    // Find the A&M Consolidated tournament
    const tournamentsRef = collection(db, 'tournaments');
    const tournamentsSnapshot = await getDocs(tournamentsRef);

    let amConsolidatedId = null;
    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const tournament = tournamentDoc.data();
      if (tournament.name && tournament.name.includes('A&M Consolidated')) {
        amConsolidatedId = tournamentDoc.id;
        console.log(`Found tournament: ${tournament.name} (ID: ${amConsolidatedId})\n`);
        break;
      }
    }

    if (!amConsolidatedId) {
      console.log('A&M Consolidated tournament not found.');
      return;
    }

    // Get all results for this tournament
    const resultsRef = collection(db, 'tournamentResults');
    const resultsQuery = query(resultsRef, where('tournamentId', '==', amConsolidatedId));
    const resultsSnapshot = await getDocs(resultsQuery);

    console.log(`Found ${resultsSnapshot.size} results for this tournament.\n`);

    let fixedCount = 0;

    // Map of student names to correct events
    const studentEventMap = {
      'Bella': 'USX',           // Informative Extemp → USX
      'Shresta': 'IX',          // Persuasive Extemp → IX
      'Pranamya': 'Prose'       // Prose → Prose
    };

    for (const resultDoc of resultsSnapshot.docs) {
      const result = resultDoc.data();
      const studentName = result.studentName || '';

      // Check if this student needs fixing
      for (const [name, correctEvent] of Object.entries(studentEventMap)) {
        if (studentName.includes(name) && result.event !== correctEvent) {
          console.log(`Fixing result for ${studentName}:`);
          console.log(`  Old event: ${result.event}`);
          console.log(`  New event: ${correctEvent}`);

          const resultRef = doc(db, 'tournamentResults', resultDoc.id);
          await updateDoc(resultRef, {
            event: correctEvent
          });

          fixedCount++;
          console.log(`  ✓ Fixed!\n`);
          break;
        }
      }
    }

    if (fixedCount === 0) {
      console.log('No results needed fixing.');
    } else {
      console.log(`\nTotal results fixed: ${fixedCount}`);
    }

  } catch (error) {
    console.error('Error fixing events:', error);
    process.exit(1);
  }
}

// Run the script
fixAMConsolidatedEvents()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
