'use server';

import { scrapeTabroomTournaments } from '@/ai/flows/scrape-tabroom-flow';
import type { ScrapedTournament } from '@/lib/types';

// Note: We'll use a workaround for now - store in a cache file or use client SDK
// TODO: Set up proper Firebase Admin SDK credentials for production

/**
 * Server action to scrape tournaments from Tabroom.com
 * Returns the scraped data to be saved by the client
 */
export async function refreshTournamentDatabase() {
    try {
        console.log('Starting tournament scraping...');

        // Scrape tournaments from Tabroom.com
        const tournaments = await scrapeTabroomTournaments();

        if (tournaments.length === 0) {
            throw new Error('No tournaments scraped');
        }

        console.log(`Successfully scraped ${tournaments.length} tournaments`);

        const lastScraped = new Date().toISOString();

        return {
            success: true,
            count: tournaments.length,
            lastScraped,
            tournaments, // Return tournaments for client to save
        };
    } catch (error) {
        console.error('Failed to scrape tournaments:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            tournaments: [],
        };
    }
}

/**
 * Get metadata about the last scrape
 * This is now handled client-side by reading from Firestore directly
 */
export async function getTournamentScraperMetadata() {
    // Client-side will handle this by querying Firestore directly
    // Return null here since we don't have Admin SDK set up yet
    console.log('getTournamentScraperMetadata called - client should query Firestore directly');
    return null;
}
