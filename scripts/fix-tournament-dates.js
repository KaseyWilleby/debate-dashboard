/**
 * Script to fix tournament dates that were incorrectly saved as today's date
 * Matches tournaments with scrapedTournaments collection and updates the dates
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { parse, format } = require('date-fns');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

async function fixTournamentDates() {
  console.log('🔍 Starting tournament date fix script...\n');

  try {
    // Get today's date in yyyy-MM-dd format
    const today = format(new Date(), 'yyyy-MM-dd');
    console.log(`Today's date: ${today}`);

    // Fetch all tournaments
    const tournamentsSnapshot = await db.collection('tournaments').get();
    console.log(`Found ${tournamentsSnapshot.size} tournaments\n`);

    // Fetch all scraped tournaments
    const scrapedSnapshot = await db.collection('scrapedTournaments').get();
    const scrapedTournaments = new Map();

    scrapedSnapshot.forEach(doc => {
      const data = doc.data();
      // Use URL as key for matching
      scrapedTournaments.set(data.url, data);
    });
    console.log(`Found ${scrapedTournaments.size} scraped tournaments\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each tournament
    for (const doc of tournamentsSnapshot.docs) {
      const tournament = doc.data();
      const tournamentId = doc.id;

      // Check if date is today (indicates it was incorrectly saved)
      if (tournament.date === today) {
        console.log(`\n❌ Found tournament with today's date:`);
        console.log(`   ID: ${tournamentId}`);
        console.log(`   Name: ${tournament.name}`);
        console.log(`   Current Date: ${tournament.date}`);
        console.log(`   URL: ${tournament.webpageUrl}`);

        // Try to find matching scraped tournament
        const scrapedTournament = scrapedTournaments.get(tournament.webpageUrl);

        if (scrapedTournament) {
          try {
            // Parse the scraped tournament date
            const dateStr = scrapedTournament.date.trim().replace(',', '');
            const parsedDate = parse(dateStr, 'M/d yyyy', new Date());

            if (isNaN(parsedDate.getTime())) {
              console.log(`   ⚠️  Could not parse scraped date: ${scrapedTournament.date}`);
              errorCount++;
              continue;
            }

            const correctDate = format(parsedDate, 'yyyy-MM-dd');
            console.log(`   ✅ Found correct date: ${correctDate} (from scraped: ${scrapedTournament.date})`);

            // Update the tournament
            await db.collection('tournaments').doc(tournamentId).update({
              date: correctDate
            });

            console.log(`   ✨ Updated tournament date successfully!`);
            fixedCount++;

          } catch (error) {
            console.log(`   ❌ Error parsing/updating date:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`   ⚠️  No matching scraped tournament found for URL: ${tournament.webpageUrl}`);
          errorCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixedCount} tournament(s)`);
    console.log(`⏭️  Skipped (already correct): ${skippedCount} tournament(s)`);
    console.log(`❌ Errors: ${errorCount} tournament(s)`);
    console.log('='.repeat(60));

    if (fixedCount > 0) {
      console.log('\n🎉 Tournament dates have been fixed!');
      console.log('You should now see tournaments on the correct dates in the calendar.');
    } else if (errorCount > 0) {
      console.log('\n⚠️  Some tournaments could not be fixed automatically.');
      console.log('You may need to manually delete and re-add them.');
    } else {
      console.log('\n✅ All tournaments already have correct dates!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fixTournamentDates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
