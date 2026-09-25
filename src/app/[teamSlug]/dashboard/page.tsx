
"use client";

import * as React from "react";
import type { Session, Tournament, User, SavedSpeech, PracticeMode } from "@/lib/types";
import { format, isAfter, parseISO } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Info, Users, ArrowRight, Calendar, Gavel, Video, Mic, BrainCircuit, Loader2, Bell, UserCheck, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, updateDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Hub = 'scheduler' | 'practice' | 'learning';

export default function DashboardPage() {
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const [activeHub, setActiveHub] = React.useState<Hub | null>(null);
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'tournaments');
  }, [firestore, user]);
  const { data: tournaments } = useCollection<Tournament>(tournamentsQuery);

  // Fetch pending user approvals for coaches
  const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'superadmin';
  const pendingUsersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isCoachOrAdmin) return null;
    return query(
      collection(firestore, 'users'),
      where('teamId', '==', user.teamId),
      where('approved', '==', false)
    );
  }, [firestore, user, isCoachOrAdmin]);

  const { data: allPendingUsers } = useCollection<User>(pendingUsersQuery);
  // Filter out deleted users in JavaScript to handle users without deleted field
  const pendingUsers = allPendingUsers?.filter(u => !u.deleted) || [];
  const pendingCount = pendingUsers?.length || 0;

  const handleApproveUser = async (userId: string, userName: string) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'users', userId), {
        approved: true,
      });
      toast({
        title: "User Approved",
        description: `${userName} has been approved and can now access the dashboard.`,
      });
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRejectUser = async (userId: string, userName: string) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'users', userId), {
        approved: false,
      });
      toast({
        title: "User Rejected",
        description: `${userName}'s access has been revoked.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Error",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      });
    }
  };

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedHub = localStorage.getItem('activeHub') as Hub;
        setActiveHub(storedHub || 'scheduler');
    }
  }, []);

  if (!activeHub) {
     return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  const SchedulerDashboard = () => {
    const upcomingTournaments = React.useMemo(() => {
      if (!tournaments) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return tournaments
        .filter(t => isAfter(parseISO(t.date), today) || parseISO(t.date).toDateString() === today.toDateString())
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
        .slice(0, 3);
    }, [tournaments]);

    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tournaments</CardTitle>
            <CardDescription>View upcoming tournaments and manage your entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTournaments.length > 0 ? (
              <div className="space-y-3">
                {upcomingTournaments.map((tournament) => {
                  const userEntry = user ? tournament.entries.find(e => e.id === user.id) : undefined;
                  return (
                    <div key={tournament.id} className="p-3 rounded-md border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{tournament.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(tournament.date), "MMM d, yyyy")}
                            {tournament.leaveTime && <span className="ml-2">• {tournament.leaveTime}</span>}
                          </p>
                          {userEntry && userEntry.events.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                                Registered for {userEntry.events.length} event{userEntry.events.length !== 1 ? 's' : ''}:
                              </p>
                              {userEntry.events.map(event => {
                                const partnership = userEntry.partnerships.find(p => p.event === event);
                                return (
                                  <div key={event} className="text-xs text-muted-foreground pl-2 border-l-2 border-green-500/30">
                                    <span className="font-medium">{event}</span>
                                    {partnership && partnership.partnerNames && partnership.partnerNames.length > 0 && (
                                      <span className="ml-1">
                                        (with {partnership.partnerNames.join(', ')})
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href={`/${teamSlug}/dashboard/tournament-signup`}>View All Tournaments</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-48">
                <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold font-headline">No Upcoming Tournaments</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Navigate to the Tournament Sign Up page to view events.
                </p>
                <Button asChild className="mt-4">
                  <Link href={`/${teamSlug}/dashboard/tournament-signup`}>View Tournaments</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Booked Sessions</CardTitle>
            <CardDescription>Review your scheduled one-on-one sessions.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-48">
                  <Users className="h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-semibold font-headline">No Session Data</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Go to My Sessions to see your schedule.
                  </p>
                   <Button asChild className="mt-4">
                    <Link href={`/${teamSlug}/dashboard/my-sessions`}>View My Sessions</Link>
                </Button>
              </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const PracticeDashboard = () => {
    return (
     <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Recent Recordings</CardTitle>
                 <CardDescription>Review your practice performances.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-48">
                    <Video className="h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-semibold font-headline">No Recent Recordings</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Go to a practice page to record a speech.
                    </p>
                     <Button asChild className="mt-4">
                        <Link href={`/${teamSlug}/dashboard/extemp-practice`}>Go to Practice</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Practice Rounds</CardTitle>
            <CardDescription>Participate in debate practice rounds.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-48">
                <Gavel className="h-8 w-8 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold font-headline">No Practice Rounds</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                    Go to the Debate Events page to start practicing.
                </p>
                 <Button asChild className="mt-4">
                    <Link href={`/${teamSlug}/dashboard/debate-events`}>Go to Debate Events</Link>
                </Button>
              </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const LearningDashboard = () => (
    <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Welcome to the Learning Hub</CardTitle>
                <CardDescription>This is your space to grow. Browse resources, watch tutorials, and master new skills.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-48">
                    <BrainCircuit className="h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="text-lg font-semibold font-headline">Explore Resources</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Select a category from the sidebar to start learning.
                    </p>
                    <Button asChild className="mt-4">
                        <Link href={`/${teamSlug}/dashboard/learning-hub`}>Go to Learning Hub</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );

  const renderDashboard = () => {
      switch (activeHub) {
          case 'scheduler': return <SchedulerDashboard />;
          case 'practice': return <PracticeDashboard />;
          case 'learning': return <LearningDashboard />;
          default: return <SchedulerDashboard />;
      }
  }

  const getHubTitle = () => {
    switch (activeHub) {
      case 'scheduler': return 'Team Hub';
      case 'practice': return 'Practice Hub';
      case 'learning': return 'Learning Hub';
      default: return 'Team Hub';
    }
  };

  const getHubDescription = () => {
    switch (activeHub) {
      case 'scheduler': return 'An overview of your upcoming events and sessions.';
      case 'practice': return 'Track your practice sessions and recordings.';
      case 'learning': return 'Explore resources and tutorials to improve your skills.';
      default: return 'An overview of your upcoming events and sessions.';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">{getHubTitle()}</h1>
        <p className="text-muted-foreground">
          {getHubDescription()}
        </p>
      </div>

      {/* Pending Approvals Notification - Only show in Team Hub for coaches */}
      {activeHub === 'scheduler' && isCoachOrAdmin && pendingCount > 0 && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <Bell className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-100 flex items-center justify-between">
              <span>Pending User Approvals</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-yellow-900 dark:text-yellow-100">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </AlertTitle>
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <div className="mb-2">
                You have {pendingCount} user{pendingCount !== 1 ? 's' : ''} waiting for approval.
              </div>

              <CollapsibleContent className="space-y-2 mt-3">
                {pendingUsers?.map((pendingUser) => (
                  <div
                    key={pendingUser.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-md border border-yellow-300 dark:border-yellow-700"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {pendingUser.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {pendingUser.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {pendingUser.role}
                        </Badge>
                        {pendingUser.studentId && (
                          <span className="text-xs text-gray-500">
                            ID: {pendingUser.studentId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveUser(pendingUser.id, pendingUser.name)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectUser(pendingUser.id, pendingUser.name)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </AlertDescription>
          </Alert>
        </Collapsible>
      )}

      {renderDashboard()}

    </div>
  );
}
