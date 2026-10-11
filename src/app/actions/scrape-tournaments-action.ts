'use server';

import { scrapeTabroomTournaments } from '@/ai/flows/scrape-tabroom-flow';
import { adminDb } from '@/firebase/admin';
import type { ScrapedTournament } from '@/lib/types';

/**
 * Server action to scrape tournaments and save to Firestore
 * This should be called weekly via Cloud Scheduler or manually by admins
 */
export async function refreshTournamentDatabase() {
    try {
        console.log('Starting tournament database refresh...');

        // Scrape tournaments from Tabroom.com
        const tournaments = await scrapeTabroomTournaments();

        if (tournaments.length === 0) {
            throw new Error('No tournaments scraped');
        }

        console.log(`Scraped ${tournaments.length} tournaments, saving to Firestore...`);

        const lastScraped = new Date().toISOString();
        const batch = adminDb.batch();
        const scrapedTournamentsRef = adminDb.collection('scrapedTournaments');

        // Clear old tournaments first
        const oldTournaments = await scrapedTournamentsRef.get();
        oldTournaments.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Add new tournaments
        for (const tournament of tournaments) {
            // Create a valid Firestore document ID from the URL
            const tournId = tournament.url
                .replace('https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=', '')
                .replace('https://www.tabroom.com/index/tourn/main.mhtml?tourn_id=', '')
                .replace(/[^a-zA-Z0-9]/g, '_');

            const docRef = scrapedTournamentsRef.doc(tournId);
            batch.set(docRef, {
                ...tournament,
                lastScraped,
            });
        }

        await batch.commit();

        // Update metadata document to track last scrape time
        const metadataRef = adminDb.collection('metadata').doc('tournamentScraper');
        await metadataRef.set({
            lastScraped,
            tournamentCount: tournaments.length,
        });

        console.log(`Successfully saved ${tournaments.length} tournaments to Firestore`);

        return {
            success: true,
            count: tournaments.length,
            lastScraped,
        };
    } catch (error) {
        console.error('Failed to refresh tournament database:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get metadata about the last scrape
 */
export async function getTournamentScraperMetadata() {
    try {
        const metadataRef = adminDb.collection('metadata').doc('tournamentScraper');
        const doc = await metadataRef.get();

        if (!doc.exists) {
            return null;
        }

        return doc.data() as { lastScraped: string; tournamentCount: number };
    } catch (error) {
        console.error('Failed to get tournament scraper metadata:', error);
        return null;
    }
}
