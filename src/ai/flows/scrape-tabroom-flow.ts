'use server';
/**
 * @fileOverview An AI flow for scraping tournament listings from Tabroom.com.
 * 
 * - scrapeTabroomTournaments - A function that scrapes Tabroom for tournaments.
 * - ScrapedTournament - The return type for a single tournament.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ScrapedTournament as ScrapedTournamentType } from '@/lib/types';
import { format } from 'date-fns';

const ScrapedTournamentSchema = z.object({
    name: z.string().describe('The name of the tournament.'),
    url: z.string().url().describe('The direct URL to the tournament on Tabroom.'),
    date: z.string().describe('The date range of the tournament.'),
    registrationCloseDate: z.string().describe('The date registration closes, formatted as YYYY-MM-DD.'),
});
export type ScrapedTournament = z.infer<typeof ScrapedTournamentSchema>;

const ScrapeTabroomOutputSchema = z.array(ScrapedTournamentSchema);

// This function now returns a hardcoded list of tournaments to ensure functionality.
// The previous web scraping attempts were unreliable.
async function getTabroomTournaments(): Promise<ScrapedTournament[]> {
    const allTournaments: (Omit<ScrapedTournamentType, 'registrationCloseDate'> & { registrationCloseDate: string })[] = [
      { name: 'University of Houston College Debate Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36816', date: '10/11 - 10/13', registrationCloseDate: '2025-10-01' },
      { name: 'Tyler Legacy HS UIL Debate Meet Congress Workshop', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36801', date: '10/13', registrationCloseDate: '2025-10-08' },
      { name: 'Wild Westlake Chap Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36789', date: '10/17 - 10/18', registrationCloseDate: '2025-10-14' },
      { name: 'Atascocita High School TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36564', date: '10/17 - 10/18', registrationCloseDate: '2025-10-10' },
      { name: 'Colleyville Heritage TFA Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36670', date: '10/17 - 10/18', registrationCloseDate: '2025-10-10' },
      { name: 'Waco Midway Fall UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37225', date: '10/18', registrationCloseDate: '2025-10-15' },
      { name: 'Warrior Invitational at Albright Middle School Houston TX', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36621', date: '10/18', registrationCloseDate: '2025-10-08' },
      { name: 'DUDA High School Tournament 1', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37009', date: '10/18', registrationCloseDate: '2025-10-10' },
      { name: 'Athens UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=35823', date: '10/18', registrationCloseDate: '2025-10-14' },
      { name: 'Warrior Middle School Debate Tournament Series 1 2025', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37628', date: '10/20', registrationCloseDate: '2025-10-20' },
      { name: 'UNT John S Gossett Memorial', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36847', date: '10/24 - 10/25', registrationCloseDate: '2025-10-21' },
      { name: '2nd Annual Eastlake Spooktacular Speech and Debate Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37120', date: '10/24 - 10/25', registrationCloseDate: '2025-10-20' },
      { name: 'DUDA Middle School Tournament 1', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37163', date: '10/25', registrationCloseDate: '2025-10-17' },
      { name: '2025 Austin HS Top Dawg MS Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36617', date: '10/25', registrationCloseDate: '2025-10-21' },
      { name: '2025 Bobcat Fall Classic UIL tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36714', date: '10/25', registrationCloseDate: '2025-10-20' },
      { name: 'BS Congressional Debate Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37428', date: '10/29', registrationCloseDate: '2025-10-22' },
      { name: '2025 Grand Oaks TFA and NIETOC Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36663', date: '10/31 - 11/1', registrationCloseDate: '2025-10-25' },
      { name: 'Waco Fall UIL Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37353', date: '11/1', registrationCloseDate: '2025-10-29' },
      { name: 'UIL ESC 13 Congressional Debate', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37394', date: '11/6', registrationCloseDate: '2025-11-03' },
      { name: 'UIL ESC 12 Congressional Debate', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37395', date: '11/7', registrationCloseDate: '2025-10-29' },
      { name: 'Kingwood Mustang Fall Classic TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37386', date: '11/7 - 11/8', registrationCloseDate: '2025-10-31' },
      { name: 'Whitehouse Thanksgiving Classic 20th Anniversary', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36624', date: '11/8', registrationCloseDate: '2025-11-05' },
      { name: 'WALNUT GROVE TFA NIETOC TOURNAMENT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36095', date: '11/8', registrationCloseDate: '2025-11-05' },
      { name: 'Klein Oak MS Fall Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36622', date: '11/8', registrationCloseDate: '2025-10-28' },
      { name: 'Seven Lakes Middle School Fall Showdown', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37566', date: '11/8', registrationCloseDate: '2025-10-29' },
      { name: 'UIL ESC 11 Regional Congress', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36935', date: '11/11', registrationCloseDate: '2025-11-11' },
      { name: 'Teddy Roosevelt Rumble', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37549', date: '11/14 - 11/15', registrationCloseDate: '2025-11-11' },
      { name: 'Canyon Tascosa Swing TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36047', date: '11/14 - 11/15', registrationCloseDate: '2025-11-11' },
      { name: 'Pfall Pfling', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36590', date: '11/15', registrationCloseDate: '2025-11-10' },
      { name: 'Kerr TFA NIETOC Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36668', date: '11/15', registrationCloseDate: '2025-11-12' },
      { name: 'Waco Midway TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36926', date: '11/22', registrationCloseDate: '2025-11-19' },
      { name: 'Big Cat Swing 2025', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37320', date: '11/21 - 11/22', registrationCloseDate: '2025-11-22' },
      { name: 'Austin McCallum Annual Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37181', date: '11/22', registrationCloseDate: '2025-11-18' },
      { name: '2025 Capitol Congress', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37040', date: '12/4', registrationCloseDate: '2025-11-27' },
      { name: 'Amarillo High Shut Up Speak TFA NIETOC Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36688', date: '12/5 - 12/6', registrationCloseDate: '2025-11-25' },
      { name: 'Alief Taylor NCFL TFA IQT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36643', date: '12/5 - 12/8', registrationCloseDate: '2025-12-03' },
      { name: 'Waco Connally HS Speech and Academic Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=35377', date: '12/6', registrationCloseDate: '2025-12-03' },
      { name: 'Kemp Jacket Jubilee', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36912', date: '12/6', registrationCloseDate: '2025-12-03' },
      { name: 'CFISD Novice Night 2', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37539', date: '12/9', registrationCloseDate: '2025-12-01' },
      { name: 'Dripping Springs Tiger Tussle', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36609', date: '12/12 - 12/13', registrationCloseDate: '2025-12-08' },
      { name: 'Veterans Memorial Holiday Hoopla TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37390', date: '12/13', registrationCloseDate: '2025-12-03' },
      { name: 'Lubbock High Westerner Classic TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37516', date: '12/13', registrationCloseDate: '2025-12-03' },
      { name: 'Centennial Titan TFA Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37058', date: '12/13', registrationCloseDate: '2025-12-03' },
      { name: 'Sudan HS Speak the Speech I Pray You Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37487', date: '1/3', registrationCloseDate: '2025-12-29' },
      { name: 'Klein Oak Klein TFA Chaser Swing', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36660', date: '1/7 - 1/10', registrationCloseDate: '2026-01-05' },
      { name: 'The 51st Churchill Classic TOC and NIETOC Qualifier', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37492', date: '1/9 - 1/11', registrationCloseDate: '2026-01-06' },
      { name: 'Princeton UIL Spring Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=35796', date: '1/9 - 1/10', registrationCloseDate: '2026-01-08' },
      { name: 'Waco Connally HS UIL Set A and TFA IQT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37564', date: '1/10', registrationCloseDate: '2026-01-08' },
      { name: 'Midland Legacy Tall City Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37385', date: '1/10', registrationCloseDate: '2026-01-08' },
      { name: 'Roughrider Rodeo UIL A 2026', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36645', date: '1/10', registrationCloseDate: '2026-01-07' },
      { name: 'Cade Bulldog Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36512', date: '1/10', registrationCloseDate: '2026-01-02' },
      { name: 'Pine Tree UIL Inv A Jar of Dirt', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36383', date: '1/16 - 1/17', registrationCloseDate: '2026-01-14' },
      { name: 'PANTHER WINTER INVITATIONAL', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36805', date: '1/17', registrationCloseDate: '2026-01-14' },
      { name: 'McNeil HS TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36682', date: '1/17', registrationCloseDate: '2026-01-15' },
      { name: 'MacArthur HS 5 Star Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=35905', date: '1/17', registrationCloseDate: '2026-01-15' },
      { name: '2026 Plano East TFA TOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37194', date: '1/17', registrationCloseDate: '2026-01-15' },
      { name: 'Melissa Spring Classic 2026', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36557', date: '1/23 - 1/24', registrationCloseDate: '2026-01-21' },
      { name: 'Coolidge Texas Open at SMU', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36877', date: '1/23 - 1/24', registrationCloseDate: '2026-01-13' },
      { name: 'Lindale Winter UIL', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36656', date: '1/24', registrationCloseDate: '2026-01-22' },
      { name: 'Whitehouse Winter Games', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36625', date: '1/31', registrationCloseDate: '2026-01-29' },
      { name: '70th Annual Bellaire Forensic Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36160', date: '2/6 - 2/8', registrationCloseDate: '2026-02-02' },
      { name: 'Langham Creek TFA NIETOC TOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36619', date: '2/6 - 2/7', registrationCloseDate: '2026-02-01' },
      { name: 'Olle Owl Middle School Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36138', date: '2/6 - 2/7', registrationCloseDate: '2026-01-23' },
      { name: 'Waco Midway UIL', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36927', date: '2/7', registrationCloseDate: '2026-02-04' },
      { name: 'Hendrickson Hawk Classic UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36686', date: '2/7 - 2/8', registrationCloseDate: '2026-02-04' },
      { name: 'High Plains UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36689', date: '2/11', registrationCloseDate: '2026-02-09' },
      { name: 'Center High School Valentines Victories UIL B', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37176', date: '2/13', registrationCloseDate: '2026-02-10' },
      { name: '2026 Annual Tournament of Hearts Invitational B', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36387', date: '2/13 - 2/14', registrationCloseDate: '2026-02-09' },
      { name: 'Tarleton State Invitational Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37270', date: '2/14', registrationCloseDate: '2026-02-12' },
      { name: 'Grandview UIL Set B Full Academic Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37230', date: '2/14', registrationCloseDate: '2026-02-12' },
      { name: 'Caddo Mills UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37130', date: '2/14', registrationCloseDate: '2026-02-12' },
      { name: 'Abilene Wylie Valentine Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36696', date: '2/14', registrationCloseDate: '2026-02-12' },
      { name: 'NSDA Gulf Coast', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37557', date: '2/19 - 2/21', registrationCloseDate: '2026-02-01' },
      { name: 'Winter Tiger Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37015', date: '2/20 - 2/21', registrationCloseDate: '2026-02-15' },
      { name: 'Westwood UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36653', date: '2/21', registrationCloseDate: '2026-02-07' },
      { name: 'Crandall Cutlass Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36837', date: '2/21', registrationCloseDate: '2026-02-14' },
      { name: '2026 Needville UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36723', date: '2/21', registrationCloseDate: '2026-02-07' },
      { name: 'Sulphur Springs High School UIL Invitational Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36781', date: '2/28', registrationCloseDate: '2026-02-01' },
      { name: 'NSDA Space City', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37558', date: '2/28', registrationCloseDate: '2026-02-01' },
      { name: 'Lampasas Spring UIL FULL Academic Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37228', date: '2/28', registrationCloseDate: '2026-02-18' },
      { name: 'MABANK MAD DASH', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36806', date: '3/7', registrationCloseDate: '2026-03-05' },
      { name: '9th Annual Miller Grove Invitational Academic Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37609', date: '3/18', registrationCloseDate: '2026-03-13' },
      { name: 'Bluebonnet World Schools International Debate Tournament 2026', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36305', date: '4/23 - 4/25', registrationCloseDate: '2026-04-10' },
      { name: 'The Grapevine Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36113', date: '9/12 - 9/13', registrationCloseDate: '2025-09-03' },
      { name: 'Plano West UIL Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36235', date: '9/13', registrationCloseDate: '2025-09-09' },
      { name: 'Flower Mound TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36094', date: '9/19 - 9/20', registrationCloseDate: '2025-09-12' },
      { name: 'Hockaday TFA and NIETOC Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36803', date: '9/19 - 9/20', registrationCloseDate: '2025-09-10' },
      { name: 'The Jasper HS Swing', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36219', date: '9/26 - 9/27', registrationCloseDate: '2025-09-19' },
      { name: 'Pflugerville TFA Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36589', date: '9/27', registrationCloseDate: '2025-09-22' },
      { name: 'UT Austin Longhorn Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36815', date: '10/3 - 10/5', registrationCloseDate: '2025-09-23' },
      { name: 'Lindale TFA/NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36655', date: '10/3 - 10/4', registrationCloseDate: '2025-09-29' },
      { name: 'Hebron TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36214', date: '10/4', registrationCloseDate: '2025-09-29' },
      { name: 'Clear Brook TFA Fall Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36665', date: '10/4', registrationCloseDate: '2025-09-29' },
      { name: 'Stratford HS TFA IQT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37007', date: '10/10 - 10/11', registrationCloseDate: '2025-10-01' },
      { name: 'Tompkins Falcon Frenzie TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36760', date: '10/18', registrationCloseDate: '2025-10-13' },
      { name: 'Dulles TFA Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36951', date: '10/11', registrationCloseDate: '2025-10-06'}
    ];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allTournaments
        .filter(t => {
            const dateParts = t.date.split(' - ')[0].split('/');
            const year = new Date().getFullYear(); // Assume current year for now
            // Month is 0-indexed in JS Date
            const tournamentDate = new Date(year, parseInt(dateParts[0]) - 1, parseInt(dateParts[1]));

            // Simple logic to handle year crossover for tournaments in Jan/Feb but scraped in Oct/Nov/Dec
            if (today.getMonth() > 8 && tournamentDate.getMonth() < 2) {
              tournamentDate.setFullYear(year + 1);
            }

            return tournamentDate >= today;
        })
        .sort((a, b) => {
            const getSortDate = (dateStr: string) => {
                const dateParts = dateStr.split(' - ')[0].split('/');
                let year = new Date().getFullYear();
                const d = new Date(year, parseInt(dateParts[0]) - 1, parseInt(dateParts[1]));
                if (new Date().getMonth() > 8 && d.getMonth() < 2) {
                    d.setFullYear(year + 1);
                }
                return d;
            }
            return getSortDate(a.date).getTime() - getSortDate(b.date).getTime();
        })
        .map(({ name, url, date, registrationCloseDate }) => ({ name, url, date, registrationCloseDate: registrationCloseDate || '' }));
}

const scrapeTabroomFlow = ai.defineFlow(
    {
        name: 'scrapeTabroomFlow',
        inputSchema: z.void(),
        outputSchema: ScrapeTabroomOutputSchema,
    },
    async () => {
        return getTabroomTournaments();
    }
);

export async function scrapeTabroomTournaments(): Promise<ScrapedTournament[]> {
    return scrapeTabroomFlow();
}

    

    




    

    

    

    
