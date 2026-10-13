/**
 * Debug script to check tournament dates and compare with today
 */

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { format, isBefore, isAfter, startOfDay } = require('date-fns');

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
  })
});
const db = getFirestore();

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

async function checkTournamentDates() {
  console.log('🔍 Checking tournament dates...\n');

  const today = startOfDay(new Date());
  console.log(`📅 Today's date: ${format(today, 'yyyy-MM-dd (EEEE, MMMM d, yyyy)')}\n`);

  try {
    const tournamentsSnapshot = await db.collection('tournaments').get();
    console.log(`Found ${tournamentsSnapshot.size} tournaments\n`);

    let futureCount = 0;
    let pastCount = 0;

    console.log('=' .repeat(80));

    const tournaments = [];
    tournamentsSnapshot.forEach(doc => {
      const data = doc.data();
      tournaments.push({ id: doc.id, ...data });
    });

    // Sort by date
    tournaments.sort((a, b) => {
      const dateA = parseLocalDate(a.date);
      const dateB = parseLocalDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    tournaments.forEach(tournament => {
      const tournamentDate = parseLocalDate(tournament.date);
      const isPast = isBefore(tournamentDate, today);
      const status = isPast ? '📅 PAST' : '🗓️  FUTURE';

      if (isPast) {
        pastCount++;
      } else {
        futureCount++;
      }

      console.log(`${status} | ${tournament.date} | ${tournament.name}`);
      if (tournament.isArchived) {
        console.log(`         └─ ⚠️  Archived`);
      }
    });

    console.log('=' .repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   🗓️  Future tournaments: ${futureCount}`);
    console.log(`   📅 Past tournaments: ${pastCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTournamentDates()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
