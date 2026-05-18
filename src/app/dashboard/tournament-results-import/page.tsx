"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import type { Tournament, TournamentResult, User } from "@/lib/types";
import { fetchAuthenticatedTournamentResults } from "@/ai/flows/fetch-authenticated-tournament-results-flow";
import { Loader2, Download, CheckCircle, AlertCircle, Trophy, Users as UsersIcon, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import type { RoundBallot } from "@/lib/types";

/**
 * Component for displaying a tournament result with expandable round details
 */
function ResultCard({ result, matched }: { result: any; matched?: boolean }) {
  const [showRounds, setShowRounds] = React.useState(false);
  const [selectedRound, setSelectedRound] = React.useState<RoundBallot | null>(null);

  const hasRounds = (result.preliminaryRounds && result.preliminaryRounds.length > 0) ||
                    (result.eliminationRounds && result.eliminationRounds.length > 0);

  // Determine if this is a debate event (has speaker points) or speech/other event (has rankings)
  // Debate events: CX, CCX, VCX, NCX, LD, VLD, CLD, NLD, PF, NPF, VPF, CPF, WSD
  // Speech events: HI, DI, DUO, DA, PR, PO, DX, USX, FX, IX, INFO, OO, POI, SC, CD
  const isDebateEvent = /^(CCX|VCX|NCX|CX|VLD|CLD|NLD|LD|NPF|VPF|CPF|PF|WSD)$/i.test(result.event);

  // Remove F1/F2 side indicators from round names
  const cleanRoundName = (roundName: string) => {
    return roundName.replace(/\s*F[12]\s*$/i, '').trim();
  };

  // Extract short round names for badges (e.g., "Trips" from "Trips F1")
  const getShortRoundName = (roundName: string) => {
    const cleaned = cleanRoundName(roundName);
    if (/trips/i.test(cleaned)) return 'Trips';
    if (/double.*octas/i.test(cleaned)) return 'Double Octos';
    if (/octas/i.test(cleaned)) return 'Octos';
    if (/quarters/i.test(cleaned)) return 'Quarters';
    if (/semis/i.test(cleaned)) return 'Semis';
    if (/finals/i.test(cleaned)) return 'Finals';
    return cleaned;
  };

  return (
    <div
      className={`rounded-lg border ${
        matched !== undefined
          ? matched
            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
          : result.userId
          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1">
          {matched !== undefined ? (
            matched ? (
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            )
          ) : result.userId ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-medium">{result.studentName}</p>
            <p className="text-sm text-muted-foreground">
              {result.event}
            </p>
            <div className="flex gap-2 flex-wrap mt-1">
              {result.preliminaryRecord && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                  Prelims: {result.preliminaryRecord}
                </span>
              )}
              {result.eliminationRounds && result.eliminationRounds.length > 0 && result.eliminationRounds.map((round: RoundBallot, idx: number) => (
                <span key={idx} className={`text-xs px-2 py-0.5 rounded ${
                  round.result === 'win'
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {getShortRoundName(round.roundName)}: {round.result === 'win' ? 'W' : 'L'}
                  {round.ballotsWon !== undefined && round.judgeCount && ` (${round.ballotsWon}-${round.judgeCount - round.ballotsWon})`}
                </span>
              ))}
              {result.placementDetail && (
                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                  {result.placementDetail}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={matched !== undefined ? (matched ? "default" : "secondary") : (result.userId ? "default" : "secondary")}>
            {matched !== undefined ? (matched ? `Matched by ${result.matchedBy}` : "Saved (no profile)") : (result.userId ? "Matched" : "No profile")}
          </Badge>
          {hasRounds && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRounds(!showRounds)}
              className="h-8 w-8 p-0"
            >
              {showRounds ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {showRounds && hasRounds && (
        <div className="border-t p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Preliminary Rounds */}
            {result.preliminaryRounds && result.preliminaryRounds.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Preliminary Rounds</h4>
                <div className="space-y-1">
                  {result.preliminaryRounds.map((round: RoundBallot, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedRound(round)}
                      className="w-full text-xs flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-medium">{cleanRoundName(round.roundName)}</span>
                      <div className="flex gap-2 items-center">
                        {isDebateEvent && round.individualSpeakerPoints && round.individualSpeakerPoints.length > 0 ? (
                          <span className="text-muted-foreground">{round.individualSpeakerPoints.join(', ')}</span>
                        ) : isDebateEvent && round.speakerPoints !== undefined ? (
                          <span className="text-muted-foreground">{round.speakerPoints}</span>
                        ) : null}
                        {isDebateEvent && (
                          <Badge variant={round.result === 'win' ? 'default' : round.result === 'loss' ? 'destructive' : 'secondary'} className="text-xs">
                            {round.result.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Elimination Rounds */}
            {result.eliminationRounds && result.eliminationRounds.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Elimination Rounds</h4>
                <div className="space-y-1">
                  {result.eliminationRounds.map((round: RoundBallot, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedRound(round)}
                      className="w-full text-xs flex justify-between items-center p-2 bg-white dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-medium">{cleanRoundName(round.roundName)}</span>
                      <div className="flex gap-2 items-center">
                        {isDebateEvent && round.individualSpeakerPoints && round.individualSpeakerPoints.length > 0 ? (
                          <span className="text-muted-foreground">{round.individualSpeakerPoints.join(', ')}</span>
                        ) : isDebateEvent && round.speakerPoints !== undefined ? (
                          <span className="text-muted-foreground">{round.speakerPoints}</span>
                        ) : null}
                        {round.ballotsWon !== undefined && round.judgeCount && (
                          <span className="text-muted-foreground">({round.ballotsWon}-{round.judgeCount - round.ballotsWon})</span>
                        )}
                        {isDebateEvent && (
                          <Badge variant={round.result === 'win' ? 'default' : round.result === 'loss' ? 'destructive' : 'secondary'} className="text-xs">
                            {round.result.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Round RFD */}
          {selectedRound && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-sm">{cleanRoundName(selectedRound.roundName)} - Feedback</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRound(null)}
                  className="h-6 w-6 p-0"
                >
                  ✕
                </Button>
              </div>
              {selectedRound.judge && (
                <p className="text-xs text-muted-foreground mb-2">Judge: {selectedRound.judge}</p>
              )}
              {isDebateEvent && selectedRound.individualSpeakerPoints && selectedRound.individualSpeakerPoints.length > 0 ? (
                <p className="text-xs text-muted-foreground mb-2">Speaker Points: {selectedRound.individualSpeakerPoints.join(', ')}</p>
              ) : isDebateEvent && selectedRound.speakerPoints !== undefined ? (
                <p className="text-xs text-muted-foreground mb-2">Speaker Points: {selectedRound.speakerPoints}</p>
              ) : null}
              {selectedRound.rfd ? (
                <div>
                  <p className="text-xs font-medium mb-1">Comments:</p>
                  <p className="text-xs whitespace-pre-wrap">{selectedRound.rfd}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No comments available for this round</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TournamentResultsImportPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = React.useState<string>("");
  const [importedResults, setImportedResults] = React.useState<any[]>([]);
  const [importStatus, setImportStatus] = React.useState<'idle' | 'fetching' | 'matching' | 'saving' | 'complete'>('idle');

  // Queries
  const allResultsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tournamentResults');
  }, [firestore]);
  const { data: allResults } = useCollection<TournamentResult>(allResultsQuery);

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'tournaments');
  }, [firestore, user]);
  const { data: tournaments } = useCollection<Tournament>(tournamentsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users');
  }, [firestore, user]);
  const { data: users } = useCollection<User>(usersQuery);

  // Filter to past tournaments
  const pastTournaments = React.useMemo(() => {
    if (!tournaments) return [];
    const today = new Date();
    return tournaments
      .filter(t => parseISO(t.date) < today)
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [tournaments]);

  const selectedTournament = pastTournaments.find(t => t.id === selectedTournamentId);

  /**
   * Match student to user ID by NSDA ID or name
   */
  const matchStudentToUser = (studentName: string, nsdaId?: string): string | null => {
    if (!users || !studentName) return null;

    // Priority 1: Match by NSDA ID if provided
    if (nsdaId) {
      const match = users.find(u => u.nsdaId === nsdaId);
      if (match) return match.id;
    }

    // Priority 2: Try exact name match
    const normalized = studentName.toLowerCase().trim();
    let match = users.find(u => u.name.toLowerCase() === normalized);
    if (match) return match.id;

    // Priority 3: Try first name + last name match
    const parts = normalized.split(' ');
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];

      match = users.find(u => {
        const uParts = u.name.toLowerCase().split(' ');
        return uParts[0] === firstName && uParts[uParts.length - 1] === lastName;
      });
      if (match) return match.id;
    }

    return null;
  };

  /**
   * Import results for selected tournament
   */
  const handleImportResults = async () => {
    if (!selectedTournament || !firestore || !users) {
      toast({
        title: "Error",
        description: "Please select a tournament first",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportStatus('fetching');
    setImportedResults([]);

    try {
      // Check if Tabroom credentials are set
      if (!user.tabroomEmail || !user.tabroomPassword) {
        toast({
          title: "Tabroom Credentials Required",
          description: "Please add your Tabroom credentials in Settings before importing results.",
          variant: "destructive",
        });
        setIsImporting(false);
        setImportStatus('idle');
        return;
      }

      // Fetch results from Tabroom using authenticated access
      const tournamentUrl = selectedTournament.webpageUrl || `https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=${selectedTournament.id}`;

      const resultsData = await fetchAuthenticatedTournamentResults({
        tournamentUrl,
        tabroomEmail: user.tabroomEmail,
        tabroomPassword: user.tabroomPassword,
        tabroomChapterId: user.tabroomChapterId || "26837",
        schoolName: "Cypress Woods", // Match Tabroom's school name
        tournamentName: selectedTournament.name,
        tournamentDate: selectedTournament.date,
      });

      if (!resultsData.success) {
        toast({
          title: "Import Failed",
          description: resultsData.error || "Failed to fetch results from Tabroom",
          variant: "destructive",
        });
        setIsImporting(false);
        setImportStatus('idle');
        return;
      }

      if (!resultsData.results || resultsData.results.length === 0) {
        toast({
          title: "No Results Found",
          description: "Could not find any results for this tournament. The tournament may not have results posted yet.",
          variant: "destructive",
        });
        setIsImporting(false);
        setImportStatus('idle');
        return;
      }

      setImportStatus('matching');

      // Match students to user accounts
      const resultsWithUserIds = resultsData.results.map(result => {
        const userId = matchStudentToUser(result.studentName, result.nsdaId);
        return {
          ...result,
          userId,
          matched: !!userId,
          matchedBy: userId ? (result.nsdaId ? 'NSDA ID' : 'Name') : null,
        };
      });

      setImportedResults(resultsWithUserIds);
      setImportStatus('saving');

      // Save matched results to Firestore
      const savedCount = await saveResultsToFirestore(resultsWithUserIds);

      setImportStatus('complete');

      toast({
        title: "Import Complete",
        description: `Successfully imported ${savedCount} results for ${selectedTournament.name}`,
      });

    } catch (error) {
      console.error('Error importing results:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setImportStatus('idle');
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Save results to Firestore
   */
  const saveResultsToFirestore = async (results: any[]): Promise<number> => {
    if (!firestore || !selectedTournamentId || !selectedTournament) return 0;

    let savedCount = 0;

    // First, delete all existing results for this tournament to avoid duplicates
    const existingResultsQuery = query(
      collection(firestore, 'tournamentResults'),
      where('tournamentId', '==', selectedTournamentId)
    );
    const existingResults = await getDocs(existingResultsQuery);
    for (const doc of existingResults.docs) {
      await deleteDoc(doc.ref);
    }

    for (const result of results) {
      // Helper function to create a result document
      const createResultDoc = async (userId: string | null, studentName: string, partnerId: string | null, partnerName: string | undefined) => {
        const resultData: any = {
          tournamentId: selectedTournamentId,
          tournamentName: selectedTournament.name,
          studentName, // Always store the name from Tabroom
          userId: userId || null, // Can be null if not matched yet
          event: result.event,
          placement: result.placement,
          date: selectedTournament.date,
          createdAt: new Date().toISOString(),
        };

        // Only add optional fields if they are defined
        if (result.placementDetail !== undefined) resultData.placementDetail = result.placementDetail;
        if (partnerName !== undefined) {
          resultData.partnerName = partnerName;
          resultData.partnerId = partnerId || null;
        }
        if (result.preliminaryRecord !== undefined) resultData.preliminaryRecord = result.preliminaryRecord;
        if (result.eliminationRecord !== undefined) resultData.eliminationRecord = result.eliminationRecord;
        if (result.preliminaryRounds !== undefined) resultData.preliminaryRounds = result.preliminaryRounds;
        if (result.eliminationRounds !== undefined) resultData.eliminationRounds = result.eliminationRounds;
        if (result.speakerPoints !== undefined) resultData.speakerPoints = result.speakerPoints;
        if (result.averageSpeakerPoints !== undefined) resultData.averageSpeakerPoints = result.averageSpeakerPoints;
        if (result.speakerRank !== undefined) resultData.speakerRank = result.speakerRank;
        if (result.totalCompetitors !== undefined) resultData.totalCompetitors = result.totalCompetitors;
        if (result.breakingCompetitors !== undefined) resultData.breakingCompetitors = result.breakingCompetitors;
        if (result.notes !== undefined) resultData.notes = result.notes;
        if (result.nsdaId !== undefined) resultData.nsdaId = result.nsdaId;

        await addDoc(collection(firestore, 'tournamentResults'), resultData);
        savedCount++;
      };

      // Create result for the primary student
      const partnerId = result.partnerName ? matchStudentToUser(result.partnerName, undefined) || null : null;
      await createResultDoc(result.userId, result.studentName, partnerId, result.partnerName);

      // If this is a team event with a partner, create a duplicate result for the partner
      if (result.partnerName && partnerId) {
        await createResultDoc(partnerId, result.partnerName, result.userId, result.studentName);
      }
    }

    return savedCount;
  };

  /**
   * Clear all tournament results
   */
  const handleClearAllResults = async () => {
    if (!firestore) return;

    // Confirm before clearing
    if (!window.confirm('Are you sure you want to delete ALL tournament results? This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);

    try {
      const resultsQuery = collection(firestore, 'tournamentResults');
      const snapshot = await getDocs(resultsQuery);

      if (snapshot.empty) {
        toast({
          title: "No Results to Clear",
          description: "There are no tournament results in the database.",
        });
        setIsClearing(false);
        return;
      }

      // Delete all results
      let deletedCount = 0;
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
        deletedCount++;
      }

      toast({
        title: "Results Cleared",
        description: `Successfully deleted ${deletedCount} tournament results.`,
      });

    } catch (error) {
      console.error('Error clearing results:', error);
      toast({
        title: "Clear Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only administrators can import tournament results.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Tournament Results Import</h1>
        <p className="text-muted-foreground">
          Import all Cy-Woods tournament results from Tabroom.com and match them to student accounts.
        </p>
      </div>

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
          <p className="text-sm">
            This tool uses your Tabroom.com credentials to fetch <strong>all Cy-Woods student results</strong> and match them to student accounts:
          </p>
          <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
            <li>Add your Tabroom credentials in <strong>Settings</strong> (one-time setup)</li>
            <li>Select a past tournament from the dropdown</li>
            <li>Click "Import Results" to fetch all Cy-Woods entries from your account</li>
            <li>AI parses the results and extracts individual placements</li>
            <li>Students are matched by <strong>NSDA ID</strong> (most accurate) or name</li>
            <li>Matched results are saved and appear in Analytics Dashboard</li>
          </ol>
          <p className="text-sm mt-3 font-medium">
            💡 Tip: Make sure students have their NSDA IDs filled in their User Management profiles for the most accurate matching.
          </p>
        </CardContent>
      </Card>

      {(!user.tabroomEmail || !user.tabroomPassword) && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  Tabroom Credentials Required
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  Please add your Tabroom.com login credentials in Settings to enable tournament results import. Your credentials are stored securely and only used to fetch team results.
                </p>
                <Button asChild className="mt-3" size="sm">
                  <a href="/dashboard/settings">Go to Settings</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import Results</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Tournament</CardTitle>
              <CardDescription>
                Choose a past tournament to import all Cy-Woods results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tournament</Label>
                <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tournament..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pastTournaments.map(tournament => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name} - {format(parseISO(tournament.date), 'MMM d, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTournament && (
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Tournament:</span>
                    <span className="text-muted-foreground">{selectedTournament.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Date:</span>
                    <span className="text-muted-foreground">
                      {format(parseISO(selectedTournament.date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  {selectedTournament.webpageUrl && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Tabroom URL:</span>
                      <a
                        href={selectedTournament.webpageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        View on Tabroom
                      </a>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleImportResults}
                disabled={!selectedTournamentId || isImporting || !user.tabroomEmail || !user.tabroomPassword}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {importStatus === 'fetching' && 'Fetching all Cy-Woods results from Tabroom...'}
                    {importStatus === 'matching' && 'Matching students by NSDA ID and name...'}
                    {importStatus === 'saving' && 'Saving results to database...'}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Import All Cy-Woods Results
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {user.tabroomEmail && user.tabroomPassword
                  ? 'Results will be fetched using your Tabroom account'
                  : 'Add Tabroom credentials in Settings to enable import'}
              </p>
            </CardContent>
          </Card>

          {importedResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
                <CardDescription>
                  Successfully imported {importedResults.length} results ({importedResults.filter(r => r.matched).length} matched to student accounts, {importedResults.filter(r => !r.matched).length} saved with names only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {importedResults.map((result, index) => (
                    <ResultCard key={index} result={result} matched={result.matched} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>All Imported Results</CardTitle>
                  <CardDescription>
                    {allResults ? `${allResults.length} total results (${allResults.filter(r => r.userId).length} matched to students, ${allResults.filter(r => !r.userId).length} unmatched)` : 'Loading...'}
                  </CardDescription>
                </div>
                {allResults && allResults.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearAllResults}
                    disabled={isClearing}
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All Results
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!allResults || allResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Trophy className="h-12 w-12 mb-3" />
                  <p>No tournament results imported yet</p>
                  <p className="text-sm mt-2">Import a tournament to see results here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {allResults
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((result) => (
                    <ResultCard key={result.id} result={result} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
