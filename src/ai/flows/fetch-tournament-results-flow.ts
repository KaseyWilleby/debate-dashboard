'use server';
/**
 * @fileOverview Flow for fetching tournament results from Tabroom.com
 *
 * This flow scrapes tournament results for a specific school and parses
 * individual student placements to populate the analytics dashboard.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { TournamentResult, PlacementType } from '@/lib/types';

const FetchTournamentResultsInputSchema = z.object({
  tournamentUrl: z.string().url().describe("The Tabroom tournament URL"),
  schoolName: z.string().describe("School name to filter results for (e.g., 'Cy-Woods')"),
  tournamentName: z.string().describe("Tournament name for display"),
  tournamentDate: z.string().describe("Tournament date in YYYY-MM-DD format"),
});
export type FetchTournamentResultsInput = z.infer<typeof FetchTournamentResultsInputSchema>;

const StudentResultSchema = z.object({
  studentName: z.string().describe("Full name of the student"),
  nsdaId: z.string().optional().describe("NSDA ID number if visible in results"),
  event: z.string().describe("Event name (e.g., 'LD', 'Extemp', 'Congress')"),
  placement: z.enum([
    'champion',
    'finalist',
    'semifinalist',
    'quarterfinalist',
    'octafinalist',
    'double-octafinalist',
    'speaker-award',
    'top-speaker',
    'preliminary-advancement',
    'participated',
    'other'
  ]).describe("Placement type"),
  placementDetail: z.string().optional().describe("Specific placement like '1st Place' or '3rd Speaker'"),
  partnerName: z.string().optional().describe("Partner name for team events"),
  preliminaryRecord: z.string().optional().describe("Preliminary record like '4-2'"),
  speakerPoints: z.number().optional().describe("Total speaker points"),
  speakerRank: z.number().optional().describe("Speaker rank"),
  totalCompetitors: z.number().optional().describe("Total number of competitors in event"),
  breakingCompetitors: z.number().optional().describe("Number of competitors who broke to elims"),
  notes: z.string().optional().describe("Additional notes about the performance"),
});

const FetchTournamentResultsOutputSchema = z.object({
  results: z.array(StudentResultSchema).describe("Array of individual student results"),
  rawHtml: z.string().optional().describe("Raw HTML for debugging"),
});
export type FetchTournamentResultsOutput = z.infer<typeof FetchTournamentResultsOutputSchema>;

/**
 * Helper function to determine placement type from placement text
 */
function determinePlacementType(placementText: string): PlacementType {
  const lower = placementText.toLowerCase();

  if (lower.includes('champion') || lower.includes('1st place') || lower.includes('first place')) {
    return 'champion';
  }
  if (lower.includes('finalist') || lower.includes('2nd place') || lower.includes('second place') || lower.includes('finals')) {
    return 'finalist';
  }
  if (lower.includes('semifinalist') || lower.includes('semi') || lower.includes('semis')) {
    return 'semifinalist';
  }
  if (lower.includes('quarterfinalist') || lower.includes('quarter') || lower.includes('quarters')) {
    return 'quarterfinalist';
  }
  if (lower.includes('octafinalist') || lower.includes('octa') || lower.includes('octos')) {
    return 'octafinalist';
  }
  if (lower.includes('double-octafinalist') || lower.includes('double octa')) {
    return 'double-octafinalist';
  }
  if (lower.includes('top speaker') || lower.includes('1st speaker')) {
    return 'top-speaker';
  }
  if (lower.includes('speaker')) {
    return 'speaker-award';
  }
  if (lower.includes('broke') || lower.includes('break') || lower.includes('elim')) {
    return 'preliminary-advancement';
  }

  return 'participated';
}

const prompt = ai.definePrompt({
  name: 'fetchTournamentResultsPrompt',
  input: { schema: z.object({ html: z.string(), schoolName: z.string() }) },
  output: { schema: FetchTournamentResultsOutputSchema },
  prompt: `You are analyzing tournament results from Tabroom.com HTML. Extract all individual student results for {{{schoolName}}}.

HTML Content:
---
{{{html}}}
---

Parse the HTML and extract:
1. Student names (look for competitor/entry names from {{{schoolName}}})
2. NSDA ID numbers if visible (often shown as a numeric ID next to names)
3. Events they competed in (e.g., Lincoln-Douglas Debate, Policy Debate, Public Forum, Extemp, Congress, etc.)
4. Their placements (champion, finalist, semifinalist, quarterfinalist, etc.)
5. Specific placement details (e.g., "1st Place", "3rd Speaker", "Semifinalist")
6. Preliminary records (e.g., "4-2", "3-3")
7. Speaker awards or ranks (if listed)
8. Partner names for team events (Policy, PF, etc.)
9. Total number of competitors in each event
10. Number of competitors who broke to elimination rounds

IMPORTANT INSTRUCTIONS:
- ONLY include students from "{{{schoolName}}}" or variations like "Cy-Woods HS", "Cypress Woods", etc.
- Search for school name in headers, entry names, and result listings
- Each student-event combination should be a separate result entry
- If a student competed in multiple events, create separate results for each event
- For team events (Policy, PF), list both partner names
- Extract NSDA ID numbers when visible (usually 6-digit numbers near student names)
- Convert placement text to the appropriate placement type:
  * "Champion", "1st Place", "First Place" → champion
  * "Finalist", "2nd Place", "Finals" → finalist
  * "Semifinalist", "Semis" → semifinalist
  * "Quarterfinalist", "Quarters" → quarterfinalist
  * "Octafinalist", "Octos" → octafinalist
  * "Top Speaker", "1st Speaker" → top-speaker
  * Any other speaker award → speaker-award
  * "Broke to elims" → preliminary-advancement
  * If no clear placement, use "participated"

Return the structured results in the specified schema.`,
});

/**
 * Fetch tournament results from Tabroom
 */
export async function fetchTournamentResults(input: FetchTournamentResultsInput): Promise<FetchTournamentResultsOutput> {
  try {
    // Construct the results URL
    // Tabroom results are typically at /index/tourn/results/index.mhtml?tourn_id=XXXXX
    const urlObj = new URL(input.tournamentUrl);
    const tournId = new URLSearchParams(urlObj.search).get('tourn_id');

    if (!tournId) {
      throw new Error('Could not extract tournament ID from URL');
    }

    const resultsUrl = `https://www.tabroom.com/index/tourn/results/index.mhtml?tourn_id=${tournId}`;

    // Fetch the results page
    const response = await fetch(resultsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch results: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Use AI to parse the HTML and extract results
    const { output } = await prompt({
      html: html.slice(0, 50000), // Limit to first 50k chars to avoid token limits
      schoolName: input.schoolName,
    });

    // Process and enhance the results
    const enhancedResults = output.results.map(result => ({
      ...result,
      placement: result.placement || determinePlacementType(result.placementDetail || ''),
    }));

    return {
      results: enhancedResults,
      rawHtml: html.slice(0, 1000), // Include small sample for debugging
    };

  } catch (error) {
    console.error('Error fetching tournament results:', error);

    // Return empty results on error
    return {
      results: [],
      rawHtml: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
