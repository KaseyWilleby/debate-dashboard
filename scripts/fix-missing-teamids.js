/**
 * Add teamId to tournaments that are missing it
 */

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
  })
});
const db = getFirestore();

async function fixMissingTeamIds() {
  console.log('🔧 Adding teamId to tournaments...\n');

  try {
    const tournamentsSnapshot = await db.collection('tournaments').get();

    let fixedCount = 0;
    let skippedCount = 0;

    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const tournament = tournamentDoc.data();

      if (!tournament.teamId) {
        console.log(`❌ Missing teamId: ${tournament.name} (${tournament.date})`);
        console.log(`   Adding teamId: cywoods`);

        await db.collection('tournaments').doc(tournamentDoc.id).update({
          teamId: 'cywoods'
        });

        console.log(`   ✅ Fixed!`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixedCount}`);
    console.log(`⏭️  Skipped (already had teamId): ${skippedCount}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixMissingTeamIds()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
