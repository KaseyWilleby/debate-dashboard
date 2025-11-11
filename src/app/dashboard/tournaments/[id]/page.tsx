
"use client";

import * as React from "react";
import type { Tournament } from "@/lib/types";
import { useParams, notFound, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar, ExternalLink, Globe, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

export default function TournamentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { firestore } = useFirebase();

  const tournamentDocRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'tournaments', id);
  }, [firestore, id]);

  const { data: tournament, isLoading } = useDoc<Tournament>(tournamentDocRef);
  
  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!tournament) {
    notFound();
  }
  
  const registrationClosed = tournament.registrationCloseDate && new Date(tournament.registrationCloseDate) < new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-3xl">{tournament.name}</CardTitle>
              <CardDescription className="mt-2 text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(new Date(tournament.date), "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </div>
            <div className="flex-shrink-0 space-y-2 text-right">
              {tournament.registrationCloseDate && (
                <Badge className={cn("text-sm", registrationClosed ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800")}>
                    Registration Closes: {format(new Date(tournament.registrationCloseDate), "MMMM d, yyyy")}
                </Badge>
              )}
               <div className="flex items-center justify-end gap-2">
                    {tournament.webpageUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={tournament.webpageUrl} target="_blank" rel="noopener noreferrer">
                          <Globe className="mr-2 h-4 w-4" /> Webpage
                        </a>
                      </Button>
                    )}
                    {tournament.scheduleUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={tournament.scheduleUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" /> Schedule
                        </a>
                      </Button>
                    )}
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Tournament Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.entries.length > 0 ? (
                <ul className="space-y-4">
                  {tournament.entries.map(entry => (
                    <li key={entry.id} className="p-4 rounded-lg bg-muted/50 border">
                      <p className="font-semibold text-md">{entry.name}</p>
                      <p className="text-sm text-muted-foreground font-medium mt-2 mb-1">Events:</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.events.map(event => <Badge key={event} variant="secondary">{event}</Badge>)}
                      </div>

                      {entry.partnerships && entry.partnerships.length > 0 && (
                        <>
                          <p className="text-sm text-muted-foreground font-medium mt-3 mb-1">Partnerships:</p>
                          <ul className="space-y-1 pl-2">
                            {entry.partnerships.map(p => (
                              <li key={p.event} className="text-sm">
                                <span className="font-semibold">{p.event}:</span>
                                <span className="text-muted-foreground ml-2">
                                  {p.partnerNames && p.partnerNames.length > 0 
                                    ? p.partnerNames.join(', ') 
                                    : <span className="italic">No partner selected</span>
                                  }
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No entries have been added for this tournament yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
