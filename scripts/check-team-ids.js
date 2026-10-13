/**
 * Check teamId on all tournaments
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

async function checkTeamIds() {
  console.log('🔍 Checking tournament teamIds...\n');

  try {
    const tournamentsSnapshot = await db.collection('tournaments').get();
    console.log(`Total tournaments: ${tournamentsSnapshot.size}\n`);

    const byTeamId = {};
    const noTeamId = [];

    tournamentsSnapshot.forEach(doc => {
      const data = doc.data();

      if (data.teamId) {
        if (!byTeamId[data.teamId]) {
          byTeamId[data.teamId] = [];
        }
        byTeamId[data.teamId].push({
          name: data.name,
          date: data.date,
          isArchived: data.isArchived || false
        });
      } else {
        noTeamId.push({
          name: data.name,
          date: data.date,
          isArchived: data.isArchived || false
        });
      }
    });

    console.log('=' .repeat(80));
    console.log('📊 TOURNAMENTS BY TEAM ID');
    console.log('=' .repeat(80));

    Object.keys(byTeamId).sort().forEach(teamId => {
      const tournaments = byTeamId[teamId];
      const active = tournaments.filter(t => !t.isArchived).length;
      const archived = tournaments.filter(t => t.isArchived).length;

      console.log(`\n${teamId}: ${tournaments.length} total (${active} active, ${archived} archived)`);
      tournaments.forEach(t => {
        const status = t.isArchived ? '📦' : '✅';
        console.log(`  ${status} ${t.date} - ${t.name}`);
      });
    });

    if (noTeamId.length > 0) {
      console.log('\n' + '=' .repeat(80));
      console.log('⚠️  TOURNAMENTS WITHOUT TEAM ID');
      console.log('=' .repeat(80));
      noTeamId.forEach(t => {
        const status = t.isArchived ? '📦' : '✅';
        console.log(`${status} ${t.date} - ${t.name}`);
      });
    }

    console.log('\n' + '=' .repeat(80));
    console.log('Summary:');
    console.log(`  Teams found: ${Object.keys(byTeamId).length}`);
    console.log(`  Tournaments without teamId: ${noTeamId.length}`);
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTeamIds()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
