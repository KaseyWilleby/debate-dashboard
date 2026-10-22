'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase, useDocument, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, UserCheck, AlertCircle } from 'lucide-react';
import { TournamentPickupDashboard } from '@/components/tournaments/tournament-pickup-dashboard';
import { StudentSignOutForm } from '@/components/tournaments/student-sign-out-form';
import { GeneratePickupCodeDialog } from '@/components/tournaments/generate-pickup-code-dialog';
import type { Tournament } from '@/lib/types';

export default function TournamentPickupPage() {
  const params = useParams();
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const tournamentId = params.tournamentId as string;

  const [codeDialogOpen, setCodeDialogOpen] = React.useState(false);

  // Fetch tournament data
  const tournamentRef = useMemoFirebase(() => {
    if (!firestore || !tournamentId) return null;
    return doc(firestore, 'tournaments', tournamentId);
  }, [firestore, tournamentId]);

  const { data: tournament, isLoading: tournamentLoading } = useDocument<Tournament>(tournamentRef);

  const isCoach = user?.role === 'coach';
  const isStudent = user?.role === 'varsity' || user?.role === 'novice';
  const isRegistered = tournament?.entries?.some(entry => entry.id === user?.id);

  if (tournamentLoading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center text-muted-foreground">Loading tournament...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Tournament not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Tournament Pickup</h1>
        </div>
        <p className="text-muted-foreground">
          Safe student pickup system for {tournament.name}
        </p>
      </div>

      {/* Coach View */}
      {isCoach && (
        <TournamentPickupDashboard tournament={tournament} />
      )}

      {/* Student View */}
      {isStudent && (
        <>
          {isRegistered ? (
            <Tabs defaultValue="sign-out" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sign-out">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Sign Out
                </TabsTrigger>
                <TabsTrigger value="info">
                  <Shield className="mr-2 h-4 w-4" />
                  Information
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sign-out">
                <StudentSignOutForm tournament={tournament} />
              </TabsContent>

              <TabsContent value="info">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="text-lg font-semibold">How to Sign Out Safely</h3>

                    <div className="space-y-3">
                      <div>
                        <Badge className="mb-2">Step 1</Badge>
                        <p className="text-sm">
                          Your parent or guardian will generate a unique pickup code through the parent portal.
                        </p>
                      </div>

                      <div>
                        <Badge className="mb-2">Step 2</Badge>
                        <p className="text-sm">
                          When they arrive to pick you up, ask them for the pickup code.
                        </p>
                      </div>

                      <div>
                        <Badge className="mb-2">Step 3</Badge>
                        <p className="text-sm">
                          Take a photo together with the person picking you up.
                        </p>
                      </div>

                      <div>
                        <Badge className="mb-2">Step 4</Badge>
                        <p className="text-sm">
                          Enter the pickup code and submit the sign-out form.
                        </p>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Important:</strong> Never leave with someone who doesn't have the correct pickup code.
                        Always verify with a coach if there are any issues.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are not registered for this tournament. The pickup system is only available for registered students.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Unauthorized View */}
      {!isCoach && !isStudent && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access the pickup system for this tournament.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
