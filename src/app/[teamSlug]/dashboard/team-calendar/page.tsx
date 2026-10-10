"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Tournament, Team } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Upload, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "next/navigation";

export default function TeamCalendarPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'superadmin';

  // Get team data
  const teamDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.teamId) return null;
    return doc(firestore, 'teams', user.teamId);
  }, [firestore, user?.teamId]);

  const { data: team } = useDoc<Team>(teamDocRef);

  // Get tournaments for current competition year
  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.teamId) return null;
    // Query tournaments registered by this team
    return query(
      collection(firestore, 'tournaments'),
      where('registeredTeams', 'array-contains', user.teamId)
    );
  }, [firestore, user?.teamId]);

  const { data: tournaments, isLoading: isTournamentsLoading } = useCollection<Tournament>(tournamentsQuery);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storage || !user?.teamId || !firestore) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `teams/${user.teamId}/calendar/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update team document with calendar URL
      const teamRef = doc(firestore, 'teams', user.teamId);
      await updateDoc(teamRef, {
        calendarFileUrl: downloadURL,
        calendarFileName: file.name,
        calendarUploadedAt: new Date().toISOString(),
      });

      toast({
        title: "Calendar Uploaded",
        description: "Team calendar file has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading calendar:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload calendar file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = () => {
    if (team?.calendarFileUrl) {
      window.open(team.calendarFileUrl, '_blank');
    }
  };

  // Create calendar events from tournaments
  const calendarEvents = tournaments?.map(tournament => ({
    id: tournament.id,
    title: tournament.name,
    date: tournament.date,
    location: tournament.location,
    type: 'tournament' as const,
  })) || [];

  // Group events by month
  const eventsByMonth = calendarEvents.reduce((acc, event) => {
    const date = new Date(event.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, typeof calendarEvents>);

  const sortedMonths = Object.keys(eventsByMonth).sort();

  if (isAuthLoading || isTournamentsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Team Calendar</h1>
          <p className="text-muted-foreground">
            View your tournament schedule and team calendar.
          </p>
        </div>
        <div className="flex gap-2">
          {isCoachOrAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,.ical,.pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload Calendar
              </Button>
            </>
          )}
          {team?.calendarFileUrl && (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Calendar
            </Button>
          )}
        </div>
      </div>

      {team?.calendarFileUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Calendar</CardTitle>
            <CardDescription>
              {team.calendarFileName} uploaded on{' '}
              {new Date(team.calendarUploadedAt || '').toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tournament Schedule</CardTitle>
          <CardDescription>
            Tournaments registered for the current competition year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calendarEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="text-lg font-semibold font-headline">No Tournaments</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                No tournaments registered yet for this competition year.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedMonths.map(monthKey => {
                const date = new Date(monthKey + '-01');
                const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const events = eventsByMonth[monthKey];

                return (
                  <div key={monthKey}>
                    <h3 className="text-lg font-semibold mb-3">{monthName}</h3>
                    <div className="space-y-2">
                      {events.map(event => {
                        const eventDate = new Date(event.date);
                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <Calendar className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {eventDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                              {event.location && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  📍 {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
