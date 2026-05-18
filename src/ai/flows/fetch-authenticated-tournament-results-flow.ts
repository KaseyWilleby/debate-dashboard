'use server';
/**
 * @fileOverview Flow for fetching tournament results from Tabroom.com using authenticated access
 *
 * This flow logs into Tabroom using coach credentials and fetches all school results.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { PlacementType } from '@/lib/types';

/**
 * Normalize event names to standard abbreviations
 * UIL uses different names than TFA/NSDA, so we need to standardize
 */
function normalizeEventName(eventName: string): string {
  const normalized = eventName.trim().toUpperCase();

  // Tabroom abbreviation mappings for UIL events
  if (normalized === 'INFO') return 'USX'; // Informative Extemp → US Extemp
  if (normalized === 'PERS') return 'IX'; // Persuasive Extemp → International Extemp

  // UIL full name mappings
  if (/informative\s+extemp/i.test(normalized)) return 'USX'; // US Extemp
  if (/persuasive\s+extemp/i.test(normalized)) return 'IX'; // International Extemp

  // Common variations
  if (/^us\s+extemp/i.test(normalized)) return 'USX';
  if (/^foreign\s+extemp/i.test(normalized)) return 'FX';
  if (/^int(ernational)?\s+extemp/i.test(normalized)) return 'IX';
  if (/^extemp/i.test(normalized)) return 'USX'; // Default extemp to US

  // Prose/Poetry - preserve original casing for these
  const original = eventName.trim();
  if (/^prose\s+interp/i.test(original)) return 'Prose';
  if (/^poetry\s+interp/i.test(original)) return 'Poetry';
  if (/^prose$/i.test(original)) return 'Prose';
  if (/^poetry$/i.test(original)) return 'Poetry';

  // Return original if no mapping found (preserve original casing)
  return eventName.trim();
}

const FetchAuthenticatedResultsInputSchema = z.object({
  tournamentUrl: z.string().url().describe("The Tabroom tournament URL"),
  tabroomEmail: z.string().email().describe("Coach's Tabroom email"),
  tabroomPassword: z.string().describe("Coach's Tabroom password"),
  tabroomChapterId: z.string().describe("Tabroom chapter ID (e.g., 26837)"),
  schoolName: z.string().describe("School name (e.g., 'Cy-Woods')"),
  tournamentName: z.string().describe("Tournament name"),
  tournamentDate: z.string().describe("Tournament date YYYY-MM-DD"),
});
export type FetchAuthenticatedResultsInput = z.infer<typeof FetchAuthenticatedResultsInputSchema>;

const RoundBallotSchema = z.object({
  roundName: z.string().describe("Round name like 'Round 1' or 'Quarterfinals'"),
  opponent: z.string().optional().nullable().describe("Opponent name/school"),
  result: z.enum(['win', 'loss', 'bye']).describe("Round result"),
  judge: z.string().optional().nullable().describe("Judge name"),
  judgeCount: z.number().optional().nullable().describe("Number of judges on panel"),
  ballotsWon: z.number().optional().nullable().describe("Number of ballots won out of panel"),
  speakerPoints: z.number().optional().nullable().describe("Speaker points in this round (sum for team events)"),
  individualSpeakerPoints: z.array(z.number()).optional().nullable().describe("Individual speaker points for each team member"),
  rfd: z.string().optional().nullable().describe("Reason for decision"),
  ranks: z.string().optional().nullable().describe("For congress/speech events"),
});

const StudentResultSchema = z.object({
  studentName: z.string().describe("Full name of the student"),
  nsdaId: z.string().optional().nullable().describe("NSDA ID number if visible"),
  event: z.string().describe("Event name"),
  placement: z.enum([
    'champion',
    'finalist',
    'semifinalist',
    'quarterfinalist',
    'octafinalist',
    'double-octafinalist',
    'triple-octafinalist',
    'speaker-award',
    'top-speaker',
    'preliminary-advancement',
    'participated',
    'other'
  ]).describe("Placement type"),
  placementDetail: z.string().optional().nullable().describe("Specific placement"),
  partnerName: z.string().optional().nullable().describe("Partner name for team events"),
  preliminaryRecord: z.string().optional().nullable().describe("Preliminary record like '4-2'"),
  eliminationRecord: z.string().optional().nullable().describe("Elimination rounds record like '0-3' (ballots won-total)"),
  preliminaryRounds: z.array(RoundBallotSchema).optional().nullable().describe("Individual prelim round ballots"),
  eliminationRounds: z.array(RoundBallotSchema).optional().nullable().describe("Individual elim round ballots"),
  speakerPoints: z.number().optional().nullable().describe("Total speaker points"),
  averageSpeakerPoints: z.number().optional().nullable().describe("Average speaker points per round"),
  speakerRank: z.number().optional().nullable().describe("Speaker rank"),
  totalCompetitors: z.number().optional().nullable().describe("Total competitors"),
  breakingCompetitors: z.number().optional().nullable().describe("Competitors who broke"),
  notes: z.string().optional().nullable().describe("Additional notes"),
});

