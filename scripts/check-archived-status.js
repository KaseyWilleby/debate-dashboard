/**
 * Check which tournaments are archived and show their dates
 */

require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { isBefore, startOfDay } = require('date-fns');

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

async function checkArchivedStatus() {
  console.log('🔍 Checking tournament archived status...\n');

  const today = startOfDay(new Date());
  console.log(`Today: ${today.toISOString().split('T')[0]}\n`);

  try {
    const tournamentsSnapshot = await db.collection('tournaments').get();

    const archived = [];
    const active = [];

    tournamentsSnapshot.forEach(doc => {
      const data = doc.data();
      const tournamentDate = parseLocalDate(data.date);
      const isPast = isBefore(tournamentDate, today);

      const tournament = {
        name: data.name,
        date: data.date,
        isArchived: data.isArchived || false,
        isPast,
        id: doc.id
      };

      if (tournament.isArchived) {
        archived.push(tournament);
      } else {
        active.push(tournament);
      }
    });

    console.log('=' .repeat(80));
    console.log('✅ ACTIVE TOURNAMENTS (not archived)');
    console.log('=' .repeat(80));
    active.sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    active.forEach(t => {
      const status = t.isPast ? '📅 PAST' : '🗓️  FUTURE';
      console.log(`${status} | ${t.date} | ${t.name}`);
    });

    console.log('\n' + '=' .repeat(80));
    console.log('📦 ARCHIVED TOURNAMENTS');
    console.log('=' .repeat(80));
    archived.sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    archived.forEach(t => {
      const status = t.isPast ? '📅 PAST' : '🗓️  FUTURE';
      console.log(`${status} | ${t.date} | ${t.name}`);
    });

    console.log('\n' + '=' .repeat(80));
    console.log(`📊 Summary:`);
    console.log(`   ✅ Active: ${active.length}`);
    console.log(`   📦 Archived: ${archived.length}`);
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkArchivedStatus()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
