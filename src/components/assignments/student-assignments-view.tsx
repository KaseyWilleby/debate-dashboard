'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  MessageSquare,
  FileText,
  ArrowUpDown
} from 'lucide-react';
import type { Assignment, Submission, StudentAssignmentProgress } from '@/lib/types';
import { format, isPast, isValid, isToday, startOfDay } from 'date-fns';
import { AssignmentDetailDialog } from './assignment-detail-dialog';

interface StudentAssignmentsViewProps {
  teamSlug: string;
}

export function StudentAssignmentsView({ teamSlug }: StudentAssignmentsViewProps) {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const [selectedAssignment, setSelectedAssignment] = React.useState<Assignment | null>(null);
  const [sortAscending, setSortAscending] = React.useState(true); // true = earliest first
  const [typeFilter, setTypeFilter] = React.useState<string>('all');

  // Fetch assignments for this student's class
  const assignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;

    // Simple query - just filter by teamId, we'll filter the rest in code
    return query(
      collection(firestore, 'assignments'),
      where('teamId', '==', user.teamId)
    );
  }, [firestore, user]);

  const { data: allAssignments, isLoading: assignmentsLoading } = useCollection<Assignment>(assignmentsQuery);

  // Filter assignments based on class and class periods
  const assignments = React.useMemo(() => {
    if (!allAssignments || !user) return [];

    return allAssignments
      .filter(assignment => {
        // Only show published assignments (treat missing isPublished as true for backwards compatibility)
        if (assignment.isPublished === false) return false;

        // Check if archived
        if (assignment.isArchived) return false;

        // Check class match (varsity/novice/both)
        if (assignment.class) {
          if (assignment.class === 'both') {
            // Show to everyone
          } else if (user.class !== assignment.class) {
            return false;
          }
        }

        // Check class period match
        if (assignment.classPeriods && assignment.classPeriods.length > 0) {
          if (!user.classPeriod || !assignment.classPeriods.includes(user.classPeriod)) {
            return false;
          }
        }

        // Filter by type
        if (typeFilter !== 'all') {
          const assignmentType = assignment.submissionType || 'video';
          if (assignmentType !== typeFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by due date
        // Handle invalid or missing dates by putting them at the end
        const dateA = a.dueDate ? new Date(a.dueDate) : null;
        const dateB = b.dueDate ? new Date(b.dueDate) : null;

        if (!dateA || !isValid(dateA)) return 1; // a goes to end
        if (!dateB || !isValid(dateB)) return -1; // b goes to end

        // Sort based on sortAscending state
        return sortAscending
          ? dateA.getTime() - dateB.getTime()  // earliest first
          : dateB.getTime() - dateA.getTime(); // latest first
      });
  }, [allAssignments, user, typeFilter, sortAscending]);

  // Fetch all submissions for progress tracking
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'submissions'),
      where('studentId', '==', user.id)
    );
  }, [firestore, user]);

  const { data: mySubmissions } = useCollection<Submission>(submissionsQuery);

  // Fetch all submissions for peer feedback
  const allSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'submissions');
  }, [firestore, user]);

  const { data: allSubmissions } = useCollection<Submission>(allSubmissionsQuery);

  // Calculate progress for each assignment
  const assignmentProgress = React.useMemo((): Record<string, StudentAssignmentProgress> => {
    if (!assignments || !mySubmissions || !allSubmissions || !user) return {};

    const progress: Record<string, StudentAssignmentProgress> = {};

    assignments.forEach(assignment => {
      const mySubmission = mySubmissions.find(s => s.assignmentId === assignment.id);
      const assignmentSubmissions = allSubmissions.filter(s => s.assignmentId === assignment.id);

      const feedbackGivenCount = mySubmission?.feedbackGivenTo?.length || 0;
      const feedbackRequiredCount = assignment.feedbackSubmissionsRequired || 0;
      const feedbackReceivedCount = mySubmission?.peerFeedback?.length || 0;

      // For feedback assignments, check if all critiques are completed
      let isComplete = false;
      if (assignment.submissionType === 'feedback') {
        if (mySubmission && mySubmission.videoFeedback) {
          const completedCritiques = mySubmission.videoFeedback.filter(vf => vf.isComplete).length;
          const totalAssigned = mySubmission.assignedSubmissionIds?.length || 0;
          isComplete = completedCritiques === totalAssigned && totalAssigned > 0;
        }
      } else {
        // Regular assignments and video assignments
        isComplete =
          !!mySubmission &&
          (!assignment.requiresPeerFeedback || feedbackGivenCount >= feedbackRequiredCount);
      }

      progress[assignment.id] = {
        assignmentId: assignment.id,
        hasSubmitted: !!mySubmission,
        submission: mySubmission,
        feedbackGivenCount,
        feedbackRequiredCount,
        feedbackReceivedCount,
        isComplete,
      };
    });

    return progress;
  }, [assignments, mySubmissions, allSubmissions, user]);

  // Separate assignments into categories
  const { active, completed, overdue } = React.useMemo(() => {
    const now = new Date();
    const active: Assignment[] = [];
    const completed: Assignment[] = [];
    const overdue: Assignment[] = [];

    assignments.forEach(assignment => {
      const progress = assignmentProgress[assignment.id];

      if (progress?.isComplete) {
        completed.push(assignment);
      } else if (assignment.dueDate) {
        const dueDate = new Date(assignment.dueDate);
        // Only mark as overdue if it's past AND not today
        const isPastDue = isValid(dueDate) && isPast(startOfDay(dueDate)) && !isToday(dueDate);
        if (isPastDue && !progress?.hasSubmitted) {
          overdue.push(assignment);
        } else {
          active.push(assignment);
        }
      } else {
        // No due date or invalid date - treat as active
        active.push(assignment);
      }
    });

    return { active, completed, overdue };
  }, [assignments, assignmentProgress]);

  const formatDueDate = (assignment: Assignment) => {
    if (!assignment.dueDate) {
      return <span className="text-muted-foreground">No due date</span>;
    }

    const date = new Date(assignment.dueDate);
    if (!isValid(date)) {
      return <span className="text-muted-foreground">Invalid date</span>;
    }

    const progress = assignmentProgress[assignment.id];
    // Only show as overdue if it's past AND not due today
    const isPastDue = isPast(startOfDay(date)) && !isToday(date);
    const isOverdue = isPastDue && !progress?.hasSubmitted;

    return (
      <span className={isOverdue ? 'text-destructive font-medium' : ''}>
        {format(date, 'MMM d, yyyy')}
      </span>
    );
  };

  const getStatusBadge = (assignment: Assignment) => {
    const progress = assignmentProgress[assignment.id];

    if (progress?.isComplete) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" /> Complete</Badge>;
    }
    if (progress?.hasSubmitted && assignment.requiresPeerFeedback) {
      return <Badge variant="secondary"><MessageSquare className="mr-1 h-3 w-3" /> Needs Feedback</Badge>;
    }
    if (progress?.hasSubmitted) {
      return <Badge variant="secondary"><CheckCircle className="mr-1 h-3 w-3" /> Submitted</Badge>;
    }

    // Check if due date is valid before checking if overdue
    if (assignment.dueDate) {
      const dueDate = new Date(assignment.dueDate);
      // Only mark as overdue if it's past AND not due today
      const isPastDue = isValid(dueDate) && isPast(startOfDay(dueDate)) && !isToday(dueDate);
      if (isPastDue) {
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Overdue</Badge>;
      }
    }

    return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
  };

  const handleOpenAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
  };

  const renderAssignmentCard = (assignment: Assignment) => {
    const progress = assignmentProgress[assignment.id];

    return (
      <Card
        key={assignment.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleOpenAssignment(assignment)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{assignment.title}</CardTitle>
              <CardDescription className="mt-1">{assignment.description}</CardDescription>
            </div>
            {getStatusBadge(assignment)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Due Date:</span>
              {formatDueDate(assignment)}
            </div>

            {assignment.submissionType && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{assignment.submissionType}</Badge>
              </div>
            )}

            {assignment.requiresPeerFeedback && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Peer Feedback:</span>
                  <span className="text-sm font-medium">
                    {progress.feedbackGivenCount} / {progress.feedbackRequiredCount} given
                  </span>
                </div>
                <Progress
                  value={(progress.feedbackGivenCount / progress.feedbackRequiredCount) * 100}
                  className="h-2"
                />
              </div>
            )}

            {!progress?.hasSubmitted && (
              <div className="pt-2 text-sm text-muted-foreground">
                Click to view details and submit
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (assignmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No assignments yet</p>
          <p className="text-sm text-muted-foreground">
            Your coach hasn't posted any assignments. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">
            View and complete your debate assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            {active.length} Active
          </Badge>
          {overdue.length > 0 && (
            <Badge variant="destructive" className="text-sm">
              {overdue.length} Overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Sorting and Filtering Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Type:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Types</option>
            <option value="video">Video</option>
            <option value="feedback">Feedback</option>
            <option value="document">Document</option>
            <option value="text">Text</option>
            <option value="link">Link</option>
          </select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortAscending(!sortAscending)}
          className="gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortAscending ? 'Earliest First' : 'Latest First'}
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({overdue.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6">
          {active.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No active assignments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {active.map(renderAssignmentCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4 mt-6">
          {overdue.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No overdue assignments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {overdue.map(renderAssignmentCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completed.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No completed assignments yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completed.map(renderAssignmentCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AssignmentDetailDialog
        assignment={selectedAssignment}
        open={!!selectedAssignment}
        onOpenChange={(open) => !open && setSelectedAssignment(null)}
      />
    </div>
  );
}
