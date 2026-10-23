"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Calendar, Edit, Trash2, CheckCircle, XCircle, Loader2, ClipboardList, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, Submission } from "@/lib/types";
import { format } from "date-fns";
import { MultiSelect } from "@/components/ui/multi-select";
import { StudentAssignmentsView } from "@/components/assignments/student-assignments-view";

// Helper function to format UTC dates without timezone shifting
const formatUTCDate = (isoString: string): string => {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = date.getUTCDate();
  return `${month} ${day}, ${year}`;
};

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const params = useParams();
  const router = useRouter();
  const teamSlug = params?.teamSlug as string;
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingAssignment, setEditingAssignment] = React.useState<Assignment | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [allowResubmission, setAllowResubmission] = React.useState(true);
  const [submissionsOpen, setSubmissionsOpen] = React.useState(true);
  const [classPeriods, setClassPeriods] = React.useState<string[]>([]);
  const [feedbackRequired, setFeedbackRequired] = React.useState<number | undefined>(undefined);
  const [randomFeedbackAssignment, setRandomFeedbackAssignment] = React.useState(false);

  // Feedback assignment specific state
  const [assignmentType, setAssignmentType] = React.useState<'video' | 'feedback'>('video');
  const [sourceAssignmentId, setSourceAssignmentId] = React.useState("");
  const [feedbackCount, setFeedbackCount] = React.useState(3);
  const [sourceClassPeriods, setSourceClassPeriods] = React.useState<string[]>([]);
  const [autoGrade, setAutoGrade] = React.useState(true);
  const [pointsPerCritique, setPointsPerCritique] = React.useState(25);
  const [minWordCount, setMinWordCount] = React.useState(50);

  const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'superadmin';

  // Show student view for students
  if (!isCoachOrAdmin) {
    return <StudentAssignmentsView teamSlug={teamSlug} />;
  }

  // Fetch assignments
  const assignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isCoachOrAdmin) return null;
    return query(
      collection(firestore, 'assignments'),
      where('teamId', '==', user.teamId)
    );
  }, [firestore, user, isCoachOrAdmin]);

  const { data: assignments, isLoading } = useCollection<Assignment>(assignmentsQuery);

  // Fetch all submissions to show counts
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isCoachOrAdmin) return null;
    return collection(firestore, 'submissions');
  }, [firestore, user, isCoachOrAdmin]);

  const { data: allSubmissions} = useCollection<Submission>(submissionsQuery);

  const getSubmissionCount = (assignmentId: string) => {
    return allSubmissions?.filter(s => s.assignmentId === assignmentId).length || 0;
  };

  // Get video assignments that can be used as sources for feedback assignments
  const videoAssignments = React.useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(a =>
      // Only video assignments (or default type which is video)
      (!a.submissionType || a.submissionType === 'video') &&
      // Not archived
      !a.isArchived &&
      // Has submissions
      getSubmissionCount(a.id) > 0
    );
  }, [assignments, allSubmissions]);

  // Check if selected source assignment has insufficient submissions
  const insufficientSubmissions = React.useMemo(() => {
    if (!sourceAssignmentId || !feedbackCount) return null;
    const submissionCount = getSubmissionCount(sourceAssignmentId);
    if (submissionCount < feedbackCount) {
      return {
        available: submissionCount,
        requested: feedbackCount
      };
    }
    return null;
  }, [sourceAssignmentId, feedbackCount, allSubmissions]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setAllowResubmission(true);
    setSubmissionsOpen(true);
    setClassPeriods([]);
    setFeedbackRequired(undefined);
    setRandomFeedbackAssignment(false);
    setAssignmentType('video');
    setSourceAssignmentId("");
    setFeedbackCount(3);
    setSourceClassPeriods([]);
    setAutoGrade(true);
    setPointsPerCritique(25);
    setMinWordCount(50);
    setEditingAssignment(null);
  };

  const handleCreateAssignment = async () => {
    if (!firestore || !user) return;
    if (!title || !dueDate) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and due date.",
        variant: "destructive",
      });
      return;
    }

    // Validate feedback assignment requirements
    if (assignmentType === 'feedback') {
      if (!sourceAssignmentId) {
        toast({
          title: "Missing Source Assignment",
          description: "Please select a video assignment to use as the source.",
          variant: "destructive",
        });
        return;
      }
      if (!feedbackCount || feedbackCount < 1) {
        toast({
          title: "Invalid Feedback Count",
          description: "Please specify how many videos each student should review.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Create date at noon UTC to avoid timezone shifting issues
      const dueDateObj = new Date(dueDate + 'T12:00:00.000Z');

      const assignmentData: Partial<Assignment> = {
        title,
        description,
        teamId: user.teamId,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        dueDate: dueDateObj.toISOString(),
        allowResubmission,
        submissionsOpen,
        submissionType: assignmentType,
      };

      // Video assignment specific fields
      if (assignmentType === 'video') {
        // Only include optional fields if they have values
        if (classPeriods.length > 0) {
          assignmentData.classPeriods = classPeriods;
        }
        if (feedbackRequired !== undefined && feedbackRequired > 0) {
          assignmentData.feedbackRequired = feedbackRequired;
        }
        if (feedbackRequired !== undefined && feedbackRequired > 0) {
          assignmentData.randomFeedbackAssignment = randomFeedbackAssignment;
        }
      }

      // Feedback assignment specific fields
      if (assignmentType === 'feedback') {
        assignmentData.sourceAssignmentId = sourceAssignmentId;
        assignmentData.feedbackCount = feedbackCount;
        assignmentData.sourceClassPeriods = sourceClassPeriods;
        assignmentData.autoGrade = autoGrade;
        if (autoGrade) {
          assignmentData.pointsPerCritique = pointsPerCritique;
        }
        if (minWordCount > 0) {
          assignmentData.minWordCount = minWordCount;
        }
        // Feedback assignments go to specific class periods
        if (classPeriods.length > 0) {
          assignmentData.classPeriods = classPeriods;
        }
      }

      if (editingAssignment) {
        await updateDoc(doc(firestore, 'assignments', editingAssignment.id), assignmentData);
        toast({ title: "Assignment Updated", description: "The assignment has been updated successfully." });
      } else {
        await addDoc(collection(firestore, 'assignments'), assignmentData);
        toast({ title: "Assignment Created", description: "The assignment has been created successfully." });
      }

      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving assignment:", error);
      toast({
        title: "Error",
        description: "Failed to save assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setTitle(assignment.title);
    setDescription(assignment.description);
    // Extract just the date portion to avoid timezone issues
    const dateObj = new Date(assignment.dueDate);
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    setDueDate(`${year}-${month}-${day}`);
    setAllowResubmission(assignment.allowResubmission);
    setSubmissionsOpen(assignment.submissionsOpen);
    setClassPeriods(assignment.classPeriods || []);
    setFeedbackRequired(assignment.feedbackRequired);
    setRandomFeedbackAssignment(assignment.randomFeedbackAssignment || false);

    // Load feedback assignment specific fields
    setAssignmentType(assignment.submissionType === 'feedback' ? 'feedback' : 'video');
    setSourceAssignmentId(assignment.sourceAssignmentId || "");
    setFeedbackCount(assignment.feedbackCount || 3);
    setSourceClassPeriods(assignment.sourceClassPeriods || []);
    setAutoGrade(assignment.autoGrade ?? true);
    setPointsPerCritique(assignment.pointsPerCritique || 25);
    setMinWordCount(assignment.minWordCount || 50);

    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!firestore) return;
    if (!confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) return;

    try {
      await deleteDoc(doc(firestore, 'assignments', assignmentId));
      toast({ title: "Assignment Deleted", description: "The assignment has been deleted." });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast({
        title: "Error",
        description: "Failed to delete assignment.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSubmissions = async (assignment: Assignment) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'assignments', assignment.id), {
        submissionsOpen: !assignment.submissionsOpen
      });
      toast({
        title: assignment.submissionsOpen ? "Submissions Closed" : "Submissions Opened",
        description: `Submissions for "${assignment.title}" are now ${!assignment.submissionsOpen ? 'open' : 'closed'}.`,
      });
    } catch (error) {
      console.error("Error toggling submissions:", error);
      toast({
        title: "Error",
        description: "Failed to update assignment.",
        variant: "destructive",
      });
    }
  };

  if (!isCoachOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
        <h3 className="text-xl font-semibold font-headline">Access Denied</h3>
        <p className="text-muted-foreground mt-2">
          You must be a coach or administrator to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Assignments</h1>
          <p className="text-muted-foreground">
            Create and manage speech assignments for your students.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAssignment ? "Edit Assignment" : "Create New Assignment"}</DialogTitle>
              <DialogDescription>
                {editingAssignment
                  ? "Update the assignment details below."
                  : "Create a video submission assignment or a feedback assignment for students to critique videos."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Extemp Speech #1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide instructions or details about this assignment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Assignment Type Selector */}
              <div className="space-y-2">
                <Label htmlFor="assignmentType">Assignment Type *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="video"
                      checked={assignmentType === 'video'}
                      onChange={(e) => setAssignmentType('video')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Video Submission</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="feedback"
                      checked={assignmentType === 'feedback'}
                      onChange={(e) => setAssignmentType('feedback')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Feedback Assignment</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {assignmentType === 'video'
                    ? "Students submit video recordings"
                    : "Students critique videos from another assignment"}
                </p>
              </div>

              {/* Feedback Assignment Specific Fields */}
              {assignmentType === 'feedback' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="sourceAssignment">Source Video Assignment *</Label>
                    <select
                      id="sourceAssignment"
                      value={sourceAssignmentId}
                      onChange={(e) => setSourceAssignmentId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select an assignment</option>
                      {videoAssignments.map(assignment => (
                        <option key={assignment.id} value={assignment.id}>
                          {assignment.title} ({getSubmissionCount(assignment.id)} submissions)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Students will critique videos from this assignment
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feedbackCount">Videos to Review Per Student *</Label>
                    <Input
                      id="feedbackCount"
                      type="number"
                      min="1"
                      max="10"
                      value={feedbackCount}
                      onChange={(e) => setFeedbackCount(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many videos each student must watch and critique
                    </p>
                  </div>

                  {/* Warning for insufficient submissions */}
                  {insufficientSubmissions && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> Only {insufficientSubmissions.available} submission{insufficientSubmissions.available === 1 ? '' : 's'} available, but you requested {insufficientSubmissions.requested} per student. Students will be assigned up to {insufficientSubmissions.available} video{insufficientSubmissions.available === 1 ? '' : 's'} each. You can still create this assignment.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="sourceClassPeriods">Include Submissions From (Optional)</Label>
                    <MultiSelect
                      options={[
                        { label: "1st Period", value: "1" },
                        { label: "2nd Period", value: "2" },
                        { label: "3rd Period", value: "3" },
                        { label: "4th Period", value: "4" },
                        { label: "5th Period", value: "5" },
                        { label: "6th Period", value: "6" },
                        { label: "7th Period", value: "7" },
                        { label: "8th Period", value: "8" },
                        { label: "A Block", value: "A" },
                        { label: "B Block", value: "B" },
                        { label: "C Block", value: "C" },
                        { label: "D Block", value: "D" },
                        { label: "Club", value: "Club" },
                      ]}
                      value={sourceClassPeriods}
                      onValueChange={setSourceClassPeriods}
                      placeholder="All class periods"
                      maxCount={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to include all submissions, or select specific periods for cross-class feedback
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minWordCount">Minimum Word Count</Label>
                    <Input
                      id="minWordCount"
                      type="number"
                      min="0"
                      value={minWordCount}
                      onChange={(e) => setMinWordCount(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum words required for each critique to count as complete (0 = no minimum)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoGrade">Auto-Grade</Label>
                      <Switch
                        id="autoGrade"
                        checked={autoGrade}
                        onCheckedChange={setAutoGrade}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically calculate grade based on completed critiques
                    </p>
                  </div>

                  {autoGrade && (
                    <div className="space-y-2">
                      <Label htmlFor="pointsPerCritique">Points Per Critique</Label>
                      <Input
                        id="pointsPerCritique"
                        type="number"
                        min="1"
                        value={pointsPerCritique}
                        onChange={(e) => setPointsPerCritique(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Points awarded for each completed critique (e.g., 25 points × 4 critiques = 100 points total)
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="classPeriods">{assignmentType === 'feedback' ? 'Assign To Class Periods (Optional)' : 'Class Periods (Optional)'}</Label>
                <MultiSelect
                  options={[
                    { label: "1st Period", value: "1" },
                    { label: "2nd Period", value: "2" },
                    { label: "3rd Period", value: "3" },
                    { label: "4th Period", value: "4" },
                    { label: "5th Period", value: "5" },
                    { label: "6th Period", value: "6" },
                    { label: "7th Period", value: "7" },
                    { label: "8th Period", value: "8" },
                    { label: "A Block", value: "A" },
                    { label: "B Block", value: "B" },
                    { label: "C Block", value: "C" },
                    { label: "D Block", value: "D" },
                    { label: "Club", value: "Club" },
                  ]}
                  value={classPeriods}
                  onValueChange={setClassPeriods}
                  placeholder="Select class periods (leave empty for all)"
                  maxCount={5}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to assign to all students. Select specific periods to limit visibility.
                </p>
              </div>

              {/* Video Assignment Specific Fields */}
              {assignmentType === 'video' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="feedbackRequired">Peer Feedback Required (Optional)</Label>
                    <Input
                      id="feedbackRequired"
                      type="number"
                      min="0"
                      placeholder="e.g., 3"
                      value={feedbackRequired ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFeedbackRequired(val === "" ? undefined : parseInt(val, 10));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of peer videos students must provide feedback on as part of this assignment.
                    </p>
                  </div>
                  {(feedbackRequired !== undefined && feedbackRequired > 0) && (
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <Switch
                        id="randomFeedbackAssignment"
                        checked={randomFeedbackAssignment}
                        onCheckedChange={setRandomFeedbackAssignment}
                      />
                      <div className="flex-1">
                        <Label htmlFor="randomFeedbackAssignment" className="font-medium text-blue-900 cursor-pointer">
                          Random Feedback Assignment
                        </Label>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Automatically assign submissions to students one at a time. Ensures even distribution of feedback across all submissions.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allowResubmission"
                      checked={allowResubmission}
                      onCheckedChange={setAllowResubmission}
                    />
                    <Label htmlFor="allowResubmission">Allow students to resubmit</Label>
                  </div>
                </>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="submissionsOpen"
                  checked={submissionsOpen}
                  onCheckedChange={setSubmissionsOpen}
                />
                <Label htmlFor="submissionsOpen">Submissions are open</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateAssignment} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
                {editingAssignment ? "Update Assignment" : "Create Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin h-8 w-8" />
        </div>
      ) : !assignments || assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold font-headline mb-2">No Assignments Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first assignment to start collecting speech recordings from students.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Assignments</CardTitle>
            <CardDescription>Manage your speech assignments and view submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  // Compare only dates, not times - due date should be past due only if it's a previous day
                  const dueDate = new Date(assignment.dueDate);
                  const today = new Date();
                  const dueDateOnly = new Date(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
                  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isPastDue = dueDateOnly < todayOnly;
                  const submissionCount = getSubmissionCount(assignment.id);

                  return (
                    <TableRow key={assignment.id} className="cursor-pointer" onClick={() => router.push(`/${teamSlug}/dashboard/assignments/${assignment.id}`)}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatUTCDate(assignment.dueDate)}
                          {isPastDue && <Badge variant="destructive">Past Due</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{submissionCount} submission{submissionCount !== 1 ? 's' : ''}</Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.submissionsOpen ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Closed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleSubmissions(assignment)}
                          >
                            {assignment.submissionsOpen ? "Close" : "Open"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(assignment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
    </div>
  );
}
