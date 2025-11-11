'use server';
/**
 * @fileOverview An AI flow for extracting tournament results from Tabroom.com.
 *
 * - extractTournamentResults - A function that extracts results for a specific competitor.
 * - TournamentResultData - The return type containing placement, speaker points, etc.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TournamentResultDataSchema = z.object({
  event: z.string().describe('The event name (e.g., "Lincoln-Douglas Debate", "Public Forum", "Policy Debate", etc.)'),
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
  ]).describe('The placement achieved'),
  placementDetail: z.string().optional().describe('Additional placement details (e.g., "1st Place", "3rd Speaker", "7th Place")'),
  preliminaryRecord: z.string().optional().describe('Preliminary record (e.g., "4-2", "3-3")'),
  speakerPoints: z.number().optional().describe('Total speaker points earned'),
  speakerRank: z.number().optional().describe('Speaker rank/placement'),
  totalCompetitors: z.number().optional().describe('Total number of competitors in the event'),
  breakingCompetitors: z.number().optional().describe('Number of competitors who broke to elimination rounds'),
  partnerName: z.string().optional().describe('Partner name for team events'),
  notes: z.string().optional().describe('Any additional notes about the performance'),
});

export type TournamentResultData = z.infer<typeof TournamentResultDataSchema>;

const ExtractResultsOutputSchema = z.object({
  results: z.array(TournamentResultDataSchema).describe('Array of results for all events the competitor participated in'),
  competitorName: z.string().optional().describe('The competitor name found on Tabroom'),
  success: z.boolean().describe('Whether results were successfully found'),
  message: z.string().optional().describe('Error message if results were not found'),
});

export type ExtractResultsOutput = z.infer<typeof ExtractResultsOutputSchema>;

async function getPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error("Error fetching page content:", error);
    throw new Error("Could not retrieve content from the provided URL.");
  }
}

const getWebpageContentTool = ai.defineTool(
  {
    name: 'getWebpageContent',
    description: 'Retrieves the full HTML content of a given webpage URL.',
    inputSchema: z.object({ url: z.string().url() }),
    outputSchema: z.string(),
  },
  async ({ url }) => await getPageContent(url)
);

const prompt = ai.definePrompt({
  name: 'extractTournamentResultsPrompt',
  input: {
    schema: z.object({
      resultsUrl: z.string().url().describe('The Tabroom results page URL'),
      nsdaId: z.string().describe('The competitor NSDA ID to search for'),
      competitorName: z.string().optional().describe('The competitor name to help with matching'),
    })
  },
  output: {
    schema: ExtractResultsOutputSchema,
    format: 'json'
  },
  tools: [getWebpageContentTool],
  config: {
    temperature: 0.1,
  },
  prompt: `You are an expert at analyzing Tabroom.com tournament results pages to extract competitor performance data.

IMPORTANT: You MUST return a valid JSON object with all required fields. If you cannot find results, return success: false with an appropriate message.

Your task is to:
1. Fetch and analyze the HTML content from the provided Tabroom results URL
2. Search for the competitor using their NSDA ID and/or name
3. Extract ALL results for this competitor across all events they competed in
4. Return structured data for each event

## How to Find the Competitor:

On Tabroom results pages, competitors are typically listed with their:
- Name (e.g., "John Smith" or "Smith, John")
- School affiliation
- NSDA ID (often in parentheses or nearby)
- Partner name (for team events)

Search for the NSDA ID {{nsdaId}} in the page content. It may appear as:
- "{{nsdaId}}"
- "NSDA: {{nsdaId}}"
- In a data attribute or ID field

## Extracting Results:

For EACH event the competitor participated in, extract:

### 1. Event Name
- Look for event categories like "Lincoln-Douglas Debate", "Public Forum", "Policy Debate", "Congress", etc.
- Event names are usually in headers or section titles

### 2. Placement
Map the placement text to one of these values:
- "champion" - 1st place, Champion, Winner
- "finalist" - 2nd place, Finalist, Runner-up
- "semifinalist" - Semifinalist, Semi-Finalist, made it to semifinals
- "quarterfinalist" - Quarterfinalist, Quarter-Finalist, made it to quarterfinals
- "octafinalist" - Octafinalist, made it to octafinals
- "double-octafinalist" - Double-octafinalist, made it to double-octafinals
- "speaker-award" - Received a speaker award (but not top speaker)
- "top-speaker" - Top Speaker, 1st Speaker, Best Speaker
- "preliminary-advancement" - Cleared prelims, advanced from preliminaries, broke to elims
- "participated" - Competed but did not break
- "other" - Any other placement type

### 3. Placement Detail (optional)
- Specific placement like "1st Place", "3rd Speaker", "7th Place"
- If they got "Semifinalist", you can add "3rd Place" or "4th Place" here if specified

### 4. Preliminary Record (optional)
- Win-loss record like "4-2", "3-3", "5-1"
- Usually shown in a "Record" or "Prelims" column

### 5. Speaker Points (optional)
- Total speaker points earned
- Usually shown in a "Speaks" or "Speaker Points" column

### 6. Speaker Rank (optional)
- Speaker rank/placement number
- Look for "Speaker Rank", "Spkr Rank", or similar

### 7. Total Competitors (optional)
- Count how many competitors are listed in the event
- This might be shown as "X entries" or you can count the rows

### 8. Breaking Competitors (optional)
- How many competitors broke to elimination rounds
- Look for text like "16 break" or count competitors in elim brackets

### 9. Partner Name (optional)
- For team events (PF, CX, Duo, etc.), the partner's name
- Usually listed as "Smith & Jones" or "with Jane Doe"

### 10. Notes (optional)
- Any other relevant information
- Special awards, achievements, notable opponents, etc.

## Important Notes:

- A competitor may have results in MULTIPLE events at the same tournament
- Return ALL results found, not just one
- If you cannot find any results for the given NSDA ID, set success to false
- Be flexible with name matching - names may be formatted differently
- Look for all possible variations of the data

## Example Output Structure:

{
  "results": [
    {
      "event": "Lincoln-Douglas Debate",
      "placement": "semifinalist",
      "placementDetail": "3rd Place",
      "preliminaryRecord": "4-2",
      "speakerPoints": 172.5,
      "speakerRank": 8,
      "totalCompetitors": 64,
      "breakingCompetitors": 16,
      "notes": "Lost in semifinals to eventual champion"
    },
    {
      "event": "Original Oratory",
      "placement": "finalist",
      "placementDetail": "2nd Place",
      "totalCompetitors": 32
    }
  ],
  "competitorName": "John Smith",
  "success": true
}

Now, fetch the results page and extract the data for NSDA ID {{nsdaId}}${'{'}{{competitorName}} ? ' (Name: {{competitorName}})' : ''}:`,
});

const extractTournamentResultsFlow = ai.defineFlow(
  {
    name: 'extractTournamentResultsFlow',
    inputSchema: z.object({
      resultsUrl: z.string().url(),
      nsdaId: z.string(),
      competitorName: z.string().optional(),
    }),
    outputSchema: ExtractResultsOutputSchema,
  },
  async (input) => {
    try {
      const result = await prompt(input);
      return result.output;
    } catch (error) {
      console.error('Error in extractTournamentResultsFlow:', error);
      return {
        results: [],
        success: false,
        message: `Failed to extract results: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
);

export async function extractTournamentResults(
  resultsUrl: string,
  nsdaId: string,
  competitorName?: string
): Promise<ExtractResultsOutput> {
  return extractTournamentResultsFlow({ resultsUrl, nsdaId, competitorName });
}
