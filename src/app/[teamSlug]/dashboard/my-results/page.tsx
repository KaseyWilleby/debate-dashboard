"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { TournamentResult } from "@/lib/types";
import { Trophy } from "lucide-react";
import { ResultCard } from "@/components/result-card";

export default function MyResultsPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();

  // Query for user's results
  const resultsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'tournamentResults'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: results } = useCollection<TournamentResult>(resultsQuery);

  // Sort results by date (newest first)
  const sortedResults = React.useMemo(() => {
    if (!results) return [];
    return [...results].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [results]);

  // Group by tournament
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, TournamentResult[]> = {};
    for (const result of sortedResults) {
      if (!groups[result.tournamentId]) {
        groups[result.tournamentId] = [];
      }
      groups[result.tournamentId].push(result);
    }
    return groups;
  }, [sortedResults]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Please Sign In</h2>
        <p className="text-muted-foreground">Sign in to view your tournament results</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">My Tournament Results</h1>
        <p className="text-muted-foreground">
          View all your competition results and performance records
        </p>
      </div>

      {!results || results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tournament results yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your results will appear here once your coach imports tournament data
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([tournamentId, tournamentResults]) => (
            <div key={tournamentId} className="space-y-3">
              <h2 className="text-xl font-semibold">{tournamentResults[0].tournamentName}</h2>
              <div className="grid gap-3">
                {tournamentResults.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
