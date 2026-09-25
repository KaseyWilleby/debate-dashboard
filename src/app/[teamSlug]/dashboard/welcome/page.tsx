
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Gavel, BookOpen, Bell, UserCheck, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, updateDoc, doc } from "firebase/firestore";
import { User as AppUser } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Hub = 'scheduler' | 'practice' | 'learning';

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(false);

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

  const { data: allPendingUsers } = useCollection<AppUser>(pendingUsersQuery);
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

  const handleHubSelection = (hub: Hub) => {
    localStorage.setItem('activeHub', hub);

    // Navigate to the appropriate hub's first page
    if (hub === 'scheduler') {
      router.push(`/${teamSlug}/dashboard`);
    } else if (hub === 'practice') {
      router.push(`/${teamSlug}/dashboard/extemp-practice`);
    } else if (hub === 'learning') {
      router.push(`/${teamSlug}/dashboard/learning-hub`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome, {user?.name}!</h1>
        <p className="text-muted-foreground">
          Choose a hub below to explore different features of your debate dashboard.
        </p>
      </div>

      {/* Pending Approvals Notification */}
      {isCoachOrAdmin && pendingCount > 0 && (
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

       <div className="grid gap-6 md:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleHubSelection('scheduler')}>
                <div className="mb-4 text-primary">
                    <Users size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Team Hub</CardTitle>
                <CardDescription className="mb-4">
                  {user?.role === 'coach' || user?.role === 'superadmin'
                    ? 'Manage your team\'s tournaments, sessions, and schedule. Create and organize tournaments, track student registrations, book coaching sessions, and access user administration tools.'
                    : 'View your team\'s tournaments and register for upcoming events. Book one-on-one coaching sessions, track your tournament registrations, and view your competition history.'}
                </CardDescription>
                <Button onClick={() => handleHubSelection('scheduler')}>Go to Team Hub</Button>
            </Card>
             <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleHubSelection('practice')}>
                <div className="mb-4 text-primary">
                    <Gavel size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Practice Hub</CardTitle>
                <CardDescription className="mb-4">
                  Practice speeches and debate rounds with AI-powered tools. Record yourself for extemp, impromptu, oratory,
                  and other events. Review your recordings, track your progress with analytics, and participate in debate practice rounds.
                </CardDescription>
                <Button onClick={() => handleHubSelection('practice')}>Go to Practice Hub</Button>
            </Card>
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleHubSelection('learning')}>
                <div className="mb-4 text-primary">
                    <BookOpen size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Learning Hub</CardTitle>
                <CardDescription className="mb-4">
                  Access curated tutorials, rules, and resources for all debate and speech events. Learn about Lincoln-Douglas,
                  Public Forum, Policy, interpretation events, and more. Watch expert videos and read comprehensive guides.
                </CardDescription>
                <Button onClick={() => handleHubSelection('learning')}>Go to Learning Hub</Button>
            </Card>
      </div>
    </div>
  );
}
