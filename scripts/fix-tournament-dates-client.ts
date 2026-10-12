/**
 * Client-side script to fix tournament dates
 * This can be run from a temporary page in the app with proper auth
 */

import { collection, getDocs, doc, updateDoc, getFirestore } from 'firebase/firestore';
import { parse, format } from 'date-fns';

interface ScrapedTournament {
  name: string;
  date: string;
  url: string;
  state?: string;
  circuits?: string[];
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  webpageUrl?: string;
  [key: string]: any;
}

export async function fixTournamentDates(firestore: any) {
  console.log('🔍 Starting tournament date fix...\n');

  try {
    // Get today's date in yyyy-MM-dd format
    const today = format(new Date(), 'yyyy-MM-dd');
    console.log(`Today's date: ${today}`);

    // Fetch all tournaments
    const tournamentsSnapshot = await getDocs(collection(firestore, 'tournaments'));
    console.log(`Found ${tournamentsSnapshot.size} tournaments\n`);

    // Fetch all scraped tournaments
    const scrapedSnapshot = await getDocs(collection(firestore, 'scrapedTournaments'));
    const scrapedTournaments = new Map<string, ScrapedTournament>();

    scrapedSnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data() as ScrapedTournament;
      scrapedTournaments.set(data.url, data);
    });
    console.log(`Found ${scrapedTournaments.size} scraped tournaments\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    // Process each tournament
    for (const docSnapshot of tournamentsSnapshot.docs) {
      const tournament = { id: docSnapshot.id, ...docSnapshot.data() } as Tournament;

      // Check if date is today (indicates it was incorrectly saved)
      if (tournament.date === today) {
        console.log(`\n❌ Found tournament with today's date:`);
        console.log(`   ID: ${tournament.id}`);
        console.log(`   Name: ${tournament.name}`);
        console.log(`   Current Date: ${tournament.date}`);
        console.log(`   URL: ${tournament.webpageUrl}`);

        // Try to find matching scraped tournament
        const scrapedTournament = tournament.webpageUrl
          ? scrapedTournaments.get(tournament.webpageUrl)
          : null;

        if (scrapedTournament) {
          try {
            // Parse the scraped tournament date
            const dateStr = scrapedTournament.date.trim().replace(',', '');
            const parsedDate = parse(dateStr, 'M/d yyyy', new Date());

            if (isNaN(parsedDate.getTime())) {
              console.log(`   ⚠️  Could not parse scraped date: ${scrapedTournament.date}`);
              results.push({
                tournament: tournament.name,
                status: 'error',
                reason: `Could not parse date: ${scrapedTournament.date}`
              });
              errorCount++;
              continue;
            }

            const correctDate = format(parsedDate, 'yyyy-MM-dd');
            console.log(`   ✅ Found correct date: ${correctDate} (from scraped: ${scrapedTournament.date})`);

            // Update the tournament
            const tournamentRef = doc(firestore, 'tournaments', tournament.id);
            await updateDoc(tournamentRef, {
              date: correctDate
            });

            console.log(`   ✨ Updated tournament date successfully!`);
            results.push({
              tournament: tournament.name,
              status: 'fixed',
              oldDate: tournament.date,
              newDate: correctDate
            });
            fixedCount++;

          } catch (error: any) {
            console.log(`   ❌ Error parsing/updating date:`, error.message);
            results.push({
              tournament: tournament.name,
              status: 'error',
              reason: error.message
            });
            errorCount++;
          }
        } else {
          console.log(`   ⚠️  No matching scraped tournament found`);
          results.push({
            tournament: tournament.name,
            status: 'error',
            reason: 'No matching scraped tournament found'
          });
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

    return {
      success: true,
      fixed: fixedCount,
      skipped: skippedCount,
      errors: errorCount,
      results
    };

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
