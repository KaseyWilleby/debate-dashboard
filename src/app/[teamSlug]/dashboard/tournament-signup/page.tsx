
"use client";

import * as React from "react";
import type { Tournament, User } from "@/lib/types";
import TournamentSignupCard from "@/components/dashboard/tournament-signup-card";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Loader2, FileText, Users, LayoutGrid, List, ChevronDown } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, TextRun, BorderStyle, HeightRule } from "docx";
import { saveAs } from "file-saver";
import { cn } from "@/lib/utils";

export default function TournamentSignupPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();

  // View mode state
  const [viewMode, setViewMode] = React.useState<'card' | 'list'>(() => {
    if (typeof window === 'undefined') return 'card';
    return (localStorage.getItem('tournament-signup-view-mode') as 'card' | 'list') || 'card';
  });

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('tournament-signup-view-mode', mode);
  };
  
  const tournamentsQuery = useMemoFirebase(() => {
    // All authenticated users should be able to see tournaments
    if (!firestore || !user) return null;
    return collection(firestore, 'tournaments');
  }, [firestore, user]);
  const { data: tournaments, isLoading: areTournamentsLoading } = useCollection<Tournament>(tournamentsQuery);

  const usersQuery = useMemoFirebase(() => {
    // All authenticated users need to fetch users for partner selection
    if (!firestore || !user) return null;
    return collection(firestore, 'users');
  }, [firestore, user]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  const isLoading = isAuthLoading || areTournamentsLoading || areUsersLoading;

  const handleTournamentUpdate = (updatedTournament: Tournament) => {
    if (!firestore) return;
    const tournamentDocRef = doc(firestore, 'tournaments', updatedTournament.id);
    // Only update the entries field to comply with security rules for non-admin users
    updateDoc(tournamentDocRef, { entries: updatedTournament.entries }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: tournamentDocRef.path,
        operation: 'update',
        requestResourceData: updatedTournament
      }));
    });
  };

  // Filter to only show upcoming tournaments (not past)
  const upcomingTournaments = React.useMemo(() => {
    if (!tournaments) return [];

    const today = startOfDay(new Date());

    return tournaments.filter(tournament => {
      const tournamentDate = parseISO(tournament.date);
      // Show tournament if it's today or in the future
      return !isBefore(tournamentDate, today);
    });
  }, [tournaments]);

  const userEntries = React.useMemo(() => {
    if (!user || !upcomingTournaments) return [];
    return upcomingTournaments
      .map(t => {
        const userEntry = t.entries.find(e => e.id === user.id);

        // Check if user is a partner in any entry (for regular tournaments)
        const isPartner = !userEntry && t.entries.some(entry =>
          entry.partnerships.some(p => p.partnerIds.includes(user.id))
        );

        // Check if user is a partner in swing tournament entries
        const isSwingPartner = !userEntry && !isPartner && t.isSwing && t.entries.some(entry =>
          entry.schoolEntries?.some(se =>
            se.partnerships.some(p => p.partnerIds.includes(user.id))
          )
        );

        return {
          ...t,
          userEntry,
          isPartner: isPartner || isSwingPartner,
        };
      })
      .filter(t => t.userEntry || t.isPartner);
  }, [upcomingTournaments, user]);

  const generateAttendanceForm = async (tournament: Tournament) => {
    if (!allUsers) return;

    // Get students signed up for this tournament with their data
    const students = tournament.entries
      .map(entry => {
        const student = allUsers.find(u => u.id === entry.id);
        return student ? {
          name: student.name,
          grade: student.role === 'varsity' ? '11' : '9', // Default grades, adjust as needed
          id: student.studentId || ''
        } : null;
      })
      .filter(s => s !== null);

    // Create header information paragraphs
    const headerRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Date of Trip", bold: true })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph(format(new Date(tournament.date), "MM/dd/yy"))],
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Time of Departure", bold: true })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph(tournament.leaveTime || "TBD")],
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Time of Return", bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph("After School")],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Group/Team", bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph("Speech & Debate")],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Destination", bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph(tournament.name)],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Sponsor", bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph("Kasey Willeby")],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Type of Field Trip (check one)", bold: true })] })],
            columnSpan: 4,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph("FTA (Athletic)     FTI (Instructional)     FTM (Music)     FTR (Ropes)     X FTX (Extracurricular)")],
            columnSpan: 4,
          }),
        ],
      }),
    ];

    // Create student roster table header
    const studentTableHeader = new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: "", alignment: AlignmentType.CENTER })],
          width: { size: 10, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "NAME", bold: true })], alignment: AlignmentType.CENTER })],
          width: { size: 50, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "GRADE", bold: true })], alignment: AlignmentType.CENTER })],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "ID#", bold: true })], alignment: AlignmentType.CENTER })],
          width: { size: 25, type: WidthType.PERCENTAGE },
        }),
      ],
    });

    // Create student rows (29 total rows as in template)
    const studentRows = Array.from({ length: 29 }, (_, i) => {
      const student = students[i];
      return new TableRow({
        height: { value: 400, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            children: [new Paragraph({ text: (i + 1).toString(), alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            children: [new Paragraph(student ? student.name : "")],
          }),
          new TableCell({
            children: [new Paragraph({ text: student ? student.grade : "", alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            children: [new Paragraph({ text: student ? student.id : "", alignment: AlignmentType.CENTER })],
          }),
        ],
      });
    });

    // Create the document
    const doc = new Document({
      sections: [
        {
          children: [
            new Table({
              rows: headerRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
            new Paragraph({
              text: "",
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: "Please e-mail this list to: Attendance Office: (lily.south@cfisd.net)",
              spacing: { after: 200 },
            }),
            new Table({
              rows: [studentTableHeader, ...studentRows],
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          ],
        },
      ],
    });

    // Generate and download the document
    const blob = await Packer.toBlob(doc);
    const fileName = `${tournament.name} ${format(new Date(tournament.date), "MM-dd-yyyy")} Attendance.docx`;
    saveAs(blob, fileName);
  };

  // Track which tournaments have student lists expanded
  const [expandedTournaments, setExpandedTournaments] = React.useState<Set<string>>(new Set());

  const toggleTournamentExpanded = (tournamentId: string) => {
    setExpandedTournaments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tournamentId)) {
        newSet.delete(tournamentId);
      } else {
        newSet.add(tournamentId);
      }
      return newSet;
    });
  };

  // Admin View - Shows who is signed up
  if (user?.role === 'admin') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">Tournament Management</h1>
            <p className="text-muted-foreground">
              View tournament sign-ups and generate attendance forms.
            </p>
          </div>
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && handleViewModeChange(value as 'card' | 'list')}>
            <ToggleGroupItem value="card" aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {isLoading ? (
          <Loader2 className="animate-spin m-auto" />
        ) : upcomingTournaments && upcomingTournaments.length > 0 ? (
          viewMode === 'card' ? (
            <div className="space-y-4">
              {upcomingTournaments.map((tournament) => {
              const signupCount = tournament.entries.length;
              const isExpanded = expandedTournaments.has(tournament.id);

              return (
                <Card key={tournament.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="font-headline">{tournament.name}</CardTitle>
                        <CardDescription>
                          {format(new Date(tournament.date), "EEEE, MMMM d, yyyy")}
                          {tournament.leaveTime && <span className="ml-2">• Leave: {tournament.leaveTime}</span>}
                        </CardDescription>
                        {tournament.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{tournament.notes}</p>
                        )}
                      </div>
                      <Button onClick={() => generateAttendanceForm(tournament)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Attendance Form
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Collapsible open={isExpanded} onOpenChange={() => toggleTournamentExpanded(tournament.id)}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-accent/50 p-2 rounded-md transition-colors">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{signupCount} {signupCount === 1 ? 'Student' : 'Students'} Signed Up</span>
                        <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                      </CollapsibleTrigger>

                      {signupCount > 0 && (
                        <CollapsibleContent className="pt-4">
                          <Accordion type="single" collapsible className="w-full">
                          {tournament.entries.map((entry) => {
                            const student = allUsers?.find(u => u.id === entry.id);
                            const totalEvents = tournament.isSwing && entry.schoolEntries
                              ? entry.schoolEntries.reduce((sum, se) => sum + se.events.length, 0)
                              : entry.events.length;

                            return (
                              <AccordionItem value={entry.id} key={entry.id}>
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{student?.name || 'Unknown'}</span>
                                    <Badge variant="secondary" className="capitalize">{student?.role || 'N/A'}</Badge>
                                    <Badge variant="outline">{totalEvents} events</Badge>
                                    {entry.dropped && <Badge variant="secondary" className="bg-orange-100 text-orange-800">Dropped</Badge>}
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-3 pt-2">
                                    {tournament.isSwing && entry.schoolEntries && entry.schoolEntries.some(se => se.events.length > 0) ? (
                                      <div className="space-y-4">
                                        {entry.schoolEntries.filter(se => se.events.length > 0).map(schoolEntry => (
                                          <div key={schoolEntry.school} className="space-y-2">
                                            <p className="font-semibold text-sm text-primary">{schoolEntry.school}</p>
                                            <ul className="space-y-2">
                                              {schoolEntry.events.map(event => {
                                                const partnership = schoolEntry.partnerships.find(p => p.event === event);
                                                return (
                                                  <li key={event} className="border-l-2 border-primary pl-3">
                                                    <div className="font-medium text-sm">{event}</div>
                                                    {partnership && partnership.partnerNames && partnership.partnerNames.length > 0 && (
                                                      <div className="text-xs text-muted-foreground mt-1">
                                                        Partner(s): {partnership.partnerNames.join(', ')}
                                                      </div>
                                                    )}
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                          </div>
                                        ))}
                                      </div>
                                    ) : entry.events.length > 0 ? (
                                      <ul className="space-y-2">
                                        {entry.events.map(event => {
                                          const partnership = entry.partnerships.find(p => p.event === event);

                                          return (
                                            <li key={event} className="border-l-2 border-primary pl-3">
                                              <div className="font-medium text-sm">{event}</div>
                                              {partnership && partnership.partnerNames && partnership.partnerNames.length > 0 && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  Partner(s): {partnership.partnerNames.join(', ')}
                                                </div>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No events selected.</p>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          ) : (
            <div className="space-y-2">
              {upcomingTournaments.map((tournament) => {
                const signupCount = tournament.entries.length;

                return (
                  <Card key={tournament.id} className="hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-headline text-base font-semibold truncate">{tournament.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tournament.date), "EEEE, MMMM d, yyyy")}
                          {tournament.leaveTime && <span className="ml-2">• Leave: {tournament.leaveTime}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {signupCount} {signupCount === 1 ? 'student' : 'students'} signed up
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <Button onClick={() => generateAttendanceForm(tournament)} size="sm">
                          <FileText className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
            <h3 className="text-xl font-semibold font-headline">No Tournaments Available</h3>
            <p className="text-muted-foreground mt-2">
              Create tournaments in the Tournament Scheduler to see them here.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Student View - Original sign-up interface
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Tournament Sign Up</h1>
          <p className="text-muted-foreground">
            Sign up for upcoming tournaments.
          </p>
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && handleViewModeChange(value as 'card' | 'list')}>
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {userEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-lg">My Tournament Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {userEntries.map(({ id, name, date, userEntry, isPartner, entries, isSwing, schoolEntries: tournamentSchoolEntries }) => (
                <AccordionItem value={id} key={id} className="border rounded-md px-4">
                  <AccordionTrigger className="hover:no-underline">
                     <div className="flex-1 text-left">
                        <p className="font-semibold">{name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(date), "EEEE, MMMM d, yyyy")}
                          {isPartner && <span className="ml-2 text-blue-600 dark:text-blue-400">• Registered as Partner</span>}
                        </p>
                     </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="border-t pt-4">
                      {isPartner ? (
                        <div className="text-sm text-muted-foreground">
                          <p className="mb-2">You are registered as a partner in this tournament:</p>
                          <ul className="space-y-2">
                            {entries.map(entry => {
                              const partnershipsWithUser = entry.partnerships.filter(p => p.partnerIds.includes(user?.id || ''));
                              const swingPartnershipsWithUser = entry.schoolEntries?.flatMap(se =>
                                se.partnerships.filter(p => p.partnerIds.includes(user?.id || '')).map(p => ({ ...p, school: se.school }))
                              ) || [];

                              if (partnershipsWithUser.length === 0 && swingPartnershipsWithUser.length === 0) return null;

                              return (
                                <li key={entry.id} className="pl-4 border-l-2 border-blue-500/30">
                                  <p className="font-medium">With: {entry.name}</p>
                                  {partnershipsWithUser.map(p => (
                                    <p key={p.event} className="text-xs">{p.event}</p>
                                  ))}
                                  {swingPartnershipsWithUser.map((p: any) => (
                                    <p key={`${p.school}-${p.event}`} className="text-xs">{p.event} ({p.school})</p>
                                  ))}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : isSwing && userEntry?.schoolEntries && userEntry.schoolEntries.some(se => se.events.length > 0) ? (
                        <div className="space-y-3">
                          {userEntry.schoolEntries.filter(se => se.events.length > 0).map(schoolEntry => (
                            <div key={schoolEntry.school} className="space-y-2">
                              <p className="font-semibold text-sm text-primary">{schoolEntry.school}</p>
                              <ul className="space-y-2">
                                {schoolEntry.events.map(event => {
                                  const partnership = schoolEntry.partnerships.find(p => p.event === event);
                                  return (
                                    <li key={event} className="text-sm pl-4 border-l-2 border-primary/30">
                                      <div className="font-medium">{event}</div>
                                      {partnership && partnership.partnerNames && partnership.partnerNames.length > 0 && (
                                        <div className="pl-2 text-xs text-muted-foreground">
                                          Partner(s): {partnership.partnerNames.join(', ')}
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ) : userEntry?.events && userEntry.events.length > 0 ? (
                        <ul className="space-y-3">
                          {userEntry.events.map(event => {
                             const partnership = userEntry.partnerships.find(p => p.event === event);
                             return (
                                <li key={event} className="text-sm">
                                  <div className="font-medium">{event}</div>
                                  {partnership && partnership.partnerNames && partnership.partnerNames.length > 0 && (
                                     <div className="pl-4 text-xs text-muted-foreground">
                                        Partner(s): {partnership.partnerNames.join(', ')}
                                     </div>
                                  )}
                                </li>
                             )
                          })}
                        </ul>
                      ) : <p className="text-sm text-muted-foreground">No events selected.</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}


      {isLoading ? <Loader2 className="animate-spin m-auto" /> : (
        upcomingTournaments && upcomingTournaments.length > 0 ? (
          viewMode === 'card' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingTournaments.map((tournament) => (
                <TournamentSignupCard
                  key={tournament.id}
                  tournament={tournament}
                  onTournamentUpdate={handleTournamentUpdate}
                  allUsers={allUsers || []}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTournaments.map((tournament) => {
                const userEntry = tournament.entries.find(e => e.id === user?.id);
                const hasSignedUp = userEntry !== undefined;
                const totalEvents = tournament.isSwing && userEntry?.schoolEntries
                  ? userEntry.schoolEntries.reduce((sum, se) => sum + se.events.length, 0)
                  : (userEntry?.events.length || 0);
                const registrationClosed = tournament.registrationCloseDate
                  ? new Date(tournament.registrationCloseDate) < new Date()
                  : false;

                return (
                  <div key={tournament.id} className="space-y-2">
                    <TournamentSignupCard
                      tournament={tournament}
                      onTournamentUpdate={handleTournamentUpdate}
                      allUsers={allUsers || []}
                    />
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
            <h3 className="text-xl font-semibold font-headline">No Tournaments Available</h3>
            <p className="text-muted-foreground mt-2">
              There are no tournaments to sign up for at this time.
            </p>
          </div>
        )
      )}
    </div>
  );
}