const FetchAuthenticatedResultsOutputSchema = z.object({
  results: z.array(StudentResultSchema).describe("Array of student results"),
  success: z.boolean().describe("Whether the fetch was successful"),
  error: z.string().optional().describe("Error message if failed"),
});
export type FetchAuthenticatedResultsOutput = z.infer<typeof FetchAuthenticatedResultsOutputSchema>;

/**
 * Custom parser for Tabroom CSV/HTML data - no AI needed!
 */
function parseTabroomData(data: string, schoolName: string): z.infer<typeof StudentResultSchema>[] {
  const results: z.infer<typeof StudentResultSchema>[] = [];
  console.log(`Filtering results for school: "${schoolName}"`);

  // Check if it's the dashboard results table (has id="XXXXX_entries")
  const isDashboardTable = data.includes('_entries') && data.includes('<table');

  if (isDashboardTable) {
    console.log('Detected dashboard results table format, parsing...');

    // Dashboard table format:
    // Columns: Code | Name/vs | Rnd | Start | Room | S | Judging | Result | Fdbk
    // Each row represents ONE ROUND for a student
    // Hidden rows with id="{ballot_id}_rfd" contain RFD/ballot text

    // First, extract all RFD data (ballot feedback)
    const rfdData: Record<string, string> = {};
    const rfdMatches = data.matchAll(/<tr\s+id="(\d+)_rfd"[^>]*>([\s\S]*?)<\/tr>/gi);

    for (const rfdMatch of rfdMatches) {
      const ballotId = rfdMatch[1];
      const rfdHtml = rfdMatch[2];
      // Extract RFD text from paragraphs
      const rfdText = rfdHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      rfdData[ballotId] = rfdText;
    }

    console.log(`Found ${Object.keys(rfdData).length} ballots with RFD data`);

    // Now parse the main table rows
    const rowMatches = data.matchAll(/<tr\s+class="[^"]*timerows[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);

    // Group rounds by student+event
    interface RoundData {
      studentName: string;
      event: string;
      dropped?: boolean; // If student dropped from tournament
      rounds: Array<{
        roundName: string;
        opponent?: string;
        result: 'win' | 'loss' | 'bye';
        judge?: string;
        speakerPoints?: number;
        rfd?: string;
        ranks?: string;
      }>;
    }

    const studentEvents: Record<string, RoundData> = {};

    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[1];

      // Extract all cells
      const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];

      if (cells.length >= 8) {
        // Column 0: Has student name in title attribute (e.g., title="Ainsley Gailey")
        // and event code in the cell content (e.g., "LD: AG" or "Informative Extemp: Code")
        const codeCellHtml = cells[0][1];
        const titleMatch = rowHtml.match(/title="([^"]+)"/);
        const studentName = titleMatch ? titleMatch[1].trim() : null;

        // Extract event code from the cell
        // Format can be:
        // - Just the code: "INFO" or "LD" or "PROSE"
        // - Code with colon: "LD: AG" or "Informative Extemp: Code"
        const codeText = codeCellHtml.replace(/<[^>]*>/g, '').trim();

        let eventName = 'Unknown Event';

        // Check if there's a colon (some tournaments use "Event: Code" format)
        if (codeText.includes(':')) {
          // Extract everything before the colon
          eventName = codeText.split(':')[0].trim();
        } else {
          // No colon, just use the first word/code
          eventName = codeText.split(/\s+/)[0].trim();
        }

        const event = normalizeEventName(eventName);

        // Column 1: Opponent name (e.g., "vs Greenhill OG") - we don't need this
        // Just skip it

        // Column 2: Round (e.g., "2A")
        const roundCell = cells[2][1].replace(/<[^>]*>/g, '').trim();

        // Column 6: Judge(s)
        const judgeCellHtml = cells[6][1];
        const judgeCell = judgeCellHtml.replace(/<[^>]*>/g, '').trim();

        // Count judges for panel rounds (count <div> elements with judge names)
        const judgeCount = (judgeCellHtml.match(/<div[^>]*class="[^"]*smallish flexrow grow[^"]*"/g) || []).length || 1;

        // Column 7: Result (W/L for debate, ranking for speech, or Drop)
        const resultCellHtml = cells[7][1];
        const resultText = resultCellHtml.replace(/<[^>]*>/g, '').trim();

        // Check for Drop first (this indicates student withdrew from tournament)
        const isDrop = /drop|withdraw|wd/i.test(resultText);

        // Check for W/L (debate events)
        let result: 'win' | 'loss' | 'bye' = 'bye';
        if (resultCellHtml.includes('greentext') || resultCellHtml.match(/>W</)) {
          result = 'win';
        } else if (resultCellHtml.includes('redtext') || resultCellHtml.match(/>L</)) {
          result = 'loss';
        }

        // Extract speaker points from result column (for debate events)
        // Speaker points are embedded in the result cell in spans with class "quarter grow rightalign"
        // Example: <span class="quarter grow rightalign padrightless">28.5</span>
        let speakerPoints: number | undefined = undefined;
        let individualSpeakerPoints: number[] | undefined = undefined;
        const speakerPointMatches = resultCellHtml.matchAll(/<span[^>]*class="[^"]*quarter[^"]*rightalign[^"]*"[^>]*>\s*([\d.]+)\s*<\/span>/g);
        const points = Array.from(speakerPointMatches).map(m => parseFloat(m[1])).filter(p => !isNaN(p));
        if (points.length > 0) {
          // Store individual points for team events
          individualSpeakerPoints = points;
          // Sum for average calculation
          speakerPoints = points.reduce((sum, p) => sum + p, 0);
        }

        // For speech events, ranking might be in the result column (as plain number)
        const rankingFromResult = parseFloat(resultText) || undefined;

        // Column 8: Feedback button (extract ballot ID)
        const feedbackCell = cells[8][1];
        const ballotIdMatch = feedbackCell.match(/showRFD\((\d+)\)/);
        const ballotId = ballotIdMatch ? ballotIdMatch[1] : null;
        const rfd = ballotId && rfdData[ballotId] ? rfdData[ballotId] : undefined;

        if (studentName) {
          const key = `${studentName}|${event}`;

          if (!studentEvents[key]) {
            studentEvents[key] = {
              studentName,
              event,
              dropped: false,
              rounds: [],
            };
          }

          // Mark as dropped if any round shows a drop
          if (isDrop) {
            studentEvents[key].dropped = true;
          }

          studentEvents[key].rounds.push({
            roundName: roundCell || 'Unknown Round',
            result,
            judge: judgeCell || undefined,
            judgeCount: judgeCount > 1 ? judgeCount : undefined,
            speakerPoints: speakerPoints,
            individualSpeakerPoints: individualSpeakerPoints,
            ranks: rankingFromResult !== undefined ? String(rankingFromResult) : undefined,
            rfd,
          });
        }
      }
    }

    console.log(`Parsed ${Object.keys(studentEvents).length} student+event combinations`);

    // Convert to results array - one entry per student+event with aggregated data
    for (const data of Object.values(studentEvents)) {
      // Separate prelim and elim rounds (check elims first to avoid double-counting)
      const elimRounds = data.rounds.filter(r => /(trips|octas|quarters|semis|finals)/i.test(r.roundName));
      // Prelims are everything that's NOT an elim round
      const prelimRounds = data.rounds.filter(r => !/(trips|octas|quarters|semis|finals)/i.test(r.roundName));

      // Calculate W-L record for PRELIM rounds only
      const prelimWins = prelimRounds.filter(r => r.result === 'win').length;
      const prelimLosses = prelimRounds.filter(r => r.result === 'loss').length;
      const wlRecord = prelimWins + prelimLosses > 0 ? `${prelimWins}-${prelimLosses}` : null;

      // Calculate average speaker points
      const pointsRounds = data.rounds.filter(r => r.speakerPoints !== undefined);
      const avgPoints = pointsRounds.length > 0
        ? pointsRounds.reduce((sum, r) => sum + (r.speakerPoints || 0), 0) / pointsRounds.length
        : undefined;

      // Determine elimination record and add ballot counts
      let elimRecord = null;
      const elimRoundsWithBallots = elimRounds.map(round => {
        let ballotsWon: number | undefined = undefined;

        // For panel rounds, calculate ballots won
        if (round.judgeCount && round.judgeCount > 1) {
          if (round.result === 'loss') {
            ballotsWon = 0; // Lost all ballots
          } else if (round.result === 'win') {
            // Won majority (we don't have exact data, so assume minimum to win)
            ballotsWon = Math.ceil(round.judgeCount / 2);
          }
        } else if (round.judgeCount === 1) {
          // Single judge: 1-0 or 0-1
          ballotsWon = round.result === 'win' ? 1 : 0;
        }

        return {
          ...round,
          ballotsWon,
        };
      });

      if (elimRounds.length > 0) {
        const lastElimRound = elimRounds[elimRounds.length - 1];

        // For panel rounds, show ballot count (e.g., "0-3" means 0 ballots won out of 3 judges)
        if (lastElimRound.judgeCount && lastElimRound.judgeCount > 1) {
          if (lastElimRound.result === 'loss') {
            // Lost all ballots
            elimRecord = `0-${lastElimRound.judgeCount}`;
          } else if (lastElimRound.result === 'win') {
            // Won majority of ballots (assume minimum to win)
            const ballotsWon = Math.ceil(lastElimRound.judgeCount / 2);
            elimRecord = `${ballotsWon}-${lastElimRound.judgeCount - ballotsWon}`;
          }
        } else {
          // Single judge or no panel info - show round wins/losses
          const elimWins = elimRounds.filter(r => r.result === 'win').length;
          const elimLosses = elimRounds.filter(r => r.result === 'loss').length;
          elimRecord = `${elimWins}-${elimLosses}`;
        }
      }

      results.push({
        studentName: data.studentName,
        event: data.event,
        placement: data.dropped ? 'dropped' : 'participated', // Will be updated from final results if available
        placementDetail: data.dropped ? 'Dropped' : null,
        preliminaryRecord: data.dropped ? null : (wlRecord || `${data.rounds.length} rounds`),
        eliminationRecord: elimRecord,
        preliminaryRounds: prelimRounds.length > 0 ? prelimRounds : undefined,
        eliminationRounds: elimRoundsWithBallots.length > 0 ? elimRoundsWithBallots : undefined,
        partnerName: null,
        nsdaId: null,
        speakerPoints: avgPoints ? Math.round(avgPoints * 100) / 100 : null,
        averageSpeakerPoints: avgPoints ? Math.round(avgPoints * 100) / 100 : null,
        speakerRank: null,
        totalCompetitors: null,
        breakingCompetitors: null,
        notes: null,
      });
    }

    return results;
  }

  // Check if it's CSV data - look for CSV-specific patterns
  const isCsv = data.startsWith('CSV EXPORT DATA:') ||
                (data.includes(',') &&
                 !data.includes('<!DOCTYPE') &&
                 !data.includes('<html') &&
                 data.split('\n').some(line => line.split(',').length > 3));

  if (isCsv) {
    console.log('Detected CSV format, parsing...');
    const lines = data.replace('CSV EXPORT DATA:\n', '').split('\n').filter(l => l.trim());

    if (lines.length === 0) return results;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    console.log('CSV Headers:', headers);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      // Extract student name
      const studentName = row['student'] || row['name'] || row['entry'] || row['competitor'] || '';
      if (!studentName) continue;

      // Extract event
      const event = normalizeEventName(row['event'] || row['category'] || '');
      if (!event) continue;

      // Extract prelim record
      const prelimRecord = row['record'] || row['prelim record'] || row['prelims'] || row['w-l'] || '';

      // Extract placement/elims
      const place = row['place'] || row['placement'] || row['result'] || '';
      const elims = row['elims'] || row['elimination'] || row['rounds'] || '';

      // Determine placement type
      let placement: PlacementType = 'participated';
      let eliminationRecord = elims;

      // Check for drop first
      if (place.match(/drop|withdraw|wd/i) || prelimRecord.match(/drop/i)) {
        placement = 'dropped';
      } else if (place.match(/1st|first|champion/i)) placement = 'champion';
      else if (place.match(/2nd|second|finalist/i) || elims.match(/final/i)) placement = 'finalist';
      else if (place.match(/semi|3rd|4th/i) || elims.match(/semi/i)) placement = 'semifinalist';
      else if (place.match(/quarter|5th|6th|7th|8th/i) || elims.match(/quarter|qtr/i)) placement = 'quarterfinalist';
      else if (place.match(/octo|9th|10th|11th|12th|13th|14th|15th|16th/i) || elims.match(/octo|oct/i)) placement = 'octafinalist';
      else if (place.match(/double|dbl/i) || elims.match(/double|dbl/i)) placement = 'double-octafinalist';
      else if (place.match(/trip|triple|partial/i) || elims.match(/trip|triple/i)) placement = 'triple-octafinalist';
      else if (place.match(/speaker/i)) placement = place.match(/1st speaker|top speaker/i) ? 'top-speaker' : 'speaker-award';
      else if (elims || place.match(/broke/i)) placement = 'preliminary-advancement';

      results.push({
        studentName,
        event,
        placement,
        placementDetail: placement === 'dropped' ? 'Dropped' : (place || null),
        preliminaryRecord: placement === 'dropped' ? null : (prelimRecord || null),
        eliminationRecord: eliminationRecord || null,
        partnerName: row['partner'] || null,
        nsdaId: row['nsda id'] || row['nsdaid'] || null,
        speakerPoints: null,
        speakerRank: null,
        totalCompetitors: null,
        breakingCompetitors: null,
        notes: null,
      });
    }
  } else {
    // Parse HTML - look for tables with student results
    console.log('Detected HTML format, parsing tables...');

    // Extract "Prelims Table" sections (match only at line boundaries to avoid matching === in JavaScript)
    const prelimsMatches = data.matchAll(/===\s*PRELIMS TABLE\s*===[\s\S]*?(?=\n===|\s*$)/gi);
    for (const match of prelimsMatches) {
      const section = match[0];

      // Extract event name from <h5 class="nospace"> tags (event name is in the RIGHT-ALIGNED h5)
      // Pattern: <span class="half"><h5>Prelims Table</h5></span> <span class="half rightalign"><h5>EVENT NAME</h5></span>
      const h5Matches = [...section.matchAll(/<h5[^>]*class="nospace"[^>]*>([^<]+)<\/h5>/gi)];
      const event = normalizeEventName(h5Matches.length >= 2 ? h5Matches[1][1].trim() : 'Unknown Event');

      console.log(`Parsing Prelims Table for event: ${event}`);

      // Look for table rows - prelims have complex structure with title attributes
      const rowMatches = section.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*data-text="([^"]+)"[^>]*>[\s\S]*?title="([^"]+)"[^>]*>[\s\S]*?<\/tr>/gi);
      for (const rowMatch of rowMatches) {
        const entryCode = rowMatch[1]; // e.g., "Acton-Boxborough NK"
        const studentName = rowMatch[2]; // e.g., "Neel Kannambadi"

        if (studentName && !studentName.match(/^(entry|rank|name)/i) && studentName.length > 1) {
          // Count W/L in this row
          const rowText = rowMatch[0];
          const wins = (rowText.match(/semibold">W</gi) || []).length;
          const losses = (rowText.match(/semibold">L</gi) || []).length;
          const record = wins + losses > 0 ? `${wins}-${losses}` : null;

          console.log(`  Found: ${studentName} (${record}) in ${event}`);

          results.push({
            studentName,
            event,
            placement: 'participated',
            placementDetail: null,
            preliminaryRecord: record,
            eliminationRecord: null,
            partnerName: null,
            nsdaId: null,
            speakerPoints: null,
            speakerRank: null,
            totalCompetitors: null,
            breakingCompetitors: null,
            notes: null,
          });
        }
      }
    }

    // Extract "Final Places" sections (match only at line boundaries to avoid matching === in JavaScript)
    const finalMatches = data.matchAll(/===\s*FINAL PLACES\s*===[\s\S]*?(?=\n===|\s*$)/gi);
    for (const match of finalMatches) {
      const section = match[0];

      // Extract event name from <h5 class="nospace"> tags (event name is in the RIGHT-ALIGNED h5)
      // Pattern: <span class="half"><h5>Final Places</h5></span> <span class="half rightalign"><h5>EVENT NAME</h5></span>
      const h5Matches = [...section.matchAll(/<h5[^>]*class="nospace"[^>]*>([^<]+)<\/h5>/gi)];
      const event = normalizeEventName(h5Matches.length >= 2 ? h5Matches[1][1].trim() : 'Unknown Event');

      console.log(`Parsing Final Places for event: ${event}`);
      console.log(`  Section length: ${section.length} chars`);
      console.log(`  Section preview: ${section.substring(0, 200)}...`);
      console.log(`  Searching for <tr id= tags...`);

      // Find all table rows
      const rowMatches = [...section.matchAll(/<tr[^>]*id="[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)];
      console.log(`  Found ${rowMatches.length} table rows with IDs`);

      for (const rowMatch of rowMatches) {
        const rowHtml = rowMatch[0];

        // Extract cells - handle nested tags
        const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        console.log(`    Row has ${tdMatches.length} cells`);

        if (tdMatches.length >= 3) {
          const place = tdMatches[0][1].replace(/<[^>]*>/g, '').trim();
          const studentName = tdMatches[1][1].replace(/<[^>]*>/g, '').trim();
          const school = tdMatches[2][1].replace(/<[^>]*>/g, '').trim();
          console.log(`    Extracted: place="${place}", name="${studentName}", school="${school}"`);

          // Skip header rows and filter by school
          if (studentName && !studentName.match(/^(place|entry|rank|name)/i) && studentName.length > 1 && school === schoolName) {
            let placement: PlacementType = 'participated';
            if (place.match(/^1st|^1$/i)) placement = 'champion';
            else if (place.match(/^2nd|^2$/i)) placement = 'finalist';
            else if (place.match(/^(3rd|4th|3|4)$/i)) placement = 'semifinalist';
            else if (place.match(/^([5-8]|5th|6th|7th|8th)$/i)) placement = 'quarterfinalist';
            else if (place.match(/^(9|1[0-6]|9th|10th|11th|12th|13th|14th|15th|16th)$/i)) placement = 'octafinalist';
            else if (place.match(/^(1[7-9]|2\d|3[0-2])$/i)) placement = 'double-octafinalist';
            else if (place.match(/^(3[3-9]|[4-6]\d)$/i)) placement = 'triple-octafinalist';

            console.log(`  Found: ${studentName} - ${place} in ${event}`);

            results.push({
              studentName,
              event,
              placement,
              placementDetail: place,
              preliminaryRecord: null,
              eliminationRecord: null,
              partnerName: null,
              nsdaId: null,
              speakerPoints: null,
              speakerRank: null,
              totalCompetitors: null,
              breakingCompetitors: null,
              notes: null,
            });
          }
        }
      }
    }
  }

  console.log(`Custom parser extracted ${results.length} results`);
  return results;
}

/**
 * Login to Tabroom and get session cookies
 */
async function loginToTabroom(email: string, password: string): Promise<string | null> {
  try {
    // Tabroom login endpoint
    const loginUrl = 'https://www.tabroom.com/user/login/login_save.mhtml';

    // Create form data for login
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    console.log('Sending login request to Tabroom...');

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      body: formData.toString(),
      redirect: 'manual', // Don't follow redirects - we want the initial cookies
    });

    console.log(`Login response status: ${response.status}`);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    // Try multiple methods to get cookies
    let cookieString = '';

    // Method 1: getSetCookie() - newer API
    try {
      const setCookieHeaders = response.headers.getSetCookie?.();
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        cookieString = setCookieHeaders
          .map(cookie => cookie.split(';')[0])
          .join('; ');
        console.log(`Got ${setCookieHeaders.length} cookies via getSetCookie()`);
      }
    } catch (e) {
      console.log('getSetCookie() not available or failed');
    }

    // Method 2: Iterate through headers looking for set-cookie
    if (!cookieString) {
      const cookies: string[] = [];
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          cookies.push(value.split(';')[0]);
        }
      });
      if (cookies.length > 0) {
        cookieString = cookies.join('; ');
        console.log(`Got ${cookies.length} cookies via forEach()`);
      }
    }

    // Method 3: Direct get (older API, might not work in Node.js)
    if (!cookieString) {
      const cookie = response.headers.get('set-cookie');
      if (cookie) {
        cookieString = cookie.split(';')[0];
        console.log('Got cookie via get()');
      }
    }

    if (cookieString) {
      console.log(`Successfully logged in, cookie string: ${cookieString.substring(0, 100)}...`);
      return cookieString;
    }

    console.error('No cookies received from Tabroom login');
    return null;
  } catch (error) {
    console.error('Error logging into Tabroom:', error);
    return null;
  }
}

