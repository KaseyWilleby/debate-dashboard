"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, ExternalLink, FileText, Clock, Users, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useDocument, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Tournament } from "@/lib/types";
import { format, parse, isBefore, startOfDay } from "date-fns";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function TournamentDetailsPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;
  const teamSlug = params.teamSlug as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();

  // Fetch tournament from Firestore
  const tournamentRef = useMemoFirebase(() => {
    if (!firestore || !tournamentId) return null;
    return doc(firestore, 'tournaments', tournamentId);
  }, [firestore, tournamentId]);

  const { data: tournament, isLoading: isTournamentLoading } = useDocument<Tournament>(tournamentRef);
  const isLoading = isAuthLoading || isTournamentLoading;

  // Check if tournament is in the past
  const isPastTournament = React.useMemo(() => {
    if (!tournament) return false;
    try {
      const tournamentDate = parse(tournament.date, 'yyyy-MM-dd', new Date());
      return isBefore(tournamentDate, startOfDay(new Date()));
    } catch {
      return false;
    }
  }, [tournament]);

  // Get user's entry info
  const userEntry = React.useMemo(() => {
    if (!tournament || !user) return null;
    return tournament.entries?.find(e => e.id === user.id);
  }, [tournament, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${teamSlug}/dashboard/tournament-calendar`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calendar
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Tournament Not Found</h3>
            <p className="text-sm text-muted-foreground">
              This tournament may have been deleted or you don't have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tournamentDate = parse(tournament.date, 'yyyy-MM-dd', new Date());
  const isValidDate = !isNaN(tournamentDate.getTime());

  return (
    <div className="flex flex-col gap-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${teamSlug}/dashboard/tournament-calendar`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calendar
          </Link>
        </Button>
      </div>

      {/* Tournament Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold font-headline">{tournament.name}</h1>
            {isPastTournament && (
              <Badge variant="outline">Past Tournament</Badge>
            )}
          </div>
          <div className="flex flex-col gap-1 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {isValidDate
                  ? format(tournamentDate, 'EEEE, MMMM d, yyyy')
                  : `Invalid Date: ${tournament.date}`
                }
              </span>
            </div>
            {tournament.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{tournament.location}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {tournament.webpageUrl && (
            <>
              <Button variant="outline" asChild>
                <a href={tournament.webpageUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  Tournament Page
                </a>
              </Button>
              <Button variant="default" asChild>
                <a
                  href={tournament.webpageUrl.includes('/index.mhtml')
                    ? tournament.webpageUrl.replace('/index.mhtml', '/tab.mhtml')
                    : `${tournament.webpageUrl}/tab.mhtml`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Schedule
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tournament Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Registration Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournament.registrationCloseDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Registration Closes</p>
                <p className="text-lg">
                  {format(parse(tournament.registrationCloseDate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
            {userEntry && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Your Registration</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Events:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {userEntry.events.map((event) => (
                        <Badge key={event} variant="secondary">{event}</Badge>
                      ))}
                    </div>
                  </div>
                  {userEntry.hotel && (
                    <div>
                      <p className="text-sm font-medium">Hotel:</p>
                      <p className="text-sm text-muted-foreground">{userEntry.hotel}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!userEntry && (
              <div className="text-sm text-muted-foreground">
                You are not registered for this tournament
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tournament Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Tournament Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournament.entries && tournament.entries.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Team Participants</p>
                <p className="text-lg">{tournament.entries.length} student{tournament.entries.length !== 1 ? 's' : ''} registered</p>
              </div>
            )}
            {tournament.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{tournament.notes}</p>
              </div>
            )}
            {tournament.webpageUrl && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tournament Website</p>
                <a
                  href={tournament.webpageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {tournament.webpageUrl.replace('https://', '').replace('http://', '')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional tournament details can be added here */}
      {tournament.entries && tournament.entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registered Students</CardTitle>
            <CardDescription>
              {tournament.entries.length} student{tournament.entries.length !== 1 ? 's' : ''} from your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tournament.entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">{entry.name}</p>
                  </div>
                  {entry.events && entry.events.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Events:</p>
                      <div className="flex flex-wrap gap-2">
                        {entry.events.map((event) => (
                          <Badge key={event} variant="outline">{event}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {entry.hotel && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Hotel: {entry.hotel}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
