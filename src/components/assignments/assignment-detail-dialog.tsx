'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
} from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  ExternalLink,
} from 'lucide-react';
import type { Assignment, Submission, SubmissionFeedback, AssignmentType } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AssignmentDetailDialogProps {
  assignment: Assignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentDetailDialog({
  assignment,
  open,
  onOpenChange,
}: AssignmentDetailDialogProps) {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<string>('details');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submissionContent, setSubmissionContent] = React.useState('');
  const [submissionNotes, setSubmissionNotes] = React.useState('');
  const [feedbackContent, setFeedbackContent] = React.useState<Record<string, string>>({});
  const [givingFeedbackTo, setGivingFeedbackTo] = React.useState<string | null>(null);

  // Fetch all submissions for this assignment
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !assignment) return null;
    return query(
      collection(firestore, 'submissions'),
      where('assignmentId', '==', assignment.id)
    );
  }, [firestore, assignment]);

  const { data: allSubmissions } = useCollection<Submission>(submissionsQuery);

  // Find current user's submission
  const mySubmission = React.useMemo(() => {
    return allSubmissions?.find(s => s.studentId === user?.id);
  }, [allSubmissions, user]);

  // Get submissions available for peer feedback
  const feedbackSubmissions = React.useMemo(() => {
    if (!allSubmissions || !assignment?.requiresPeerFeedback || !user) return [];

    return allSubmissions
      .filter(s => {
        // Don't show own submission
        if (s.studentId === user.id) return false;

        // Don't show if already given feedback to this submission
        if (mySubmission?.feedbackGivenTo?.includes(s.id)) return false;

        // Don't show if submission has reached feedback limit
        const feedbackCount = s.peerFeedback?.length || 0;
        const limit = assignment.feedbackPerSubmissionLimit || Infinity;
        if (feedbackCount >= limit) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort by least feedback first
        const aCount = a.peerFeedback?.length || 0;
        const bCount = b.peerFeedback?.length || 0;
        return aCount - bCount;
      });
  }, [allSubmissions, assignment, user, mySubmission]);

  // Calculate feedback progress
  const feedbackGiven = mySubmission?.feedbackGivenTo?.length || 0;
  const feedbackRequired = assignment?.feedbackSubmissionsRequired || 0;
  const feedbackReceived = mySubmission?.peerFeedback?.length || 0;

  const handleSubmit = async () => {
    if (!firestore || !user || !assignment) return;

    if (!submissionContent.trim()) {
      toast({
        title: 'Missing Content',
        description: 'Please provide your submission content.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData: Partial<Submission> = {
        assignmentId: assignment.id,
        studentId: user.id,
        studentName: user.name,
        submittedAt: new Date().toISOString(),
        notes: submissionNotes,
        type: assignment.submissionType,
        content: submissionContent,
        peerFeedback: [],
        feedbackGivenTo: [],
        classPeriod: user.classPeriod,
      };

      await addDoc(collection(firestore, 'submissions'), submissionData);

      toast({
        title: 'Success',
        description: 'Your assignment has been submitted!',
      });

      setSubmissionContent('');
      setSubmissionNotes('');
      setActiveTab('submission');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit assignment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGiveFeedback = async (submissionId: string) => {
    if (!firestore || !user || !assignment || !mySubmission) return;

    const content = feedbackContent[submissionId]?.trim();
    if (!content) {
      toast({
        title: 'Missing Feedback',
        description: 'Please write your feedback before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: SubmissionFeedback = {
        id: `feedback-${Date.now()}`,
        submissionId,
        reviewerId: user.id,
        reviewerName: user.name,
        content,
        createdAt: new Date().toISOString(),
      };

      // Update the submission with new feedback
      const submissionRef = doc(firestore, 'submissions', submissionId);
      await updateDoc(submissionRef, {
        peerFeedback: arrayUnion(feedbackData),
      });

      // Update current user's submission to track feedback given
      const mySubmissionRef = doc(firestore, 'submissions', mySubmission.id);
      await updateDoc(mySubmissionRef, {
        feedbackGivenTo: arrayUnion(submissionId),
      });

      toast({
        title: 'Feedback Submitted',
        description: 'Your feedback has been recorded!',
      });

      setFeedbackContent(prev => ({ ...prev, [submissionId]: '' }));
      setGivingFeedbackTo(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type?: AssignmentType) => {
    switch (type) {
      case 'video':
        return <Play className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'link':
        return <LinkIcon className="h-4 w-4" />;
      case 'text':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const renderSubmissionContent = (submission: Submission) => {
    const type = submission.type || assignment?.submissionType;

    if (type === 'text') {
      return (
        <div className="p-4 bg-muted rounded-md">
          <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
        </div>
      );
    }

    if (type === 'video' && submission.recordingId) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Recording: {submission.recordingTitle}</p>
          <Button size="sm" variant="outline">
            <Play className="mr-2 h-4 w-4" />
            Watch Recording
          </Button>
        </div>
      );
    }

    return (
      <Button size="sm" variant="outline" asChild>
        <a href={submission.content} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          View Submission
        </a>
      </Button>
    );
  };

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{assignment.title}</DialogTitle>
              <DialogDescription className="mt-2">{assignment.description}</DialogDescription>
            </div>
            {mySubmission && (
              <Badge variant={feedbackGiven >= feedbackRequired ? 'default' : 'secondary'} className="ml-4">
                {feedbackGiven >= feedbackRequired ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" /> Complete
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-1 h-3 w-3" /> In Progress
                  </>
                )}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="submit" disabled={!!mySubmission}>
                {mySubmission ? 'Submitted' : 'Submit'}
              </TabsTrigger>
              <TabsTrigger value="submission" disabled={!mySubmission}>
                My Submission
              </TabsTrigger>
              {assignment.requiresPeerFeedback && (
                <TabsTrigger value="feedback">
                  Peer Feedback ({feedbackGiven}/{feedbackRequired})
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="details" className="mt-0 space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <p className="text-lg font-medium">{format(new Date(assignment.dueDate), 'MMMM d, yyyy')}</p>
                  </div>

                  {assignment.submissionType && (
                    <div>
                      <Label className="text-muted-foreground">Submission Type</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getTypeIcon(assignment.submissionType)}
                        <span className="capitalize">{assignment.submissionType}</span>
                      </div>
                    </div>
                  )}

                  {assignment.instructions && (
                    <div>
                      <Label className="text-muted-foreground">Instructions</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{assignment.instructions}</p>
                    </div>
                  )}

                  {assignment.requiresPeerFeedback && (
                    <div className="bg-muted p-4 rounded-md space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Peer Feedback Required
                      </h4>
                      <p className="text-sm">
                        You must provide feedback on {feedbackRequired} other student submissions.
                      </p>
                      {assignment.feedbackPerSubmissionLimit && (
                        <p className="text-sm text-muted-foreground">
                          Each submission can receive up to {assignment.feedbackPerSubmissionLimit} peer reviews.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="submit" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="content">
                      {assignment.submissionType === 'text' ? 'Your Response' : 'Link to Submission'}
                    </Label>
                    {assignment.submissionType === 'text' ? (
                      <Textarea
                        id="content"
                        value={submissionContent}
                        onChange={e => setSubmissionContent(e.target.value)}
                        placeholder="Type your response here..."
                        className="mt-2 min-h-[200px]"
                      />
                    ) : (
                      <Input
                        id="content"
                        value={submissionContent}
                        onChange={e => setSubmissionContent(e.target.value)}
                        placeholder="https://..."
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={submissionNotes}
                      onChange={e => setSubmissionNotes(e.target.value)}
                      placeholder="Add any notes or comments..."
                      className="mt-2"
                    />
                  </div>

                  <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Submit Assignment
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="submission" className="mt-0 space-y-4">
                {mySubmission && (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Your Submission</CardTitle>
                        <CardDescription>
                          Submitted on {format(new Date(mySubmission.submittedAt), 'MMMM d, yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {renderSubmissionContent(mySubmission)}

                        {mySubmission.notes && (
                          <div>
                            <Label className="text-muted-foreground">Notes</Label>
                            <p className="text-sm mt-1">{mySubmission.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {mySubmission.peerFeedback && mySubmission.peerFeedback.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Feedback Received ({feedbackReceived})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {mySubmission.peerFeedback.map((feedback, index) => (
                            <div key={feedback.id} className="space-y-2">
                              {index > 0 && <Separator />}
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-sm">{feedback.reviewerName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(feedback.createdAt), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <p className="text-sm bg-muted p-3 rounded-md">{feedback.content}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              {assignment.requiresPeerFeedback && (
                <TabsContent value="feedback" className="mt-0 space-y-4">
                  {!mySubmission ? (
                    <Card>
                      <CardContent className="flex items-center justify-center h-32">
                        <p className="text-muted-foreground text-center">
                          Submit your assignment first before giving peer feedback
                        </p>
                      </CardContent>
                    </Card>
                  ) : feedbackGiven >= feedbackRequired ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <p className="text-lg font-medium">Feedback Requirement Complete!</p>
                        <p className="text-sm text-muted-foreground">
                          You've provided feedback on {feedbackGiven} submissions
                        </p>
                      </CardContent>
                    </Card>
                  ) : feedbackSubmissions.length === 0 ? (
                    <Card>
                      <CardContent className="flex items-center justify-center h-32">
                        <p className="text-muted-foreground text-center">
                          No submissions available for feedback at this time
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Provide feedback on {feedbackRequired - feedbackGiven} more submission(s) to complete this assignment
                      </p>

                      {feedbackSubmissions.slice(0, feedbackRequired - feedbackGiven).map(submission => (
                        <Card key={submission.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{submission.studentName}</CardTitle>
                                <CardDescription>
                                  Submitted {format(new Date(submission.submittedAt), 'MMM d, yyyy')}
                                </CardDescription>
                              </div>
                              <Badge variant="outline">
                                {submission.peerFeedback?.length || 0} /{' '}
                                {assignment.feedbackPerSubmissionLimit || '∞'} feedback
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {renderSubmissionContent(submission)}

                            {submission.notes && (
                              <div>
                                <Label className="text-muted-foreground">Student Notes</Label>
                                <p className="text-sm mt-1 bg-muted p-3 rounded-md">{submission.notes}</p>
                              </div>
                            )}

                            <Separator />

                            <div className="space-y-2">
                              <Label htmlFor={`feedback-${submission.id}`}>Your Feedback</Label>
                              <Textarea
                                id={`feedback-${submission.id}`}
                                value={feedbackContent[submission.id] || ''}
                                onChange={e =>
                                  setFeedbackContent(prev => ({ ...prev, [submission.id]: e.target.value }))
                                }
                                placeholder="Provide constructive feedback on this submission..."
                                className="min-h-[100px]"
                              />
                              <Button
                                onClick={() => handleGiveFeedback(submission.id)}
                                disabled={isSubmitting}
                                size="sm"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Submit Feedback
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
