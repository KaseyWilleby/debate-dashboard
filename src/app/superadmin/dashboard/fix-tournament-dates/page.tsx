"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { parse, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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

interface FixResult {
  tournament: string;
  status: 'fixed' | 'error' | 'skipped';
  oldDate?: string;
  newDate?: string;
  reason?: string;
}

export default function FixTournamentDatesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isFixing, setIsFixing] = React.useState(false);
  const [results, setResults] = React.useState<FixResult[]>([]);
  const [summary, setSummary] = React.useState<{
    fixed: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const fixTournamentDates = async () => {
    if (!firestore) {
      toast({
        title: "Error",
        description: "Firestore not initialized",
        variant: "destructive",
      });
      return;
    }

    setIsFixing(true);
    setResults([]);
    setSummary(null);

    try {
      console.log('🔍 Starting tournament date fix...\n');

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
      const resultsList: FixResult[] = [];

      // Process each tournament
      for (const docSnapshot of tournamentsSnapshot.docs) {
        const tournament = { id: docSnapshot.id, ...docSnapshot.data() } as Tournament;

        // Check if date is today (indicates it was incorrectly saved)
        if (tournament.date === today) {
          console.log(`\n❌ Found tournament with today's date: ${tournament.name}`);

          // Try to find matching scraped tournament
          const scrapedTournament = tournament.webpageUrl
            ? scrapedTournaments.get(tournament.webpageUrl)
            : null;

          if (scrapedTournament) {
            try {
              // Parse the scraped tournament date
              let dateStr = scrapedTournament.date.trim();

              // Handle date ranges: "11/13 - 11/14" -> use first date "11/13"
              if (dateStr.includes(' - ')) {
                dateStr = dateStr.split(' - ')[0].trim();
              }

              // Remove comma if present
              dateStr = dateStr.replace(',', '').trim();

              // Determine the year for the tournament
              // If the month is in the past (relative to October), assume next year
              // Otherwise use current year
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              const currentMonth = currentDate.getMonth() + 1; // 0-indexed

              // Extract month from date string
              const monthMatch = dateStr.match(/^(\d+)\//);
              const tournamentMonth = monthMatch ? parseInt(monthMatch[1]) : null;

              let year = currentYear;
              if (tournamentMonth) {
                // If we're in October (10) and tournament is in earlier months, it's next year
                // If tournament is in later months (Nov-Dec), it's this year
                if (currentMonth === 10 && tournamentMonth < 10) {
                  year = currentYear + 1;
                } else if (currentMonth > 10 && tournamentMonth < currentMonth) {
                  year = currentYear + 1;
                }
              }

              // Add year to date string if not present
              if (!dateStr.includes(year.toString())) {
                dateStr = `${dateStr} ${year}`;
              }

              const parsedDate = parse(dateStr, 'M/d yyyy', new Date());

              if (isNaN(parsedDate.getTime())) {
                console.log(`   ⚠️  Could not parse scraped date: ${scrapedTournament.date} -> ${dateStr}`);
                resultsList.push({
                  tournament: tournament.name,
                  status: 'error',
                  reason: `Could not parse date: ${scrapedTournament.date}`
                });
                errorCount++;
                continue;
              }

              const correctDate = format(parsedDate, 'yyyy-MM-dd');
              console.log(`   ✅ Updating to: ${correctDate} (from: ${scrapedTournament.date})`);

              // Update the tournament
              const tournamentRef = doc(firestore, 'tournaments', tournament.id);
              await updateDoc(tournamentRef, {
                date: correctDate
              });

              console.log(`   ✨ Updated successfully!`);
              resultsList.push({
                tournament: tournament.name,
                status: 'fixed',
                oldDate: tournament.date,
                newDate: correctDate
              });
              fixedCount++;

            } catch (error: any) {
              console.log(`   ❌ Error:`, error.message);
              resultsList.push({
                tournament: tournament.name,
                status: 'error',
                reason: error.message
              });
              errorCount++;
            }
          } else {
            console.log(`   ⚠️  No matching scraped tournament found`);
            resultsList.push({
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

      setResults(resultsList);
      setSummary({
        fixed: fixedCount,
        skipped: skippedCount,
        errors: errorCount
      });

      toast({
        title: "Fix Complete!",
        description: `Fixed ${fixedCount} tournament(s), ${errorCount} error(s), ${skippedCount} skipped`,
      });

    } catch (error: any) {
      console.error('Fatal error:', error);
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Fix Tournament Dates</h1>
        <p className="text-muted-foreground">
          One-time script to fix tournaments that were saved with today's date instead of their actual dates
        </p>
      </div>

      <Alert className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900 dark:text-orange-100">Warning</AlertTitle>
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          This script will update tournaments that have today's date by matching them with scraped tournament data.
          Make sure you have scraped tournaments data in Firestore before running this.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fix Tournament Dates
          </CardTitle>
          <CardDescription>
            Click the button below to scan for and fix tournaments with incorrect dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={fixTournamentDates}
            disabled={isFixing || !firestore}
            size="lg"
          >
            {isFixing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fixing Dates...
              </>
            ) : (
              'Fix Tournament Dates'
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-muted-foreground">Fixed</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {summary.fixed}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Skipped</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.skipped}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-muted-foreground">Errors</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {summary.errors}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
            <CardDescription>
              {results.length} tournament(s) processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  {result.status === 'fixed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{result.tournament}</div>
                    {result.status === 'fixed' && (
                      <div className="text-sm text-muted-foreground">
                        Updated from {result.oldDate} to {result.newDate}
                      </div>
                    )}
                    {result.status === 'error' && (
                      <div className="text-sm text-red-600">
                        {result.reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
