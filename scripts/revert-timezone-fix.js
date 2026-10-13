/**
 * Revert the timezone date fix by subtracting 1 day from all tournament dates
 *
 * This reverses the changes made by fix-timezone-dates.js
 */

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { format, subDays } = require('date-fns');

// Initialize Firebase Admin with credentials from .env
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
  })
});
const db = getFirestore();

// Helper function to parse yyyy-MM-dd dates in local time
function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

async function revertTournamentDates() {
  console.log('🔄 Reverting tournament date timezone fix...\n');

  try {
    // Get all tournaments
    const tournamentsSnapshot = await db.collection('tournaments').get();

    if (tournamentsSnapshot.empty) {
      console.log('No tournaments found.');
      return;
    }

    console.log(`Found ${tournamentsSnapshot.size} tournaments to process.\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const tournament = tournamentDoc.data();
      const updates = {};
      let needsUpdate = false;

      console.log(`\nProcessing: ${tournament.name}`);
      console.log(`  Current date: ${tournament.date}`);

      // Revert tournament date (subtract 1 day)
      if (tournament.date) {
        const currentDate = parseLocalDate(tournament.date);
        const revertedDate = subDays(currentDate, 1);
        const revertedDateStr = format(revertedDate, 'yyyy-MM-dd');

        console.log(`  Reverted date:   ${revertedDateStr}`);
        updates.date = revertedDateStr;
        needsUpdate = true;
      }

      // Revert registration close date if it exists
      if (tournament.registrationCloseDate) {
        console.log(`  Current reg close: ${tournament.registrationCloseDate}`);
        const currentRegDate = parseLocalDate(tournament.registrationCloseDate);
        const revertedRegDate = subDays(currentRegDate, 1);
        const revertedRegDateStr = format(revertedRegDate, 'yyyy-MM-dd');

        console.log(`  Reverted reg close:   ${revertedRegDateStr}`);
        updates.registrationCloseDate = revertedRegDateStr;
      }

      // Revert team registration deadline if it exists
      if (tournament.teamRegistrationDeadline) {
        console.log(`  Current team deadline: ${tournament.teamRegistrationDeadline}`);
        const currentTeamDate = parseLocalDate(tournament.teamRegistrationDeadline);
        const revertedTeamDate = subDays(currentTeamDate, 1);
        const revertedTeamDateStr = format(revertedTeamDate, 'yyyy-MM-dd');

        console.log(`  Reverted team deadline:   ${revertedTeamDateStr}`);
        updates.teamRegistrationDeadline = revertedTeamDateStr;
      }

      if (needsUpdate) {
        await db.collection('tournaments').doc(tournamentDoc.id).update(updates);
        console.log(`  ✅ Reverted!`);
        fixedCount++;
      } else {
        console.log(`  ⏭️  Skipped (no date field)`);
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Date revert complete!');
    console.log('='.repeat(60));
    console.log(`Total tournaments: ${tournamentsSnapshot.size}`);
    console.log(`✅ Reverted: ${fixedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log('='.repeat(60));
    console.log('\n🎉 All tournament dates have been shifted back by 1 day!');

  } catch (error) {
    console.error('❌ Error reverting tournament dates:', error);
    throw error;
  }
}

// Run the revert
revertTournamentDates()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
