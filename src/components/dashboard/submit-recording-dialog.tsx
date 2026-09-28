"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, Submission, SavedSpeech } from "@/lib/types";
import { format } from "date-fns";

interface SubmitRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: SavedSpeech | null;
}

export function SubmitRecordingDialog({ open, onOpenChange, recording }: SubmitRecordingDialogProps) {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [selectedAssignment, setSelectedAssignment] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch available assignments for this team
  const assignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId || !open) return null;
    return query(
      collection(firestore, 'assignments'),
      where('teamId', '==', user.teamId),
      where('submissionsOpen', '==', true)
    );
  }, [firestore, user, open]);

  const { data: assignments, isLoading } = useCollection<Assignment>(assignmentsQuery);

  // Filter assignments based on class period
  const availableAssignments = React.useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(a => {
      // If assignment has no specific class periods, it's for everyone
      if (!a.classPeriods || a.classPeriods.length === 0) return true;
      // Otherwise, check if user's class period is in the assignment's allowed periods
      return user?.classPeriod && a.classPeriods.includes(user.classPeriod);
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [assignments, user]);

  // Check if already submitted to selected assignment
  const [existingSubmission, setExistingSubmission] = React.useState<Submission | null>(null);
  React.useEffect(() => {
    const checkExistingSubmission = async () => {
      if (!firestore || !user || !selectedAssignment || !recording) return;

      const submissionsRef = collection(firestore, 'submissions');
      const q = query(
        submissionsRef,
        where('assignmentId', '==', selectedAssignment),
        where('studentId', '==', user.id)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setExistingSubmission(snapshot.docs[0].data() as Submission);
      } else {
        setExistingSubmission(null);
      }
    };

    checkExistingSubmission();
  }, [firestore, user, selectedAssignment, recording]);

  const handleSubmit = async () => {
    if (!firestore || !user || !recording || !selectedAssignment) return;

    const assignment = assignments?.find(a => a.id === selectedAssignment);
    if (!assignment) return;

    // Check if resubmission is allowed
    if (existingSubmission && !assignment.allowResubmission) {
      toast({
        title: "Resubmission Not Allowed",
        description: "You have already submitted to this assignment and resubmission is not allowed.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData: Omit<Submission, 'id'> = {
        assignmentId: selectedAssignment,
        studentId: user.id,
        studentName: user.name,
        recordingId: recording.id,
        recordingTitle: recording.title || "Untitled Recording",
        submittedAt: new Date().toISOString(),
        notes: notes,
        classPeriod: user.classPeriod,
      };

      await addDoc(collection(firestore, 'submissions'), submissionData);

      toast({
        title: "Submitted Successfully",
        description: `Your recording has been submitted to "${assignment.title}".`,
      });

      onOpenChange(false);
      setSelectedAssignment("");
      setNotes("");
    } catch (error) {
      console.error("Error submitting recording:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedAssignment("");
    setNotes("");
    setExistingSubmission(null);
  };

  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Recording</DialogTitle>
          <DialogDescription>
            Submit "{recording?.title || "this recording"}" to an assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin h-6 w-6" />
            </div>
          ) : availableAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assignments available at this time.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later or contact your coach for more information.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Assignment</Label>
                <RadioGroup value={selectedAssignment} onValueChange={setSelectedAssignment}>
                  {availableAssignments.map((assignment) => {
                    const isPastDue = new Date(assignment.dueDate) < new Date();
                    return (
                      <div key={assignment.id} className="flex items-start space-x-2 rounded-md border p-4">
                        <RadioGroupItem value={assignment.id} id={assignment.id} />
                        <div className="flex-1">
                          <Label htmlFor={assignment.id} className="font-medium cursor-pointer">
                            {assignment.title}
                          </Label>
                          {assignment.description && (
                            <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy')}
                            </div>
                            {isPastDue && <Badge variant="destructive" className="text-xs">Past Due</Badge>}
                            {assignment.allowResubmission && (
                              <Badge variant="outline" className="text-xs">Resubmission Allowed</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {existingSubmission && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        You have already submitted to this assignment
                      </p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                        {assignments?.find(a => a.id === selectedAssignment)?.allowResubmission
                          ? "Submitting again will replace your previous submission."
                          : "Resubmission is not allowed for this assignment."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes or comments about your submission..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAssignment || isSubmitting || (existingSubmission && !assignments?.find(a => a.id === selectedAssignment)?.allowResubmission)}
          >
            {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
