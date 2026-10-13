/**
 * Fix corrupted tournament dates in Firestore
 *
 * This script adds 1 day to all tournament dates and registration close dates
 * to fix the timezone corruption bug that was shifting dates back by 1 day.
 */

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { format, addDays } = require('date-fns');

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

async function fixTournamentDates() {
  console.log('🔧 Starting tournament date timezone fix...\n');

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

      // Fix tournament date
      if (tournament.date) {
        const currentDate = parseLocalDate(tournament.date);
        const fixedDate = addDays(currentDate, 1);
        const fixedDateStr = format(fixedDate, 'yyyy-MM-dd');

        console.log(`  Fixed date:   ${fixedDateStr}`);
        updates.date = fixedDateStr;
        needsUpdate = true;
      }

      // Fix registration close date if it exists
      if (tournament.registrationCloseDate) {
        console.log(`  Current reg close: ${tournament.registrationCloseDate}`);
        const currentRegDate = parseLocalDate(tournament.registrationCloseDate);
        const fixedRegDate = addDays(currentRegDate, 1);
        const fixedRegDateStr = format(fixedRegDate, 'yyyy-MM-dd');

        console.log(`  Fixed reg close:   ${fixedRegDateStr}`);
        updates.registrationCloseDate = fixedRegDateStr;
      }

      // Fix team registration deadline if it exists
      if (tournament.teamRegistrationDeadline) {
        console.log(`  Current team deadline: ${tournament.teamRegistrationDeadline}`);
        const currentTeamDate = parseLocalDate(tournament.teamRegistrationDeadline);
        const fixedTeamDate = addDays(currentTeamDate, 1);
        const fixedTeamDateStr = format(fixedTeamDate, 'yyyy-MM-dd');

        console.log(`  Fixed team deadline:   ${fixedTeamDateStr}`);
        updates.teamRegistrationDeadline = fixedTeamDateStr;
      }

      if (needsUpdate) {
        await db.collection('tournaments').doc(tournamentDoc.id).update(updates);
        console.log(`  ✅ Updated!`);
        fixedCount++;
      } else {
        console.log(`  ⏭️  Skipped (no date field)`);
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Date fix complete!');
    console.log('='.repeat(60));
    console.log(`Total tournaments: ${tournamentsSnapshot.size}`);
    console.log(`✅ Fixed: ${fixedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log('='.repeat(60));
    console.log('\n🎉 All tournament dates have been shifted forward by 1 day!');

  } catch (error) {
    console.error('❌ Error fixing tournament dates:', error);
    throw error;
  }
}

// Run the fix
fixTournamentDates()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