/**
 * Fetch authenticated tournament results from Tabroom
 */
export async function fetchAuthenticatedTournamentResults(
  input: FetchAuthenticatedResultsInput
): Promise<FetchAuthenticatedResultsOutput> {
  try {
    console.log('=== STARTING TOURNAMENT RESULTS IMPORT ===');
    console.log('Tournament:', input.tournamentName);
    console.log('Tournament URL:', input.tournamentUrl);
    console.log('School:', input.schoolName);
    console.log('Chapter ID:', input.tabroomChapterId);

    // Extract tournament ID from URL
    const urlObj = new URL(input.tournamentUrl);
    const tournId = new URLSearchParams(urlObj.search).get('tourn_id');
    console.log('Extracted tourn_id:', tournId);

    if (!tournId) {
      return {
        results: [],
        success: false,
        error: 'Could not extract tournament ID from URL',
      };
    }

    // Login to Tabroom
    console.log('Attempting to login to Tabroom...');
    console.log(`Email: ${input.tabroomEmail}`);
    const sessionCookies = await loginToTabroom(input.tabroomEmail, input.tabroomPassword);

    if (!sessionCookies) {
      console.error('Login failed - no session cookies received');
      return {
        results: [],
        success: false,
        error: 'Failed to login to Tabroom. Please check your credentials in Settings.',
      };
    }

    console.log('Login successful, received cookies:', sessionCookies.substring(0, 100));

    // Use the chapter results page approach (more reliable)
    console.log(`Fetching chapter results for chapter_id=${input.tabroomChapterId}...`);
    const chapterResultsUrl = `https://www.tabroom.com/user/results/index.mhtml?chapter_id=${input.tabroomChapterId}`;

    let html = '';

    try {
      // First, fetch the chapter results page to find the tournament
      const chapterResponse = await fetch(chapterResultsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': sessionCookies,
        },
      });

      if (!chapterResponse.ok) {
        return {
          results: [],
          success: false,
          error: `Could not access chapter results page. Status: ${chapterResponse.status}`,
        };
      }

      const chapterHtml = await chapterResponse.text();
      console.log(`Chapter results page length: ${chapterHtml.length} chars`);

      // Check for Tabroom server errors
      if (chapterHtml.includes('Error during compilation') || chapterHtml.includes('Global symbol')) {
        console.error('Tabroom.com is experiencing a server error on the results page');
        return {
          results: [],
          success: false,
          error: 'Tabroom.com is currently experiencing technical difficulties. Please try again in a few minutes.',
        };
      }

      // Save chapter HTML so we can inspect it
      try {
        const fs = await import('fs/promises');
        await fs.writeFile('C:\\Users\\kasey\\chapter-page.html', chapterHtml);
        console.log('Saved chapter page to C:\\Users\\kasey\\chapter-page.html');
      } catch (err) {
        console.error('Could not save chapter page:', err);
      }

      // Look for the "Results" button after the tournament link
      // The tournament link and Results button are in separate table cells within the same row:
      // <a href="/index/tourn/results/index.mhtml?tourn_id=35025">The Longhorn Classic</a>
      // ... (several lines later in the same <tr>) ...
      // <a href="tourn.mhtml?school_id=808955">Results</a>

      let schoolId = null;

      // Find the tournament ID, then search forward for the school_id
      const tournIdIndex = chapterHtml.indexOf(`tourn_id=${tournId}`);

      if (tournIdIndex !== -1) {
        console.log(`Found tournament at index ${tournIdIndex}`);

        // Search for the next occurrence of tourn.mhtml?school_id= after the tournament link
        // Limit search to next 2000 characters to stay within the same table row
        const searchArea = chapterHtml.substring(tournIdIndex, tournIdIndex + 2000);
        const schoolIdMatch = searchArea.match(/tourn\.mhtml\?school_id=(\d+)/i);

        if (schoolIdMatch) {
          schoolId = schoolIdMatch[1];
          console.log(`Extracted school_id: ${schoolId} from Results button`);
        } else {
          console.log('Could not find school_id after tournament link');
          console.log('Search area:', searchArea.substring(0, 500));
        }
      } else {
        console.log(`Tournament ID ${tournId} not found in chapter page`);
      }

      if (!schoolId) {
        console.error(`Could not find school_id for tourn_id=${tournId}`);

        // Log if we can at least find the tournament ID mentioned
        if (chapterHtml.includes(tournId)) {
          console.log(`Tournament ID ${tournId} IS present in the chapter page`);
        } else {
          console.log(`Tournament ID ${tournId} NOT found in the chapter page`);
        }

        return {
          results: [],
          success: false,
          error: 'Could not find school ID for this tournament. The tournament may not have results posted yet.',
        };
      }

      console.log(`Found school_id: ${schoolId}`);

      // Fetch the school dashboard page which has the CSV export button
      // URL: /user/enter/dashboard.mhtml?school_id=808955&results=1
      const dashboardUrl = `https://www.tabroom.com/user/enter/dashboard.mhtml?school_id=${schoolId}&results=1`;
      console.log(`Fetching school dashboard: ${dashboardUrl}`);

      let dashboardHtml = '';

      try {
        const dashboardResponse = await fetch(dashboardUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': sessionCookies,
          },
        });

        if (dashboardResponse.ok) {
          dashboardHtml = await dashboardResponse.text();
          console.log(`Dashboard page fetched! Length: ${dashboardHtml.length} chars`);

          // Save for inspection
          try {
            const fs = await import('fs/promises');
            await fs.writeFile('C:\\Users\\kasey\\dashboard-sample.html', dashboardHtml);
            console.log('Saved dashboard to C:\\Users\\kasey\\dashboard-sample.html');
          } catch (fileErr) {
            console.error('Could not save dashboard:', fileErr);
          }

          // Extract the results table from the dashboard
          // The table has id like "808955_entries"
          console.log(`Looking for table with id="${schoolId}_entries"`);

          // Try simpler search - find the id first, then extract the table
          const idString = `id    = "${schoolId}_entries"`;  // Tabroom uses spacing
          const idIndex = dashboardHtml.indexOf(idString);

          if (idIndex !== -1) {
            console.log(`Found id at index ${idIndex}`);
            // Find the <table tag before this id
            const tableStart = dashboardHtml.lastIndexOf('<table', idIndex);
            // Find the </table> after this id
            const tableEnd = dashboardHtml.indexOf('</table>', idIndex) + 8;

            if (tableStart !== -1 && tableEnd !== -1) {
              html = dashboardHtml.substring(tableStart, tableEnd);
              console.log(`Extracted results table from dashboard (${html.length} chars)`);
            } else {
              console.log(`Found id but couldn't extract table bounds (start=${tableStart}, end=${tableEnd})`);
            }
          } else {
            console.log(`Could not find id="${schoolId}_entries" in dashboard HTML`);
            // Try alternate format
            const altId = `"${schoolId}_entries"`;
            if (dashboardHtml.includes(altId)) {
              console.log(`Found alternate id format: ${altId}`);
            }
          }
        } else {
          console.log(`Dashboard returned status ${dashboardResponse.status}, will try fallback`);
        }
      } catch (dashboardError) {
        console.error('Error fetching dashboard:', dashboardError);
      }

      // If we didn't get the dashboard table, fall back to the old method
      if (!html || html.length < 100) {
        console.log('Dashboard extraction failed, falling back to detail pages...');

        const mainResultsUrl = `https://www.tabroom.com/user/results/report.mhtml?school_id=${schoolId}`;
        console.log(`Fetching main results page: ${mainResultsUrl}`);

        const mainResponse = await fetch(mainResultsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': sessionCookies,
          },
        });

        if (!mainResponse.ok) {
          return {
            results: [],
            success: false,
            error: `Could not access tournament results page. Status: ${mainResponse.status}`,
          };
        }

        const mainHtml = await mainResponse.text();
        console.log(`Main results page length: ${mainHtml.length} chars`);

        let combinedHtml = '';

        // Fetch Final Places page(s) - allow whitespace between > and link text
        const finalPlacesRegex = /href="([^"]*event_results\.mhtml[^"]*result_id=\d+[^"]*)"\s*>\s*Final\s+Places/gi;
        let match;
        while ((match = finalPlacesRegex.exec(mainHtml)) !== null) {
          const finalPlacesPath = match[1];
          const finalPlacesUrl = finalPlacesPath.startsWith('http') ? finalPlacesPath : `https://www.tabroom.com${finalPlacesPath}`;
          console.log(`Fetching Final Places: ${finalPlacesUrl}`);

          try {
            const fpResponse = await fetch(finalPlacesUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': sessionCookies,
              },
            });

            if (fpResponse.ok) {
              const fpHtml = await fpResponse.text();
              combinedHtml += `\n\n=== FINAL PLACES ===\n${fpHtml}\n`;
              console.log(`Added Final Places page (${fpHtml.length} chars)`);

              // Save first Final Places page for debugging
              if (combinedHtml.split('=== FINAL PLACES ===').length === 2) {
                try {
                  const fs = await import('fs/promises');
                  await fs.writeFile('C:\\Users\\kasey\\final-places-sample.html', fpHtml);
                  console.log('Saved first Final Places page for debugging');
                } catch (err) {
                  console.error('Could not save debug file:', err);
                }
              }
            }
          } catch (err) {
            console.log(`Error fetching Final Places: ${err}`);
          }
        }

        // Fetch Prelims Table page(s) - allow whitespace between > and link text
        const prelimsTableRegex = /href="([^"]*prelims_table\.mhtml[^"]*result_id=\d+[^"]*)"\s*>\s*Prelims\s+Table/gi;
        while ((match = prelimsTableRegex.exec(mainHtml)) !== null) {
          const prelimsPath = match[1];
          const prelimsUrl = prelimsPath.startsWith('http') ? prelimsPath : `https://www.tabroom.com${prelimsPath}`;
          console.log(`Fetching Prelims Table: ${prelimsUrl}`);

          try {
            const ptResponse = await fetch(prelimsUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': sessionCookies,
              },
            });

            if (ptResponse.ok) {
              const ptHtml = await ptResponse.text();
              combinedHtml += `\n\n=== PRELIMS TABLE ===\n${ptHtml}\n`;
              console.log(`Added Prelims Table page (${ptHtml.length} chars)`);

              // Save first Prelims Table page for debugging
              if (combinedHtml.split('=== PRELIMS TABLE ===').length === 2) {
                try {
                  const fs = await import('fs/promises');
                  await fs.writeFile('C:\\Users\\kasey\\prelims-table-sample.html', ptHtml);
                  console.log('Saved first Prelims Table page for debugging');
                } catch (err) {
                  console.error('Could not save debug file:', err);
                }
              }
            }
          } catch (err) {
            console.log(`Error fetching Prelims Table: ${err}`);
          }
        }

        html = combinedHtml || mainHtml;
        console.log(`Combined HTML length: ${html.length} chars`);
      }

      // Try to find and download the CSV file - look for various CSV link patterns
      const csvMatch = html.match(/href=["']([^"']*(?:results_csv|csv|export)[^"']*)["']/i);
      if (csvMatch) {
        const csvPath = csvMatch[1];
        const csvUrl = csvPath.startsWith('http') ? csvPath : `https://www.tabroom.com${csvPath}`;
        console.log(`Found CSV download link: ${csvUrl}`);

        try {
          const csvResponse = await fetch(csvUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': sessionCookies,
            },
          });

          if (csvResponse.ok) {
            const csvData = await csvResponse.text();
            console.log(`Downloaded CSV, length: ${csvData.length} chars`);

            // Save CSV for inspection
            try {
              const fs = await import('fs/promises');
              await fs.writeFile('C:\\Users\\kasey\\tabroom-results.csv', csvData);
              console.log('Saved CSV to C:\\Users\\kasey\\tabroom-results.csv');
            } catch (fileErr) {
              console.error('Could not save CSV:', fileErr);
            }

            // Use CSV data instead of HTML
            html = `CSV DATA:\n${csvData}`;
          }
        } catch (csvError) {
          console.error('Error downloading CSV:', csvError);
        }
      }

      // Custom parser can handle large HTML files - no need to extract sections
      console.log(`Ready to parse HTML, length: ${html.length} chars`);

      // Save HTML/CSV sample for inspection
      try {
        const fs = await import('fs/promises');
        const sampleLength = Math.min(html.length, 50000);
        await fs.writeFile('C:\\Users\\kasey\\tabroom-sample.html', html.substring(0, sampleLength));
        console.log(`Saved sample (${sampleLength} chars) to C:\\Users\\kasey\\tabroom-sample.html`);
      } catch (fileErr) {
        console.error('Could not save HTML sample:', fileErr);
      }
    } catch (fetchError: any) {
      console.error('Error fetching results:', fetchError);
      return {
        results: [],
        success: false,
        error: `Failed to fetch results: ${fetchError.message}`,
      };
    }

    if (!html || html.length < 1000) {
      return {
        results: [],
        success: false,
        error: 'Could not access tournament results. The results may not be published yet, or there may be an issue with your Tabroom credentials.',
      };
    }

    // Check if we got valid HTML
    if (!html || html.length < 100) {
      return {
        results: [],
        success: false,
        error: 'Received invalid or empty response from Tabroom',
      };
    }

    console.log(`HTML length: ${html.length} chars`);
    console.log(`First 500 chars: ${html.slice(0, 500)}`);

    // Use custom parser (no AI needed - instant and reliable!)
    try {
      console.log('Using custom parser to extract results...');
      console.log(`Data length being parsed: ${html.length} chars`);

      const parsedResults = parseTabroomData(html, input.schoolName);

      console.log(`Custom parser extracted ${parsedResults.length} results`);

      if (parsedResults.length === 0) {
        return {
          results: [],
          success: false,
          error: `No results found. The results may not be published yet, or the tournament data may not be available.`,
        };
      }

      return {
        results: parsedResults,
        success: true,
      };
    } catch (parseError: any) {
      console.error('Parsing error:', parseError);
      return {
        results: [],
        success: false,
        error: `Parsing failed: ${parseError.message}. Try checking the tournament URL directly on Tabroom.`,
      };
    }

  } catch (error: any) {
    console.error('Error fetching authenticated results:', error);
    return {
      results: [],
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}
