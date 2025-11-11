
'use server';
/**
 * @fileOverview An AI flow for extracting tournament information from a webpage URL.
 * 
 * - extractTournamentInfo - A function that handles the tournament info extraction.
 * - ExtractTournamentInfoOutput - The return type for the extractTournamentInfo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractTournamentInfoOutputSchema = z.object({
  name: z.string().describe('The name of the tournament.'),
  date: z.string().describe('The date of the tournament, formatted as "MMMM d, yyyy".'),
  scheduleUrl: z.string().describe('The direct URL to the tournament schedule page or document. If not found, use the tournament webpage URL.'),
  registrationCloseDate: z.string().optional().describe('The date when registration closes, formatted as "MMMM d, yyyy". If not found, leave empty.'),
  isSwing: z.boolean().default(false).describe('Whether this is a swing tournament (co-hosted by multiple schools).'),
  schools: z.array(z.string()).optional().describe('For swing tournaments, the list of participating schools.'),
});

export type ExtractTournamentInfoOutput = z.infer<typeof ExtractTournamentInfoOutputSchema>;

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
  name: 'extractTournamentInfoPrompt',
  input: { schema: z.object({ url: z.string().url() }) },
  output: {
    schema: ExtractTournamentInfoOutputSchema,
    format: 'json'
  },
  tools: [getWebpageContentTool],
  config: {
    temperature: 0.1, // Make it more deterministic
  },
  prompt: `You are an expert at analyzing forensics tournament websites (like Tabroom.com or SpeechWire.com) to extract key information.

IMPORTANT: You MUST return a valid JSON object with all required fields. Do not return null or empty responses.

Your task is to analyze the HTML content of the provided tournament webpage URL and extract the following information:
1. The official name of the tournament.
2. The main date of the tournament. Format it as "MMMM d, yyyy" (e.g., "October 26, 2024"). If it's a multi-day tournament, use the start date.
3. The date registration closes. Look for terms like "Registration Due", "Registration closes", "Entries Due", or similar. On Tabroom.com, this is often found in the right-hand sidebar under a "Deadlines" section. Format it as "MMMM d, yyyy".
4. The direct URL to the tournament schedule. This is the most important piece of information. On Tabroom.com, this is often found in a right-hand menu under a section like "Info" or "Information". Look for a link with text like "Schedule", "Pairings", "Schematics", or "Docket". The correct URL will often be a direct link to a page within the site that contains the schedule itself, not a general information page.

5. CRITICAL - Determine if this is a SWING TOURNAMENT: A swing tournament is co-hosted by multiple schools at the same time and location. You MUST carefully check for these indicators:

   A. Tournament name contains "Swing" (case-insensitive)
      - Examples: "Big Cat Swing", "Wildcat Swing", "Tiger Swing"
      - If you see "Swing" in the name, it is ALWAYS a swing tournament
      - "Big Cat Swing" is hosted by Cy-Fair and Cypress Creek (Cy-Creek) High Schools

   B. Multiple school names in the tournament name separated by "/" or "-"
      - Examples: "Cy-Fair/Cy-Ridge Tournament", "Klein-Westfield Invitational"

   C. Look in the page content for:
      - "Host schools" or "Hosted by" section listing multiple schools
      - Tournament description mentioning co-hosting
      - Multiple school names mentioned together near "host" keywords

6. CRITICAL - Extract participating school names for swing tournaments:

   A. For tournaments with "Swing" in the name (like "Big Cat Swing"):
      - Look in the page content for "hosted by", "host schools", or similar
      - Search for school names near these keywords
      - Common patterns: "hosted by [School A] and [School B]"
      - Look in the tournament description, info section, or anywhere on the page

   B. For tournaments with schools in the name (like "Cy-Fair/Cy-Ridge"):
      - Extract school names directly from the tournament name
      - Split on "/" or "-" to get each school

   C. Normalize school names:
      - If the school name doesn't end with "High School", "HS", or "School", add "High School"
      - Examples: "Cy-Fair" → "Cy-Fair High School", "Klein Oak" → "Klein Oak High School"

   D. Common school name patterns to look for:
      - "Cy-Fair", "Cy-Creek" (also known as "Cypress Creek"), "Cy-Ridge", "Cy-Woods", "Cy-Lakes", "Cy-Springs"
      - "Klein", "Klein Oak", "Klein Collins", "Klein Forest", "Klein Cain"
      - Note: "Cypress Creek High School" and "Cy-Creek High School" are the SAME school
      - Any other school names mentioned as hosts

First, you MUST use the getWebpageContent tool to fetch the content of the URL: {{{url}}}

Then, carefully analyze the entire HTML content to find all the required information. Pay special attention to finding host school information anywhere on the page.

Examples of CORRECT swing tournament detection:

1. "Big Cat Swing 2025" tournament:
   - Tournament name contains "Swing" → isSwing: MUST be true
   - Page says "hosted by Cypress Creek High School and Cy-Fair High School"
   - CORRECT OUTPUT: isSwing: true, schools: ["Cypress Creek High School", "Cy-Fair High School"]

2. "Cy-Fair/Cy-Ridge Tournament":
   - Schools in tournament name separated by "/"
   - CORRECT OUTPUT: isSwing: true, schools: ["Cy-Fair High School", "Cy-Ridge High School"]

3. "Tiger Swing" with "Klein Oak and Klein Collins" on page:
   - Tournament name contains "Swing" → isSwing: MUST be true
   - Page mentions both schools
   - CORRECT OUTPUT: isSwing: true, schools: ["Klein Oak High School", "Klein Collins High School"]

4. "Klein Oak Invitational" (only one school):
   - No "Swing" in name, only one host school
   - CORRECT OUTPUT: isSwing: false, schools: undefined

CRITICAL RULES:
1. If tournament name contains "Swing" (case-insensitive), isSwing MUST be true - NO EXCEPTIONS
2. Search the ENTIRE page for "hosted by", "Cypress Creek", "Cy-Fair", "Cy-Creek", and other school names
3. "Cypress Creek" and "Cy-Creek" are the same school - use "Cypress Creek High School" as the normalized name

Provide the extracted information in the required format.
`,
});

const extractTournamentInfoFlow = ai.defineFlow(
  {
    name: 'extractTournamentInfoFlow',
    inputSchema: z.string(),
    outputSchema: ExtractTournamentInfoOutputSchema,
  },
  async (url) => {
    let response;
    let lastError;

    // Retry up to 3 times with exponential backoff for API overload errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await prompt({ url });
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        const isOverloadError = error?.message?.includes('overloaded') ||
                                error?.message?.includes('503') ||
                                error?.status === 503;

        if (isOverloadError && attempt < 3) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s
          console.warn(`AI API overloaded (attempt ${attempt}/3). Retrying in ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (attempt === 3) {
          throw new Error(`AI extraction failed after 3 attempts: ${error?.message || 'Unknown error'}`);
        } else {
          throw error; // Different error, don't retry
        }
      }
    }

    if (!response || !response.output) {
      console.error('AI extraction failed: No response or output');
      throw new Error("AI failed to extract tournament information. Please try again or add the tournament manually.");
    }

    // Validate that we got actual data
    if (!response.output.name || !response.output.date) {
      console.error('AI extraction returned incomplete data:', response.output);
      throw new Error("AI extraction incomplete. Could not find required tournament information (name or date).");
    }

    // Known swing tournaments lookup table (fallback for when AI fails)
    const knownSwingTournaments: Record<string, string[]> = {
      'big cat swing': ['Cypress Creek High School', 'Cy-Fair High School'],
      'wildcat swing': ['Klein Oak High School', 'Klein Collins High School'],
      'tfa chaser': ['Klein Oak High School', 'Klein Cain High School'],
      'klein oak tfa chaser': ['Klein Oak High School', 'Klein Cain High School'],
      // Add more known swing tournaments as needed
    };

    const output = response.output;
    const nameLower = output.name.toLowerCase();

    // Log what we received from AI
    console.log('=== AI EXTRACTION DEBUG ===');
    console.log('Tournament name:', output.name);
    console.log('AI detected isSwing:', output.isSwing);
    console.log('AI detected schools:', output.schools);
    console.log('=========================');

    // CRITICAL: Force swing detection if "swing" is in the name
    if (nameLower.includes('swing')) {
      if (!output.isSwing) {
        console.warn(`⚠️ FORCING isSwing=true because name contains "swing"`);
        output.isSwing = true;
      }

      // If swing tournament doesn't have schools, use fallbacks
      if (!output.schools || output.schools.length === 0) {
        console.warn(`⚠️ Swing tournament has no schools. Checking fallbacks...`);

        // First, check known swing tournaments lookup table
        for (const [knownName, schools] of Object.entries(knownSwingTournaments)) {
          if (nameLower.includes(knownName)) {
            console.log(`✓ Matched known swing: "${knownName}" → ${schools.join(', ')}`);
            output.schools = schools;
            break;
          }
        }

        // If still no schools, try pattern matching from name and URL
        if (!output.schools || output.schools.length === 0) {
          console.log('Trying pattern matching...');
          const foundSchools: string[] = [];
          const searchText = `${output.name} ${url}`.toLowerCase();

          // Check for school patterns
          if (searchText.match(/cy-?fair|cyfair/i)) foundSchools.push('Cy-Fair High School');
          if (searchText.match(/cy-?creek|cycreek|cypress\s+creek/i)) foundSchools.push('Cypress Creek High School');
          if (searchText.match(/cy-?ridge|cyridge/i)) foundSchools.push('Cy-Ridge High School');
          if (searchText.match(/klein\s+oak|kleinoak/i)) foundSchools.push('Klein Oak High School');
          if (searchText.match(/klein\s+cain|kleincain/i)) foundSchools.push('Klein Cain High School');
          if (searchText.match(/klein\s+collins|kleincollins/i)) foundSchools.push('Klein Collins High School');
          if (searchText.match(/klein\s+forest|kleinforest/i)) foundSchools.push('Klein Forest High School');

          if (foundSchools.length > 0) {
            console.log(`✓ Pattern match found: ${foundSchools.join(', ')}`);
            output.schools = foundSchools;
          } else {
            console.error(`❌ Could not determine schools for swing tournament: "${output.name}"`);
          }
        }
      }
    }

    // Ensure scheduleUrl has at least the webpage URL if nothing else was found
    if (!output.scheduleUrl) {
      console.warn('No schedule URL found, using webpage URL as fallback');
      output.scheduleUrl = url;
    }

    console.log('=== FINAL OUTPUT ===');
    console.log('isSwing:', output.isSwing);
    console.log('schools:', output.schools);
    console.log('scheduleUrl:', output.scheduleUrl);
    console.log('===================');

    return output;
  }
);


export async function extractTournamentInfo(url: string): Promise<ExtractTournamentInfoOutput> {
    return extractTournamentInfoFlow(url);
}
