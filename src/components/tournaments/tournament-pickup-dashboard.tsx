'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Download,
  Image as ImageIcon,
  Shield,
} from 'lucide-react';
import type { Tournament, TournamentPickup, TournamentEntry } from '@/lib/types';
import { format } from 'date-fns';

interface TournamentPickupDashboardProps {
  tournament: Tournament;
}

interface StudentPickupStatus {
  studentId: string;
  studentName: string;
  status: 'picked-up' | 'pending' | 'unverified';
  pickup?: TournamentPickup;
  hasCode: boolean;
}

export function TournamentPickupDashboard({ tournament }: TournamentPickupDashboardProps) {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedPickup, setSelectedPickup] = React.useState<TournamentPickup | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = React.useState(false);

  // Fetch all pickups for this tournament
  const pickupsQuery = useMemoFirebase(() => {
    if (!firestore || !tournament) return null;
    return query(
      collection(firestore, 'tournamentPickups'),
      where('tournamentId', '==', tournament.id)
    );
  }, [firestore, tournament]);

  const { data: pickups, isLoading: pickupsLoading } = useCollection<TournamentPickup>(pickupsQuery);

  // Fetch all pickup codes for this tournament
  const codesQuery = useMemoFirebase(() => {
    if (!firestore || !tournament) return null;
    return query(
      collection(firestore, 'pickupCodes'),
      where('tournamentId', '==', tournament.id),
      where('active', '==', true)
    );
  }, [firestore, tournament]);

  const { data: pickupCodes, isLoading: codesLoading } = useCollection(codesQuery);

  // Build student pickup status list
  const studentStatuses = React.useMemo((): StudentPickupStatus[] => {
    if (!tournament.entries) return [];

    const statuses: StudentPickupStatus[] = [];

    tournament.entries.forEach((entry: TournamentEntry) => {
      const pickup = pickups?.find(p => p.studentId === entry.id);
      const hasCode = pickupCodes?.some(c => c.studentId === entry.id) || false;

      let status: 'picked-up' | 'pending' | 'unverified' = 'pending';

      if (pickup) {
        status = pickup.codeVerified ? 'picked-up' : 'unverified';
      }

      statuses.push({
        studentId: entry.id,
        studentName: entry.name,
        status,
        pickup,
        hasCode,
      });
    });

    return statuses;
  }, [tournament.entries, pickups, pickupCodes]);

  // Filter students based on search
  const filteredStudents = React.useMemo(() => {
    if (!searchTerm) return studentStatuses;

    const term = searchTerm.toLowerCase();
    return studentStatuses.filter(s =>
      s.studentName.toLowerCase().includes(term)
    );
  }, [studentStatuses, searchTerm]);

  // Categorize students
  const pickedUpStudents = filteredStudents.filter(s => s.status === 'picked-up');
  const pendingStudents = filteredStudents.filter(s => s.status === 'pending');
  const unverifiedStudents = filteredStudents.filter(s => s.status === 'unverified');

  const handleViewPhoto = (pickup: TournamentPickup) => {
    setSelectedPickup(pickup);
    setPhotoDialogOpen(true);
  };

  const handleExportRoster = () => {
    const csvContent = [
      ['Student Name', 'Status', 'Pickup Person', 'Pickup Time', 'Code Verified', 'Has Code'].join(','),
      ...studentStatuses.map(s => [
        s.studentName,
        s.status,
        s.pickup?.pickupPersonName || 'N/A',
        s.pickup?.pickedUpAt ? format(new Date(s.pickup.pickedUpAt), 'h:mm a') : 'N/A',
        s.pickup?.codeVerified ? 'Yes' : 'No',
        s.hasCode ? 'Yes' : 'No',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tournament.name}-pickup-roster.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: 'picked-up' | 'pending' | 'unverified') => {
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
            <AlertTriangle className="mr-1 h-3 w-3" />
            Unverified
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const renderStudentTable = (students: StudentPickupStatus[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pickup Person</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Photo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No students in this category
            </TableCell>
          </TableRow>
        ) : (
          students.map(student => (
            <TableRow key={student.studentId}>
              <TableCell className="font-medium">{student.studentName}</TableCell>
              <TableCell>{getStatusBadge(student.status)}</TableCell>
              <TableCell>
                {student.pickup?.pickupPersonName || (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {student.pickup?.pickedUpAt ? (
                  format(new Date(student.pickup.pickedUpAt), 'h:mm a')
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {student.hasCode ? (
                  <Badge variant="outline" className="bg-blue-50">
                    <Shield className="mr-1 h-3 w-3" />
                    Generated
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">No code</span>
                )}
              </TableCell>
              <TableCell>
                {student.pickup?.pickupPhotoUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewPhoto(student.pickup!)}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (pickupsLoading || codesLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading pickup data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tournament Pickup Dashboard</CardTitle>
              <CardDescription>
                Track student pickups for {tournament.name}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportRoster}>
              <Download className="mr-2 h-4 w-4" />
              Export Roster
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{studentStatuses.length}</div>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-700">
                  {pickedUpStudents.length}
                </div>
                <p className="text-sm text-muted-foreground">Picked Up</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-700">
                  {pendingStudents.length}
                </div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-700">
                  {unverifiedStudents.length}
                </div>
                <p className="text-sm text-muted-foreground">Unverified</p>
              </CardContent>
            </Card>
          </div>

          {/* Unverified Alert */}
          {unverifiedStudents.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{unverifiedStudents.length} student{unverifiedStudents.length !== 1 ? 's' : ''}</strong> signed out with incorrect codes.
                Review photos to verify safe pickup.
              </AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({filteredStudents.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingStudents.length})
              </TabsTrigger>
              <TabsTrigger value="picked-up">
                Picked Up ({pickedUpStudents.length})
              </TabsTrigger>
              <TabsTrigger value="unverified">
                Unverified ({unverifiedStudents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {renderStudentTable(filteredStudents)}
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              {renderStudentTable(pendingStudents)}
            </TabsContent>

            <TabsContent value="picked-up" className="mt-4">
              {renderStudentTable(pickedUpStudents)}
            </TabsContent>

            <TabsContent value="unverified" className="mt-4">
              {renderStudentTable(unverifiedStudents)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Photo Review Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pickup Photo Review</DialogTitle>
            <DialogDescription>
              Review pickup photo for verification
            </DialogDescription>
          </DialogHeader>

          {selectedPickup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Student:</span> {selectedPickup.studentName}
                </div>
                <div>
                  <span className="font-medium">Pickup Person:</span> {selectedPickup.pickupPersonName}
                </div>
                <div>
                  <span className="font-medium">Time:</span>{' '}
                  {format(new Date(selectedPickup.pickedUpAt), 'MMM d, h:mm a')}
                </div>
                <div>
                  <span className="font-medium">Code Status:</span>{' '}
                  {selectedPickup.codeVerified ? (
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
                  ) : (
                    <Badge variant="destructive">Unverified</Badge>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <img
                  src={selectedPickup.pickupPhotoUrl}
                  alt="Pickup photo"
                  className="w-full h-auto"
                />
              </div>

              {selectedPickup.notes && (
                <div>
                  <span className="font-medium text-sm">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedPickup.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
