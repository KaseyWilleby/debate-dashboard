
"use client";

import * as React from "react";
import type { Tournament } from "@/lib/types";
import { useParams, notFound, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Calendar, ExternalLink, Globe, Loader2, DollarSign, FileDown, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/auth-context";
import TournamentPaperworkChecklist from "@/components/dashboard/tournament-paperwork-checklist";

export default function TournamentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { firestore, firebaseApp } = useFirebase();
  const { user } = useAuth();

  const [isFetchingFees, setIsFetchingFees] = React.useState(false);

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
  const isAdmin = user?.role === 'admin';

  const handleFetchFeeSheet = async () => {
    // Debug logging
    console.log('Tournament data:', {
      id: tournament.id,
      name: tournament.name,
      webpageUrl: tournament.webpageUrl,
    });
    console.log('User data:', {
      id: user?.id,
      name: user?.name,
      tabroomEmail: user?.tabroomEmail,
      tabroomPassword: user?.tabroomPassword ? '***' : undefined,
      tabroomChapterId: user?.tabroomChapterId,
    });

    // Check each field individually for better error messages
    const missingFields = [];
    if (!tournament.webpageUrl) missingFields.push('Tournament webpage URL');
    if (!user?.tabroomEmail) missingFields.push('Tabroom email');
    if (!user?.tabroomPassword) missingFields.push('Tabroom password');
    if (!user?.tabroomChapterId) missingFields.push('Tabroom chapter ID');

    if (missingFields.length > 0) {
      alert(`Missing required fields:\n${missingFields.join('\n')}\n\nPlease add these to your Firestore user document and refresh the page.`);
      return;
    }

    if (!firebaseApp) {
      alert('Firebase not initialized');
      return;
    }

    setIsFetchingFees(true);
    try {
      // Call Cloud Function
      const functions = getFunctions(firebaseApp);
      const fetchTabroomFeeSheetFn = httpsCallable(functions, 'fetchTabroomFeeSheet');

      const result = await fetchTabroomFeeSheetFn({
        tournamentUrl: tournament.webpageUrl,
        tournamentName: tournament.name,
        email: user.tabroomEmail,
        password: user.tabroomPassword,
        chapterId: user.tabroomChapterId,
      });

      const feeSheet = result.data as any;

      // Update tournament with fee sheet
      if (firestore) {
        await updateDoc(doc(firestore, 'tournaments', tournament.id), {
          feeSheet,
        });
      }

      alert('Fee sheet fetched successfully!');
    } catch (error) {
      console.error('Failed to fetch fee sheet:', error);
      alert(`Failed to fetch fee sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingFees(false);
    }
  };

  const handleDeleteFeeSheet = async () => {
    if (!confirm('Are you sure you want to delete this fee sheet?')) {
      return;
    }

    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'tournaments', tournament.id), {
        feeSheet: null,
      });
      alert('Fee sheet deleted successfully!');
    } catch (error) {
      console.error('Failed to delete fee sheet:', error);
      alert('Failed to delete fee sheet. Please try again.');
    }
  };

  const handleTournamentUpdate = async (updatedTournament: Tournament) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'tournaments', tournament.id), {
        paperwork: updatedTournament.paperwork,
      });
    } catch (error) {
      console.error('Failed to update tournament:', error);
      alert('Failed to update tournament. Please try again.');
    }
  };

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
          <Tabs defaultValue="entries" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="entries">Entries</TabsTrigger>
              {isAdmin && <TabsTrigger value="fees">Fee Sheet</TabsTrigger>}
              {isAdmin && <TabsTrigger value="paperwork">Paperwork</TabsTrigger>}
            </TabsList>

            <TabsContent value="entries" className="mt-6">
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
            </TabsContent>

            {isAdmin && (
              <TabsContent value="fees" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="font-headline text-xl">Fee Sheet</CardTitle>
                        <CardDescription>
                          Fetch and manage tournament fees from Tabroom
                        </CardDescription>
                      </div>
                      <Button
                        onClick={handleFetchFeeSheet}
                        disabled={isFetchingFees || !tournament.webpageUrl}
                      >
                        {isFetchingFees ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...</>
                        ) : (
                          <><RefreshCw className="mr-2 h-4 w-4" /> Fetch Fee Sheet</>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tournament.feeSheet ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileDown className="h-6 w-6 text-green-600" />
                            <div>
                              <p className="font-semibold text-lg">
                                Fee Sheet PDF
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Fetched on {format(new Date(tournament.feeSheet.uploadedAt), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={tournament.feeSheet.pdfUrl} target="_blank" rel="noopener noreferrer" download>
                                <FileDown className="mr-2 h-4 w-4" /> Download
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleDeleteFeeSheet}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                          </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                          <iframe
                            src={tournament.feeSheet.pdfUrl}
                            className="w-full h-full"
                            title="Fee Sheet PDF"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No fee sheet available yet.</p>
                        <p className="text-sm mt-2">Click "Fetch Fee Sheet" to retrieve tournament fees from Tabroom.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="paperwork" className="mt-6">
                <TournamentPaperworkChecklist
                  tournament={tournament}
                  onUpdate={handleTournamentUpdate}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
