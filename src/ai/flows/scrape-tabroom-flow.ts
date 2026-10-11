'use server';
/**
 * @fileOverview Scrapes tournament listings from Tabroom.com with fallback to hardcoded data.
 *
 * - scrapeTabroomTournaments - A function that returns tournament data from live scraping or fallback.
 * - ScrapedTournament - The return type for a single tournament.
 */

import type { ScrapedTournament as ScrapedTournamentType } from '@/lib/types';
import { format, parse } from 'date-fns';
import * as cheerio from 'cheerio';

// Simple type for scraped tournaments (no Genkit/Zod validation needed)
export type ScrapedTournament = {
    name: string;
    url: string;
    date: string;
    registrationCloseDate: string;
};

/**
 * Scrapes live tournament data from Tabroom.com homepage
 */
async function scrapeLiveTournaments(): Promise<ScrapedTournament[]> {
    try {
        const response = await fetch('https://www.tabroom.com/index/index.mhtml', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const tournaments: ScrapedTournament[] = [];

        // Parse the tournament table (#tournlist)
        // Columns: [0]=Dates, [1]=Tournament, [2]=City, [3]=State, [4]=Mode, [5]=Registration, [6]=Judge Signup
        $('#tournlist tbody tr').each((_, element) => {
            const $row = $(element);
            const cells = $row.find('td');

            if (cells.length >= 6) {
                // Extract tournament name and URL
                const nameCell = $(cells[1]);
                const link = nameCell.find('a').first();
                const name = link.text().trim();
                const href = link.attr('href');

                // Extract dates
                const dateText = $(cells[0]).text().trim();

                // Extract city (column 2)
                const city = $(cells[2]).text().trim() || undefined;

                // Extract state (column 3) - this is the "LO/TZ Loc" column
                const stateText = $(cells[3]).text().trim();
                const state = stateText || undefined;

                // Extract registration status to get close date
                const regCell = $(cells[5]);
                const regText = regCell.text().trim();

                if (name && href) {
                    const url = href.startsWith('http') ? href : `https://www.tabroom.com${href}`;

                    // Parse registration close date from "Due MM/DD" or similar format
                    let registrationCloseDate = '';
                    const dueMatch = regText.match(/Due\s+(\d{1,2})\/(\d{1,2})/);
                    if (dueMatch) {
                        const month = dueMatch[1].padStart(2, '0');
                        const day = dueMatch[2].padStart(2, '0');
                        // Assume current or next year based on month
                        const now = new Date();
                        const currentMonth = now.getMonth() + 1;
                        const year = parseInt(month) < currentMonth ? now.getFullYear() + 1 : now.getFullYear();
                        registrationCloseDate = `${year}-${month}-${day}`;
                    } else {
                        // Default to a date in the past if we can't parse
                        registrationCloseDate = '2026-01-01';
                    }

                    // Detect circuits from tournament name
                    const circuits: string[] = [];
                    const nameUpper = name.toUpperCase();
                    if (nameUpper.includes('TFA')) circuits.push('TFA');
                    if (nameUpper.includes('NIETOC')) circuits.push('NIETOC');
                    if (nameUpper.includes('TOC')) circuits.push('TOC');
                    if (nameUpper.includes('NSDA')) circuits.push('NSDA');
                    if (nameUpper.includes('UIL')) circuits.push('UIL');
                    if (nameUpper.includes('NCFL')) circuits.push('NCFL');

                    tournaments.push({
                        name,
                        url,
                        date: dateText,
                        registrationCloseDate,
                        city,
                        state,
                        circuits: circuits.length > 0 ? circuits : undefined
                    });
                }
            }
        });

        console.log(`Scraped ${tournaments.length} tournaments from Tabroom.com`);
        return tournaments;
    } catch (error) {
        console.error('Failed to scrape live tournaments:', error);
        return [];
    }
}

// Hardcoded fallback list of tournaments
async function getHardcodedTournaments(): Promise<ScrapedTournament[]> {
    const allTournaments: (Omit<ScrapedTournamentType, 'registrationCloseDate'> & { registrationCloseDate: string })[] = [
      { name: 'Jordan Warrior Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=40376', date: '8/28 - 8/29', registrationCloseDate: '2026-08-20' },
      { name: 'Lewisville High School TFA Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36801', date: '9/6 - 9/7', registrationCloseDate: '2026-08-30' },
      { name: 'Greenhill Fall Classic TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36802', date: '9/6 - 9/7', registrationCloseDate: '2026-08-30' },
      { name: 'The Grapevine Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36113', date: '9/12 - 9/13', registrationCloseDate: '2026-09-03' },
      { name: 'Plano West UIL Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36235', date: '9/13', registrationCloseDate: '2026-09-09' },
      { name: 'Seven Lakes Spartan Symposium TFA IQT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=40213', date: '9/18 - 9/19', registrationCloseDate: '2026-09-10' },
      { name: 'Flower Mound TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36094', date: '9/19 - 9/20', registrationCloseDate: '2026-09-12' },
      { name: 'Hockaday TFA and NIETOC Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36803', date: '9/19 - 9/20', registrationCloseDate: '2026-09-10' },
      { name: '50th Clear Lake Falcon Classic IQT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36217', date: '9/20', registrationCloseDate: '2026-09-15' },
      { name: 'The Jasper HS Swing', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36219', date: '9/26 - 9/27', registrationCloseDate: '2026-09-19' },
      { name: 'Pflugerville TFA Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36589', date: '9/27', registrationCloseDate: '2026-09-22' },
      { name: 'UNT John S Gossett Memorial', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=40331', date: '10/2 - 10/3', registrationCloseDate: '2026-09-25' },
      { name: '2026 Princeton UIL Fall Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=40292', date: '10/3', registrationCloseDate: '2026-09-28' },
      { name: 'UT Austin Longhorn Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36815', date: '10/3 - 10/5', registrationCloseDate: '2026-09-23' },
      { name: 'Lindale TFA/NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36655', date: '10/3 - 10/4', registrationCloseDate: '2026-09-29' },
      { name: 'Hebron TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36214', date: '10/4', registrationCloseDate: '2026-09-29' },
      { name: 'Clear Brook TFA Fall Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36665', date: '10/4', registrationCloseDate: '2026-09-29' },
      { name: 'Stratford HS TFA IQT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37007', date: '10/10 - 10/11', registrationCloseDate: '2026-10-01' },
      { name: 'Dulles TFA Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36951', date: '10/11', registrationCloseDate: '2026-10-06'},
      { name: 'University of Houston College Debate Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36816', date: '10/11 - 10/13', registrationCloseDate: '2026-10-01' },
      { name: 'Tyler Legacy HS UIL Debate Meet Congress Workshop', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36801', date: '10/13', registrationCloseDate: '2026-10-08' },
      { name: 'Wild Westlake Chap Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36789', date: '10/17 - 10/18', registrationCloseDate: '2026-10-14' },
      { name: 'Atascocita High School TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36564', date: '10/17 - 10/18', registrationCloseDate: '2026-10-10' },
      { name: 'Colleyville Heritage TFA Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36670', date: '10/17 - 10/18', registrationCloseDate: '2026-10-10' },
      { name: 'Waco Midway Fall UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37225', date: '10/18', registrationCloseDate: '2026-10-15' },
      { name: 'Warrior Invitational at Albright Middle School Houston TX', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36621', date: '10/18', registrationCloseDate: '2026-10-08' },
      { name: 'DUDA High School Tournament 1', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37009', date: '10/18', registrationCloseDate: '2026-10-10' },
      { name: 'Athens UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=35823', date: '10/18', registrationCloseDate: '2026-10-14' },
      { name: 'Tompkins Falcon Frenzie TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36760', date: '10/18', registrationCloseDate: '2026-10-13' },
      { name: 'Warrior Middle School Debate Tournament Series 1 2025', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37628', date: '10/20', registrationCloseDate: '2026-10-20' },
      { name: 'Spartan Ram Fall Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37219', date: '10/21 - 10/24', registrationCloseDate: '2026-10-16' },
      { name: '2nd Annual Eastlake Spooktacular Speech and Debate Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37120', date: '10/24 - 10/25', registrationCloseDate: '2026-10-20' },
      { name: 'DUDA Middle School Tournament 1', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37163', date: '10/25', registrationCloseDate: '2026-10-17' },
      { name: '2025 Austin HS Top Dawg MS Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36617', date: '10/25', registrationCloseDate: '2026-10-21' },
      { name: '2025 Bobcat Fall Classic UIL tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36714', date: '10/25', registrationCloseDate: '2026-10-20' },
      { name: 'BS Congressional Debate Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37428', date: '10/29', registrationCloseDate: '2026-10-22' },
      { name: '2025 Grand Oaks TFA and NIETOC Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36663', date: '10/31 - 11/1', registrationCloseDate: '2026-10-25' },
      { name: 'Waco Fall UIL Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37353', date: '11/1', registrationCloseDate: '2026-10-29' },
      { name: 'UIL ESC 13 Congressional Debate', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37394', date: '11/6', registrationCloseDate: '2026-11-03' },
      { name: 'UIL ESC 12 Congressional Debate', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37395', date: '11/7', registrationCloseDate: '2026-10-29' },
      { name: 'Kingwood Mustang Fall Classic TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37386', date: '11/7 - 11/8', registrationCloseDate: '2026-10-31' },
      { name: 'Whitehouse Thanksgiving Classic 20th Anniversary', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36624', date: '11/8', registrationCloseDate: '2026-11-05' },
      { name: 'WALNUT GROVE TFA NIETOC TOURNAMENT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36095', date: '11/8', registrationCloseDate: '2026-11-05' },
      { name: 'Klein Oak MS Fall Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36622', date: '11/8', registrationCloseDate: '2026-10-28' },
      { name: 'Seven Lakes Middle School Fall Showdown', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37566', date: '11/8', registrationCloseDate: '2026-10-29' },
      { name: 'UIL ESC 11 Regional Congress', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36935', date: '11/11', registrationCloseDate: '2026-11-11' },
      { name: 'Teddy Roosevelt Rumble', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37549', date: '11/14 - 11/15', registrationCloseDate: '2026-11-11' },
      { name: 'Canyon Tascosa Swing TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36047', date: '11/14 - 11/15', registrationCloseDate: '2026-11-11' },
      { name: 'Pfall Pfling', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36590', date: '11/15', registrationCloseDate: '2026-11-10' },
      { name: 'Kerr TFA NIETOC Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36668', date: '11/15', registrationCloseDate: '2026-11-12' },
      { name: 'Waco Midway TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36926', date: '11/22', registrationCloseDate: '2026-11-19' },
      { name: 'Big Cat Swing 2025', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37320', date: '11/21 - 11/22', registrationCloseDate: '2026-11-22' },
      { name: 'Austin McCallum Annual Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37181', date: '11/22', registrationCloseDate: '2026-11-18' },
      { name: '2025 Capitol Congress', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37040', date: '12/4', registrationCloseDate: '2026-11-27' },
      { name: 'Amarillo High Shut Up Speak TFA NIETOC Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36688', date: '12/5 - 12/6', registrationCloseDate: '2026-11-25' },
      { name: 'Alief Taylor NCFL TFA IQT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36643', date: '12/5 - 12/8', registrationCloseDate: '2026-12-03' },
      { name: 'Waco Connally HS Speech and Academic Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=35377', date: '12/6', registrationCloseDate: '2026-12-03' },
      { name: 'Kemp Jacket Jubilee', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36912', date: '12/6', registrationCloseDate: '2026-12-03' },
      { name: 'CFISD Novice Night 2', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37539', date: '12/9', registrationCloseDate: '2026-12-01' },
      { name: 'Dripping Springs Tiger Tussle', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36609', date: '12/12 - 12/13', registrationCloseDate: '2026-12-08' },
      { name: 'Veterans Memorial Holiday Hoopla TFA NIETOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37390', date: '12/13', registrationCloseDate: '2026-12-03' },
      { name: 'Lubbock High Westerner Classic TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37516', date: '12/13', registrationCloseDate: '2026-12-03' },
      { name: 'Centennial Titan TFA Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37058', date: '12/13', registrationCloseDate: '2026-12-03' },
      { name: 'Sudan HS Speak the Speech I Pray You Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37487', date: '1/3', registrationCloseDate: '2026-12-29' },
      { name: 'Klein Oak Klein TFA Chaser Swing', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36660', date: '1/7 - 1/10', registrationCloseDate: '2026-12-30' },
      { name: 'The 51st Churchill Classic TOC and NIETOC Qualifier', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37492', date: '1/9 - 1/11', registrationCloseDate: '2026-12-31' },
      { name: 'Princeton UIL Spring Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=35796', date: '1/9 - 1/10', registrationCloseDate: '2026-12-31' },
      { name: 'Waco Connally HS UIL Set A and TFA IQT', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37564', date: '1/10', registrationCloseDate: '2026-12-31' },
      { name: 'Midland Legacy Tall City Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37385', date: '1/10', registrationCloseDate: '2026-12-31' },
      { name: 'Roughrider Rodeo UIL A 2026', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36645', date: '1/10', registrationCloseDate: '2026-12-31' },
      { name: 'Cade Bulldog Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36512', date: '1/10', registrationCloseDate: '2026-12-25' },
      { name: 'Pine Tree UIL Inv A Jar of Dirt', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36383', date: '1/16 - 1/17', registrationCloseDate: '2026-12-31' },
      { name: 'PANTHER WINTER INVITATIONAL', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36805', date: '1/17', registrationCloseDate: '2026-12-31' },
      { name: 'McNeil HS TFA', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36682', date: '1/17', registrationCloseDate: '2026-12-31' },
      { name: 'MacArthur HS 5 Star Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=35905', date: '1/17', registrationCloseDate: '2026-12-31' },
      { name: '2026 Plano East TFA TOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37194', date: '1/17', registrationCloseDate: '2026-12-31' },
      { name: 'Melissa Spring Classic 2026', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36557', date: '1/23 - 1/24', registrationCloseDate: '2026-12-31' },
      { name: 'Coolidge Texas Open at SMU', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36877', date: '1/23 - 1/24', registrationCloseDate: '2026-12-20' },
      { name: 'Lindale Winter UIL', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36656', date: '1/24', registrationCloseDate: '2026-12-31' },
      { name: 'Whitehouse Winter Games', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36625', date: '1/31', registrationCloseDate: '2026-12-31' },
      { name: '70th Annual Bellaire Forensic Tournament', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36160', date: '2/6 - 2/8', registrationCloseDate: '2026-12-31' },
      { name: 'Langham Creek TFA NIETOC TOC', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36619', date: '2/6 - 2/7', registrationCloseDate: '2026-12-31' },
      { name: 'Olle Owl Middle School Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36138', date: '2/6 - 2/7', registrationCloseDate: '2026-12-20' },
      { name: 'Waco Midway UIL', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36927', date: '2/7', registrationCloseDate: '2026-12-31' },
      { name: 'Hendrickson Hawk Classic UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36686', date: '2/7 - 2/8', registrationCloseDate: '2026-12-31' },
      { name: 'High Plains UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36689', date: '2/11', registrationCloseDate: '2026-12-31' },
      { name: 'Center High School Valentines Victories UIL B', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37176', date: '2/13', registrationCloseDate: '2026-12-31' },
      { name: '2026 Annual Tournament of Hearts Invitational B', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36387', date: '2/13 - 2/14', registrationCloseDate: '2026-12-31' },
      { name: 'Tarleton State Invitational Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37270', date: '2/14', registrationCloseDate: '2026-12-31' },
      { name: 'Grandview UIL Set B Full Academic Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37230', date: '2/14', registrationCloseDate: '2026-12-31' },
      { name: 'Caddo Mills UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37130', date: '2/14', registrationCloseDate: '2026-12-31' },
      { name: 'Abilene Wylie Valentine Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36696', date: '2/14', registrationCloseDate: '2026-12-31' },
      { name: 'NSDA Gulf Coast', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37557', date: '2/19 - 2/21', registrationCloseDate: '2026-12-31' },
      { name: 'Winter Tiger Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37015', date: '2/20 - 2/21', registrationCloseDate: '2026-12-31' },
      { name: 'Westwood UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36653', date: '2/21', registrationCloseDate: '2026-12-31' },
      { name: 'Crandall Cutlass Classic', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36837', date: '2/21', registrationCloseDate: '2026-12-31' },
      { name: '2026 Needville UIL Invitational', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36723', date: '2/21', registrationCloseDate: '2026-12-31' },
      { name: 'Sulphur Springs High School UIL Invitational Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36781', date: '2/28', registrationCloseDate: '2026-12-31' },
      { name: 'NSDA Space City', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37558', date: '2/28', registrationCloseDate: '2026-12-31' },
      { name: 'Lampasas Spring UIL FULL Academic Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37228', date: '2/28', registrationCloseDate: '2026-12-31' },
      { name: 'MABANK MAD DASH', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36806', date: '3/7', registrationCloseDate: '2026-12-31' },
      { name: '9th Annual Miller Grove Invitational Academic Meet', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=37609', date: '3/18', registrationCloseDate: '2026-12-31' },
      { name: 'Bluebonnet World Schools International Debate Tournament 2026', url: 'https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=36305', date: '4/23 - 4/25', registrationCloseDate: '2026-12-31' }
    ];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper function to get the tournament date from the date string and registration close date
    const getTournamentDate = (dateStr: string, regCloseDateStr: string) => {
        const dateParts = dateStr.split(' - ')[0].split('/');
        const month = parseInt(dateParts[0]) - 1; // 0-indexed
        const day = parseInt(dateParts[1]);

        // Get year from registration close date
        const regCloseDate = new Date(regCloseDateStr);
        let year = regCloseDate.getFullYear();

        // If tournament month is before registration month, it's the next year
        if (month < regCloseDate.getMonth()) {
            year = year + 1;
        }

        const tournamentDate = new Date(year, month, day);
        tournamentDate.setHours(0, 0, 0, 0);
        return tournamentDate;
    };

    // Helper function to format date with year for display
    const formatDateWithYear = (dateStr: string, regCloseDateStr: string) => {
        const parts = dateStr.split(' - ');
        const startParts = parts[0].split('/');
        const month = parseInt(startParts[0]) - 1;
        const day = parseInt(startParts[1]);

        const regCloseDate = new Date(regCloseDateStr);
        let year = regCloseDate.getFullYear();

        if (month < regCloseDate.getMonth()) {
            year = year + 1;
        }

        if (parts.length === 2) {
            // Date range
            const endParts = parts[1].trim().split('/');
            return `${parts[0]} - ${parts[1]}, ${year}`;
        } else {
            // Single date
            return `${dateStr}, ${year}`;
        }
    };

    // Return all tournaments sorted by date (no filtering by school year)
    return allTournaments
        .map(tournament => ({
            ...tournament,
            tournamentDate: getTournamentDate(tournament.date, tournament.registrationCloseDate)
        }))
        .sort((a, b) => {
            return a.tournamentDate.getTime() - b.tournamentDate.getTime();
        })
        .map(({ name, url, date, registrationCloseDate }) => ({
            name,
            url,
            date: formatDateWithYear(date, registrationCloseDate),
            registrationCloseDate: registrationCloseDate || ''
        }));
}

/**
 * Main export function that tries to scrape live data from Tabroom.com
 * Falls back to hardcoded tournament list if scraping fails
 */
export async function scrapeTabroomTournaments(): Promise<ScrapedTournament[]> {
    console.log('Attempting to scrape live tournaments from Tabroom.com...');

    // Try live scraping first
    const liveTournaments = await scrapeLiveTournaments();

    if (liveTournaments.length > 0) {
        console.log(`Successfully scraped ${liveTournaments.length} live tournaments`);
        return liveTournaments;
    }

    // Fall back to hardcoded list if live scraping fails
    console.log('Live scraping failed or returned no results, using hardcoded fallback');
    return getHardcodedTournaments();
}

    

    




    

    

    

    
