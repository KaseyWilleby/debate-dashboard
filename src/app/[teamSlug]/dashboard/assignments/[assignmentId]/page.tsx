"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, updateDoc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, CheckCircle, XCircle, Loader2, Edit, Eye, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, Submission, SavedSpeech } from "@/lib/types";
import { format } from "date-fns";

// Helper function to format UTC dates without timezone shifting
const formatUTCDate = (isoString: string): string => {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = date.getUTCDate();
  return `${month} ${day}, ${year}`;
};

export default function AssignmentDetailPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const params = useParams();
  const router = useRouter();
  const assignmentId = params?.assignmentId as string;
  const teamSlug = params?.teamSlug as string;
  const { toast } = useToast();

  const [filterPeriod, setFilterPeriod] = React.useState<string>("all");
  const [gradingSubmission, setGradingSubmission] = React.useState<Submission | null>(null);
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = React.useState<number>(0);
  const [currentRecording, setCurrentRecording] = React.useState<SavedSpeech | null>(null);
  const [isLoadingRecording, setIsLoadingRecording] = React.useState(false);
  const [gradeValue, setGradeValue] = React.useState("");
  const [feedbackValue, setFeedbackValue] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'superadmin';

  // Fetch assignment
  const assignmentDoc = useMemoFirebase(() => {
    if (!firestore || !assignmentId) return null;
    return doc(firestore, 'assignments', assignmentId);
  }, [firestore, assignmentId]);

  const { data: assignment, isLoading: isLoadingAssignment } = useDoc<Assignment>(assignmentDoc);

  // Fetch submissions for this assignment
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !assignmentId) return null;
    return query(
      collection(firestore, 'submissions'),
      where('assignmentId', '==', assignmentId)
    );
  }, [firestore, assignmentId]);

  const { data: allSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  // Filter submissions by class period
  const filteredSubmissions = React.useMemo(() => {
    if (!allSubmissions) return [];
    if (filterPeriod === "all") return allSubmissions;
    return allSubmissions.filter(s => s.classPeriod === filterPeriod);
  }, [allSubmissions, filterPeriod]);

  // Get unique class periods
  const classPeriods = React.useMemo(() => {
    if (!allSubmissions) return [];
    const periods = new Set(allSubmissions.map(s => s.classPeriod).filter(Boolean));
    return Array.from(periods).sort();
  }, [allSubmissions]);

  const handleGrade = async (submission: Submission, index: number) => {
    setGradingSubmission(submission);
    setCurrentSubmissionIndex(index);
    setGradeValue(submission.grade?.toString() || "");
    setFeedbackValue(submission.feedback || "");

    // Fetch the recording
    await fetchRecording(submission.recordingId);
  };

  const fetchRecording = async (recordingId: string) => {
    if (!firestore) return;

    setIsLoadingRecording(true);
    try {
      const recordingDoc = await getDoc(doc(firestore, 'savedSpeeches', recordingId));
      if (recordingDoc.exists()) {
        setCurrentRecording({ id: recordingDoc.id, ...recordingDoc.data() } as SavedSpeech);
      } else {
        setCurrentRecording(null);
        toast({
          title: "Recording Not Found",
          description: "The submitted recording could not be found.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching recording:", error);
      setCurrentRecording(null);
      toast({
        title: "Error",
        description: "Failed to load the recording.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRecording(false);
    }
  };

  const handleNextSubmission = async () => {
    if (!filteredSubmissions || currentSubmissionIndex >= filteredSubmissions.length - 1) return;

    const nextIndex = currentSubmissionIndex + 1;
    const nextSubmission = filteredSubmissions[nextIndex];

    setCurrentSubmissionIndex(nextIndex);
    setGradingSubmission(nextSubmission);
    setGradeValue(nextSubmission.grade?.toString() || "");
    setFeedbackValue(nextSubmission.feedback || "");

    await fetchRecording(nextSubmission.recordingId);
  };

  const handlePreviousSubmission = async () => {
    if (currentSubmissionIndex <= 0) return;

    const prevIndex = currentSubmissionIndex - 1;
    const prevSubmission = filteredSubmissions![prevIndex];

    setCurrentSubmissionIndex(prevIndex);
    setGradingSubmission(prevSubmission);
    setGradeValue(prevSubmission.grade?.toString() || "");
    setFeedbackValue(prevSubmission.feedback || "");

    await fetchRecording(prevSubmission.recordingId);
  };

  const handleSaveGrade = async () => {
    if (!firestore || !gradingSubmission || !user) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(firestore, 'submissions', gradingSubmission.id), {
        grade: gradeValue,
        feedback: feedbackValue,
        gradedBy: user.id,
        gradedAt: new Date().toISOString(),
      });

      toast({
        title: "Grade Saved",
        description: `Grade for ${gradingSubmission.studentName} has been saved.`,
      });

      setGradingSubmission(null);
      setGradeValue("");
      setFeedbackValue("");
    } catch (error) {
      console.error("Error saving grade:", error);
      toast({
        title: "Error",
        description: "Failed to save grade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  if (isLoadingAssignment || isLoadingSubmissions) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
        <h3 className="text-xl font-semibold font-headline">Assignment Not Found</h3>
        <p className="text-muted-foreground mt-2">
          This assignment does not exist or has been deleted.
        </p>
        <Button className="mt-4" onClick={() => router.push(`/${teamSlug}/dashboard/assignments`)}>
          <ArrowLeft className="mr-2" />
          Back to Assignments
        </Button>
      </div>
    );
  }

  // Compare only dates, not times - due date should be past due only if it's a previous day
  const dueDate = new Date(assignment.dueDate);
  const today = new Date();
  const dueDateOnly = new Date(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isPastDue = dueDateOnly < todayOnly;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push(`/${teamSlug}/dashboard/assignments`)}>
          <ArrowLeft className="mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{assignment.title}</CardTitle>
              <CardDescription className="mt-2">{assignment.description}</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Due: {formatUTCDate(assignment.dueDate)}
                {isPastDue && <Badge variant="destructive">Past Due</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold">{allSubmissions?.length || 0}</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <p className="text-sm text-muted-foreground">Graded</p>
              <p className="text-2xl font-bold">{allSubmissions?.filter(s => s.grade).length || 0}</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div>
              <p className="text-sm text-muted-foreground">Resubmission</p>
              <p className="text-2xl font-bold">{assignment.allowResubmission ? "Allowed" : "Not Allowed"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>View and grade student submissions</CardDescription>
            </div>
            {classPeriods.length > 0 && (
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {classPeriods.map(period => (
                    <SelectItem key={period} value={period!}>
                      {period === 'Club' ? 'Club' : `${period}${period === '1' ? 'st' : period === '2' ? 'nd' : period === '3' ? 'rd' : 'th'} Period`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!filteredSubmissions || filteredSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-muted-foreground">
                {filterPeriod === "all" ? "No submissions yet." : "No submissions for this period."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead>Class Period</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission, index) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.studentName}</TableCell>
                    <TableCell>{submission.recordingTitle}</TableCell>
                    <TableCell>
                      {submission.classPeriod ? (
                        <Badge variant="secondary">
                          {submission.classPeriod === 'Club' ? 'Club' : `${submission.classPeriod}${submission.classPeriod === '1' ? 'st' : submission.classPeriod === '2' ? 'nd' : submission.classPeriod === '3' ? 'rd' : 'th'} Period`}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      {submission.grade ? (
                        <Badge variant="default">{submission.grade}</Badge>
                      ) : (
                        <Badge variant="outline">Not Graded</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGrade(submission, index)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          View & Grade
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grading Dialog */}
      <Dialog open={!!gradingSubmission} onOpenChange={(open) => {
        if (!open) {
          setGradingSubmission(null);
          setCurrentRecording(null);
          setCurrentSubmissionIndex(0);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Grade Submission</DialogTitle>
                <DialogDescription>
                  {gradingSubmission?.studentName} - {gradingSubmission?.recordingTitle}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {filteredSubmissions && filteredSubmissions.length > 0
                    ? `${currentSubmissionIndex + 1} of ${filteredSubmissions.length}`
                    : ''}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousSubmission}
                    disabled={currentSubmissionIndex === 0 || isLoadingRecording}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextSubmission}
                    disabled={!filteredSubmissions || currentSubmissionIndex >= filteredSubmissions.length - 1 || isLoadingRecording}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Video Player */}
            <div className="space-y-2">
              <Label>Recording</Label>
              {isLoadingRecording ? (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : currentRecording?.videoUrl ? (
                <div className="rounded-lg overflow-hidden bg-black">
                  <video
                    controls
                    className="w-full"
                    src={currentRecording.videoUrl}
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                  <p className="text-muted-foreground">Recording not available</p>
                </div>
              )}
            </div>

            {/* Recording Info */}
            {currentRecording && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Topic</Label>
                  <p className="text-sm">{currentRecording.topic || 'Untitled'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mode</Label>
                  <p className="text-sm capitalize">{currentRecording.mode}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Speech Time</Label>
                  <p className="text-sm">{currentRecording.speechTime} min</p>
                </div>
                {currentRecording.prepTime && currentRecording.prepTime > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Prep Time</Label>
                    <p className="text-sm">{currentRecording.prepTime} sec</p>
                  </div>
                )}
              </div>
            )}

            {/* Student Notes */}
            {gradingSubmission?.notes && (
              <div className="space-y-2">
                <Label>Student Notes</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{gradingSubmission.notes}</p>
                </div>
              </div>
            )}

            {/* Grading Section */}
            <div className="pt-4 border-t space-y-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade *</Label>
                <Input
                  id="grade"
                  placeholder="e.g., A+, 95, Pass"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  placeholder="Provide feedback for the student..."
                  value={feedbackValue}
                  onChange={(e) => setFeedbackValue(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingSubmission(null)}>
              Close
            </Button>
            <Button onClick={handleSaveGrade} disabled={isSubmitting || !gradeValue.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 animate-spin h-4 w-4" /> : null}
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
