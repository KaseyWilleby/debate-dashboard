'use server';
/**
 * @fileOverview Flow for discovering tournaments from Tabroom chapter results page
 *
 * This flow logs into Tabroom and scrapes the chapter results page to find
 * all tournaments that have results, even if they weren't pre-registered in the system.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DiscoverTournamentsInputSchema = z.object({
  tabroomEmail: z.string().email().describe("Coach's Tabroom email"),
  tabroomPassword: z.string().describe("Coach's Tabroom password"),
  tabroomChapterId: z.string().describe("Tabroom chapter ID (e.g., 26837)"),
});
export type DiscoverTournamentsInput = z.infer<typeof DiscoverTournamentsInputSchema>;

const TournamentSchema = z.object({
  name: z.string().describe("Tournament name"),
  url: z.string().url().describe("Tournament URL on Tabroom"),
  date: z.string().describe("Tournament date YYYY-MM-DD"),
  location: z.string().optional().describe("Tournament location"),
  tournamentId: z.string().describe("Tabroom tournament ID"),
});

const DiscoverTournamentsOutputSchema = z.object({
  tournaments: z.array(TournamentSchema).describe("Array of discovered tournaments"),
  success: z.boolean().describe("Whether the discovery was successful"),
  error: z.string().optional().describe("Error message if failed"),
});
export type DiscoverTournamentsOutput = z.infer<typeof DiscoverTournamentsOutputSchema>;

/**
 * Parse the chapter results page to extract tournaments
 */
function parseChapterTournaments(html: string): z.infer<typeof TournamentSchema>[] {
  const tournaments: z.infer<typeof TournamentSchema>[] = [];

  // Tabroom chapter results page format:
  // <tr>
  //   <td>Feb 21</td>  (date without year)
  //   <td><a href="/index/tourn/results/index.mhtml?tourn_id=37558">Tournament Name</a></td>
  // </tr>

  // Pattern to match table rows with tournament data
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = html.matchAll(rowPattern);

  // Determine the current season's years
  // If current month is Aug-Dec, season is currentYear to currentYear+1
  // If current month is Jan-Jul, season is currentYear-1 to currentYear
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let seasonStartYear: number;
  let seasonEndYear: number;

  if (currentMonth >= 7) { // Aug-Dec (months 7-11)
    seasonStartYear = currentYear;
    seasonEndYear = currentYear + 1;
  } else { // Jan-Jul (months 0-6)
    seasonStartYear = currentYear - 1;
    seasonEndYear = currentYear;
  }

  console.log(`Current season: ${seasonStartYear}-${seasonEndYear}`);

  for (const rowMatch of rows) {
    const rowHtml = rowMatch[1];

    // Look for tournament link in this row
    const tournamentLinkPattern = /<a[^>]*href\s*=\s*"\/index\/tourn\/results\/index\.mhtml\?tourn_id=(\d+)"[^>]*>([\s\S]*?)<\/a>/i;
    const linkMatch = rowHtml.match(tournamentLinkPattern);

    if (!linkMatch) continue;

    const tournamentId = linkMatch[1];
    const name = linkMatch[2].replace(/\s+/g, ' ').trim();
    const url = `https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=${tournamentId}`;

    // Look BACKWARDS from the link for the date (dates come before links in the row)
    // Need to handle whitespace/newlines around dates
    const beforeLink = rowHtml.substring(0, linkMatch.index);
    const datePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s\n\r]+(\d{1,2})(?:-\d{1,2})?/i;
    const dateMatches = beforeLink.matchAll(new RegExp(datePattern, 'gi'));
    const dateMatchArray = Array.from(dateMatches);
    const dateMatch = dateMatchArray[dateMatchArray.length - 1]; // Get the last/closest date to the link

    if (!dateMatch) {
      console.log(`Could not find date for tournament: ${name}`);
      continue;
    }

    const monthStr = dateMatch[1];
    const day = parseInt(dateMatch[2]);

    // Convert month to number
    const monthMap: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
    };

    const month = monthMap[monthStr.toLowerCase()];
    if (month === undefined) {
      console.log(`Could not parse month for tournament: ${name}`);
      continue;
    }

    // Determine year based on month
    // Aug-Dec are in the start year, Jan-Jul are in the end year
    const year = month >= 7 ? seasonStartYear : seasonEndYear;

    // Format as YYYY-MM-DD
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log(`Found tournament: ${name} on ${date}`);

    tournaments.push({
      name,
      url,
      date,
      tournamentId,
      location: undefined,
    });
  }

  return tournaments;
}

export const discoverTabroomTournaments = ai.defineFlow(
  {
    name: 'discoverTabroomTournaments',
    inputSchema: DiscoverTournamentsInputSchema,
    outputSchema: DiscoverTournamentsOutputSchema,
  },
  async (input: DiscoverTournamentsInput): Promise<DiscoverTournamentsOutput> => {
    console.log('=== STARTING TOURNAMENT DISCOVERY ===');
    console.log(`Chapter ID: ${input.tabroomChapterId}`);

    try {
      // Step 1: Login to Tabroom
      console.log('Attempting to login to Tabroom...');
      console.log(`Email: ${input.tabroomEmail}`);

      const loginUrl = 'https://www.tabroom.com/user/login/login_save.mhtml';
      console.log('Sending login request to Tabroom...');

      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: new URLSearchParams({
          username: input.tabroomEmail,
          password: input.tabroomPassword,
        }),
        redirect: 'manual',
      });

      console.log(`Login response status: ${loginResponse.status}`);

      // Extract cookies from response
      const setCookieHeaders = loginResponse.headers.getSetCookie?.() || [];
      console.log(`Got ${setCookieHeaders.length} cookies via getSetCookie()`);

      if (setCookieHeaders.length === 0) {
        return {
          tournaments: [],
          success: false,
          error: 'Login failed - no session cookies received',
        };
      }

      // Build cookie string for subsequent requests
      const sessionCookies = setCookieHeaders
        .map(cookie => cookie.split(';')[0])
        .join('; ');

      console.log(`Successfully logged in, cookie string: ${sessionCookies.substring(0, 100)}...`);

      // Step 2: Fetch chapter results page
      const chapterUrl = `https://www.tabroom.com/user/results/index.mhtml?chapter_id=${input.tabroomChapterId}`;
      console.log(`Fetching chapter results for chapter_id=${input.tabroomChapterId}...`);

      const chapterResponse = await fetch(chapterUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': sessionCookies,
        },
      });

      if (!chapterResponse.ok) {
        return {
          tournaments: [],
          success: false,
          error: `Failed to fetch chapter results page: ${chapterResponse.status}`,
        };
      }

      const chapterHtml = await chapterResponse.text();
      console.log(`Chapter results page length: ${chapterHtml.length} chars`);

      // Step 3: Parse tournaments from the page
      const tournaments = parseChapterTournaments(chapterHtml);
      console.log(`Discovered ${tournaments.length} tournaments`);

      // Sort by date descending (newest first)
      tournaments.sort((a, b) => b.date.localeCompare(a.date));

      return {
        tournaments,
        success: true,
      };

    } catch (error) {
      console.error('Error discovering tournaments:', error);
      return {
        tournaments: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
);
