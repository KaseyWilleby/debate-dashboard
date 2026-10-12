"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Calendar, Database, Settings, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { refreshTournamentDatabase } from "@/app/actions/scrape-tournaments-action";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, collection, writeBatch, deleteDoc, getDocs } from "firebase/firestore";
import type { ScrapedTournament } from "@/lib/types";

export default function TournamentScraperPage() {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isScraping, setIsScraping] = React.useState(false);

  // Settings
  const [autoScrapeEnabled, setAutoScrapeEnabled] = React.useState(true);
  const [scrapeFrequency, setScrapeFrequency] = React.useState('weekly');

  // Load metadata from Firestore
  const metadataDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'metadata', 'tournamentScraper');
  }, [firestore]);

  const { data: metadata, isLoading } = useDoc<{ lastScraped: string; tournamentCount: number }>(metadataDocRef);

  const handleManualScrape = async () => {
    if (!firestore) {
      toast({
        title: "Error",
        description: "Firestore not initialized",
        variant: "destructive",
      });
      return;
    }

    setIsScraping(true);
    try {
      toast({
        title: "Scraping Started",
        description: "This may take 30-60 seconds. Please wait...",
      });

      // Call server action to scrape tournaments
      const result = await refreshTournamentDatabase();

      if (result.success && result.tournaments) {
        // Save tournaments to Firestore using client SDK
        toast({
          title: "Saving to Database",
          description: `Scraped ${result.count} tournaments. Now saving to Firestore...`,
        });

        const batch = writeBatch(firestore);
        const scrapedTournamentsRef = collection(firestore, 'scrapedTournaments');

        // Delete old tournaments first
        const oldTournaments = await getDocs(scrapedTournamentsRef);
        oldTournaments.docs.forEach((docSnapshot) => {
          batch.delete(docSnapshot.ref);
        });

        // Add new tournaments
        for (const tournament of result.tournaments) {
          // Create a valid Firestore document ID from the URL
          const tournId = tournament.url
            .replace('https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=', '')
            .replace('https://www.tabroom.com/index/tourn/main.mhtml?tourn_id=', '')
            .replace(/[^a-zA-Z0-9]/g, '_');

          const tournamentDoc = doc(scrapedTournamentsRef, tournId);
          batch.set(tournamentDoc, {
            ...tournament,
            lastScraped: result.lastScraped,
          });
        }

        // Update metadata
        const metadataDoc = doc(firestore, 'metadata', 'tournamentScraper');
        batch.set(metadataDoc, {
          lastScraped: result.lastScraped,
          tournamentCount: result.count,
        });

        await batch.commit();

        toast({
          title: "Scraping Complete!",
          description: `Successfully scraped and saved ${result.count} tournaments from Tabroom.com`,
        });
      } else {
        toast({
          title: "Scraping Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Scraping error:', error);
      toast({
        title: "Scraping Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Tournament Scraper</h1>
        <p className="text-muted-foreground">
          Manage automatic tournament scraping from Tabroom.com
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Scraper Status
              </CardTitle>
              <CardDescription className="mt-1">
                Current state of the tournament database
              </CardDescription>
            </div>
            <Button
              onClick={handleManualScrape}
              disabled={isScraping}
              size="lg"
            >
              {isScraping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Scrape Now
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : metadata ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label className="text-sm text-muted-foreground">Last Scraped</Label>
                <div className="text-2xl font-bold">
                  {formatDistanceToNow(new Date(metadata.lastScraped), { addSuffix: true })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(metadata.lastScraped).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm text-muted-foreground">Tournament Count</Label>
                <div className="text-2xl font-bold text-green-600">
                  {metadata.tournamentCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tournaments in database
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-semibold text-green-600">Operational</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Database ready
                </p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Data Available</AlertTitle>
              <AlertDescription>
                Tournament database has not been scraped yet. Click "Scrape Now" to populate the database.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Scraper Settings
          </CardTitle>
          <CardDescription>
            Configure automatic scraping behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-scrape">Automatic Scraping</Label>
              <p className="text-sm text-muted-foreground">
                Enable scheduled automatic scraping from Tabroom.com
              </p>
            </div>
            <Switch
              id="auto-scrape"
              checked={autoScrapeEnabled}
              onCheckedChange={setAutoScrapeEnabled}
            />
          </div>

          {autoScrapeEnabled && (
            <div className="space-y-2">
              <Label htmlFor="frequency">Scrape Frequency</Label>
              <Select value={scrapeFrequency} onValueChange={setScrapeFrequency}>
                <SelectTrigger id="frequency" className="w-full md:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (Recommended)</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Weekly scraping is recommended to keep tournament data fresh without overwhelming Tabroom.com
              </p>
            </div>
          )}

          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Note</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Automatic scraping requires Cloud Scheduler setup. These settings will be saved but won't take effect until Cloud Scheduler is configured. For now, use the "Scrape Now" button to manually update the tournament database.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              1
            </div>
            <div>
              <p className="font-medium">Multi-State Scraping</p>
              <p className="text-sm text-muted-foreground">
                Scrapes tournaments from 33 different states to ensure comprehensive nationwide coverage
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              2
            </div>
            <div>
              <p className="font-medium">Database Storage</p>
              <p className="text-sm text-muted-foreground">
                All tournaments are saved to Firestore for instant loading across all users
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              3
            </div>
            <div>
              <p className="font-medium">Deduplication</p>
              <p className="text-sm text-muted-foreground">
                Automatically removes duplicate tournaments found across multiple state pages
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              4
            </div>
            <div>
              <p className="font-medium">Metadata Extraction</p>
              <p className="text-sm text-muted-foreground">
                Extracts tournament name, dates, location, circuits (TFA, NIETOC, TOC, NSDA, UIL, NCFL)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
