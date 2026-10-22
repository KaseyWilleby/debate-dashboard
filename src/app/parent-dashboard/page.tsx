'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Calendar,
  Shield,
  BookOpen,
  Video,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { GeneratePickupCodeDialog } from '@/components/tournaments/generate-pickup-code-dialog';
import type { User, Tournament, TournamentPickup, PickupCode } from '@/lib/types';
import { format, isPast } from 'date-fns';

export default function ParentDashboard() {
  const { user } = useAuth();
  const { firestore } = useFirebase();

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>('');
  const [selectedTournament, setSelectedTournament] = React.useState<Tournament | null>(null);
  const [codeDialogOpen, setCodeDialogOpen] = React.useState(false);

  // Redirect if not a parent
  React.useEffect(() => {
    if (user && user.role !== 'parent') {
      window.location.href = '/';
    }
  }, [user]);

  // Fetch linked students
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.childIds || user.childIds.length === 0) return null;
    return query(
      collection(firestore, 'users'),
      where('__name__', 'in', user.childIds)
    );
  }, [firestore, user]);

  const { data: students, isLoading: studentsLoading } = useCollection<User>(studentsQuery);

  // Fetch tournaments where students are registered
  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore || !students || students.length === 0) return null;
    const studentIds = students.map(s => s.id);
    return query(collection(firestore, 'tournaments'));
  }, [firestore, students]);

  const { data: allTournaments } = useCollection<Tournament>(tournamentsQuery);

  // Filter tournaments where at least one student is registered
  const tournaments = React.useMemo(() => {
    if (!allTournaments || !students) return [];
    const studentIds = students.map(s => s.id);

    return allTournaments.filter(tournament =>
      tournament.entries?.some(entry => studentIds.includes(entry.id))
    );
  }, [allTournaments, students]);

  // Fetch pickup codes for all students
  const pickupCodesQuery = useMemoFirebase(() => {
    if (!firestore || !students || students.length === 0) return null;
    const studentIds = students.map(s => s.id);
    return query(
      collection(firestore, 'pickupCodes'),
      where('studentId', 'in', studentIds),
      where('active', '==', true)
    );
  }, [firestore, students]);

  const { data: pickupCodes } = useCollection<PickupCode>(pickupCodesQuery);

  // Fetch tournament pickups for all students
  const pickupsQuery = useMemoFirebase(() => {
    if (!firestore || !students || students.length === 0) return null;
    const studentIds = students.map(s => s.id);
    return query(
      collection(firestore, 'tournamentPickups'),
      where('studentId', 'in', studentIds)
    );
  }, [firestore, students]);

  const { data: pickups } = useCollection<TournamentPickup>(pickupsQuery);

  // Upcoming and past tournaments
  const upcomingTournaments = React.useMemo(() => {
    if (!tournaments) return [];
    return tournaments
      .filter(t => !isPast(new Date(t.date)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [tournaments]);

  const pastTournaments = React.useMemo(() => {
    if (!tournaments) return [];
    return tournaments
      .filter(t => isPast(new Date(t.date)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tournaments]);

  const handleGenerateCode = (tournament: Tournament, studentId: string) => {
    setSelectedTournament(tournament);
    setSelectedStudentId(studentId);
    setCodeDialogOpen(true);
  };

  const getPickupStatus = (tournamentId: string, studentId: string) => {
    const pickup = pickups?.find(
      p => p.tournamentId === tournamentId && p.studentId === studentId
    );

    if (pickup) {
      return pickup.codeVerified ? 'picked-up' : 'unverified';
    }

    const hasCode = pickupCodes?.some(
      c => c.tournamentId === tournamentId && c.studentId === studentId
    );

    return hasCode ? 'code-ready' : 'no-code';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'picked-up':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            Picked Up
          </Badge>
        );
      case 'unverified':
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Unverified
          </Badge>
        );
      case 'code-ready':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Shield className="mr-1 h-3 w-3" />
            Code Ready
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            No Code
          </Badge>
        );
    }
  };

  if (!user || user.role !== 'parent') {
    return null;
  }

  if (studentsLoading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No students linked to your account. Please contact your team administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Parent Dashboard</h1>
        <p className="text-muted-foreground">
          Manage tournament pickups and view your student's progress
        </p>
      </div>

      {/* Linked Students */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Linked Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {students.map(student => (
              <Badge key={student.id} variant="outline" className="px-3 py-1">
                {student.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="tournaments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tournaments">
            <Calendar className="mr-2 h-4 w-4" />
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="pickups">
            <Shield className="mr-2 h-4 w-4" />
            Pickup Status
          </TabsTrigger>
          <TabsTrigger value="practice">
            <BookOpen className="mr-2 h-4 w-4" />
            Practice
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        {/* Tournaments Tab */}
        <TabsContent value="tournaments" className="space-y-6">
          {upcomingTournaments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Tournaments</CardTitle>
                <CardDescription>
                  Generate pickup codes before tournament day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Pickup Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingTournaments.map(tournament => {
                      const registeredStudents = students.filter(student =>
                        tournament.entries?.some(entry => entry.id === student.id)
                      );

                      return (
                        <TableRow key={tournament.id}>
                          <TableCell className="font-medium">{tournament.name}</TableCell>
                          <TableCell>{format(new Date(tournament.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {registeredStudents.map(student => (
                                <div key={student.id} className="text-sm">
                                  {student.name}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {registeredStudents.map(student => (
                                <div key={student.id}>
                                  {getStatusBadge(getPickupStatus(tournament.id, student.id))}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {registeredStudents.map(student => (
                                <Button
                                  key={student.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGenerateCode(tournament, student.id)}
                                >
                                  <Shield className="mr-2 h-3 w-3" />
                                  Manage Code
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {pastTournaments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Past Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastTournaments.slice(0, 5).map(tournament => {
                      const registeredStudents = students.filter(student =>
                        tournament.entries?.some(entry => entry.id === student.id)
                      );

                      return (
                        <TableRow key={tournament.id}>
                          <TableCell className="font-medium">{tournament.name}</TableCell>
                          <TableCell>{format(new Date(tournament.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {registeredStudents.map(s => s.name).join(', ')}
                          </TableCell>
                          <TableCell>
                            {registeredStudents.every(student =>
                              pickups?.some(
                                p => p.tournamentId === tournament.id && p.studentId === student.id
                              )
                            ) ? (
                              <Badge className="bg-green-100 text-green-800">Completed</Badge>
                            ) : (
                              <Badge variant="outline">N/A</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {tournaments.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No tournaments found for your students
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pickup Status Tab */}
        <TabsContent value="pickups">
          <Card>
            <CardHeader>
              <CardTitle>Pickup Status Overview</CardTitle>
              <CardDescription>
                View all active pickup codes and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pickupCodes && pickupCodes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickupCodes.map(code => {
                      const tournament = tournaments?.find(t => t.id === code.tournamentId);
                      const pickup = pickups?.find(
                        p => p.tournamentId === code.tournamentId && p.studentId === code.studentId
                      );

                      return (
                        <TableRow key={code.id}>
                          <TableCell>{code.studentName}</TableCell>
                          <TableCell>{tournament?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <code className="font-mono font-bold">{code.code}</code>
                          </TableCell>
                          <TableCell>
                            {pickup ? (
                              pickup.codeVerified ? (
                                <Badge className="bg-green-100 text-green-800">Used</Badge>
                              ) : (
                                <Badge variant="destructive">Unverified</Badge>
                              )
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(code.expiresAt), 'MMM d, h:mm a')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No active pickup codes
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Practice Tab - Placeholder */}
        <TabsContent value="practice">
          <Card>
            <CardHeader>
              <CardTitle>Practice Materials</CardTitle>
              <CardDescription>
                View your student's practice recordings and scripts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Practice materials viewing will be available in a future update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab - Placeholder */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Team Messages</CardTitle>
              <CardDescription>
                View messages from coaches about your students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Messaging feature will be available in a future update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Pickup Code Dialog */}
      <GeneratePickupCodeDialog
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
        tournament={selectedTournament}
        studentId={selectedStudentId}
      />
    </div>
  );
}
