'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirebase, useCollection, useDocument, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Save,
  Video,
} from 'lucide-react';
import type { Assignment, Submission, VideoFeedback } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  assignVideosToStudent,
  buildAssignmentCountMap,
  countWords,
  calculateAutoGrade,
} from '@/lib/feedback-assignment-utils';

interface FeedbackAssignmentViewProps {
  assignment: Assignment;
}

export function FeedbackAssignmentView({ assignment }: FeedbackAssignmentViewProps) {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isInitializing, setIsInitializing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = React.useState<Record<string, string>>({});

  // Fetch source assignment submissions
  const sourceSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !assignment.sourceAssignmentId) return null;
    return query(
      collection(firestore, 'submissions'),
      where('assignmentId', '==', assignment.sourceAssignmentId)
    );
  }, [firestore, assignment.sourceAssignmentId]);

  const { data: sourceSubmissions } = useCollection<Submission>(sourceSubmissionsQuery);

  // Fetch all feedback assignment submissions (to build assignment count map)
  const feedbackSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'submissions'),
      where('assignmentId', '==', assignment.id)
    );
  }, [firestore, assignment.id]);

  const { data: allFeedbackSubmissions } = useCollection<Submission>(feedbackSubmissionsQuery);

  // Find current user's feedback submission
  const mySubmission = React.useMemo(() => {
    return allFeedbackSubmissions?.find(s => s.studentId === user?.id);
  }, [allFeedbackSubmissions, user]);

  // Get assigned videos
  const assignedVideos = React.useMemo(() => {
    if (!mySubmission?.assignedSubmissionIds || !sourceSubmissions) return [];

    return mySubmission.assignedSubmissionIds
      .map(id => sourceSubmissions.find(s => s.id === id))
      .filter((s): s is Submission => s !== undefined);
  }, [mySubmission, sourceSubmissions]);

  // Initialize feedback drafts from existing feedback
  React.useEffect(() => {
    if (mySubmission?.videoFeedback) {
      const drafts: Record<string, string> = {};
      mySubmission.videoFeedback.forEach(vf => {
        drafts[vf.submissionId] = vf.content;
      });
      setFeedbackDrafts(drafts);
    }
  }, [mySubmission]);

  // Initialize assignment for new students
  const handleInitialize = async () => {
    if (!firestore || !user || !sourceSubmissions || !allFeedbackSubmissions) return;

    setIsInitializing(true);

    try {
      // Build existing assignment count map
      const countMap = buildAssignmentCountMap(allFeedbackSubmissions);

      // Assign videos to this student
      const result = assignVideosToStudent(
        user.id,
        sourceSubmissions,
        assignment.feedbackCount || 3,
        assignment.sourceClassPeriods || [],
        countMap
      );

      if (!result.success) {
        toast({
          title: 'Unable to Assign Videos',
          description: result.error,
          variant: 'destructive',
        });
        setIsInitializing(false);
        return;
      }

      // Create submission with assigned videos
      const submissionData: Partial<Submission> = {
        assignmentId: assignment.id,
        studentId: user.id,
        studentName: user.name,
        submittedAt: new Date().toISOString(),
        notes: '',
        type: 'feedback',
        assignedSubmissionIds: result.assignedIds,
        videoFeedback: [],
        classPeriod: user.classPeriod,
      };

      await addDoc(collection(firestore, 'submissions'), submissionData);

      toast({
        title: 'Videos Assigned',
        description: `You have been assigned ${result.assignedIds.length} videos to review.`,
      });
    } catch (error) {
      console.error('Error initializing feedback assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign videos. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Save feedback for a specific video
  const handleSaveFeedback = async (submissionId: string) => {
    if (!firestore || !user || !mySubmission) return;

    const feedbackContent = feedbackDrafts[submissionId] || '';
    const wordCount = countWords(feedbackContent);
    const minWords = assignment.minWordCount || 0;
    const isComplete = wordCount >= minWords;

    setIsSaving(true);

    try {
      const videoSubmission = assignedVideos.find(v => v.id === submissionId);
      if (!videoSubmission) return;

      // Find existing feedback for this video
      const existingFeedback = mySubmission.videoFeedback?.find(
        vf => vf.submissionId === submissionId
      );

      const newFeedback: VideoFeedback = {
        submissionId,
        studentName: videoSubmission.studentName,
        studentClassPeriod: videoSubmission.classPeriod,
        recordingTitle: videoSubmission.recordingTitle,
        content: feedbackContent,
        wordCount,
        isComplete,
        completedAt: isComplete && !existingFeedback?.completedAt
          ? new Date().toISOString()
          : existingFeedback?.completedAt,
        lastEditedAt: new Date().toISOString(),
      };

      // Update or add feedback
      const updatedFeedback = mySubmission.videoFeedback || [];
      const feedbackIndex = updatedFeedback.findIndex(vf => vf.submissionId === submissionId);

      if (feedbackIndex >= 0) {
        updatedFeedback[feedbackIndex] = newFeedback;
      } else {
        updatedFeedback.push(newFeedback);
      }

      // Calculate auto-grade if applicable
      let grade = mySubmission.grade;
      if (assignment.autoGrade && assignment.pointsPerCritique) {
        grade = calculateAutoGrade(updatedFeedback, assignment.pointsPerCritique);
      }

      // Update submission
      await updateDoc(doc(firestore, 'submissions', mySubmission.id), {
        videoFeedback: updatedFeedback,
        ...(assignment.autoGrade ? { grade } : {}),
      });

      toast({
        title: 'Feedback Saved',
        description: isComplete
          ? 'Your feedback has been saved and marked as complete.'
          : `Feedback saved. ${minWords - wordCount} more words needed to complete.`,
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to save feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate progress
  const completedCount = mySubmission?.videoFeedback?.filter(vf => vf.isComplete).length || 0;
  const totalCount = assignment.feedbackCount || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // If no submission exists yet, show initialization screen
  if (!mySubmission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Get Your Assigned Videos</CardTitle>
          <CardDescription>
            Click below to receive your assigned videos for feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You will be assigned {assignment.feedbackCount || 3} videos to watch and provide
              feedback on.
              {assignment.minWordCount && (
                <span>
                  {' '}
                  Each critique must be at least {assignment.minWordCount} words.
                </span>
              )}
            </AlertDescription>
          </Alert>

          <Button onClick={handleInitialize} disabled={isInitializing} className="w-full">
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning Videos...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Get My Assigned Videos
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Feedback Progress</span>
            <Badge variant={completedCount === totalCount ? 'default' : 'secondary'}>
              {completedCount} / {totalCount} Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2" />
          {assignment.autoGrade && assignment.pointsPerCritique && (
            <p className="text-sm text-muted-foreground mt-2">
              Current Grade: {mySubmission.grade || 0} / {totalCount * assignment.pointsPerCritique}{' '}
              points ({assignment.pointsPerCritique} points per complete critique)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assigned Videos */}
      <div className="space-y-4">
        {assignedVideos.map((video, index) => {
          const existingFeedback = mySubmission.videoFeedback?.find(
            vf => vf.submissionId === video.id
          );
          const draftContent = feedbackDrafts[video.id] || '';
          const wordCount = countWords(draftContent);
          const minWords = assignment.minWordCount || 0;
          const isComplete = existingFeedback?.isComplete || false;

          return (
            <Card key={video.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>Video {index + 1}</span>
                      {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {!isComplete && draftContent && <Clock className="h-5 w-5 text-yellow-500" />}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{video.studentName}</span>
                        {video.classPeriod && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              Period {video.classPeriod}
                            </Badge>
                          </>
                        )}
                      </div>
                      {video.recordingTitle && (
                        <div className="text-sm mt-1">{video.recordingTitle}</div>
                      )}
                    </CardDescription>
                  </div>
                  {isComplete && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="mr-1 h-3 w-3" /> Complete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Video Player / Link */}
                <Button variant="outline" className="w-full" asChild>
                  <a href={video.content || '#'} target="_blank" rel="noopener noreferrer">
                    <Play className="mr-2 h-4 w-4" />
                    Watch Video
                  </a>
                </Button>

                <Separator />

                {/* Feedback Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Your Feedback</label>
                    <span className="text-xs text-muted-foreground">
                      {wordCount} / {minWords > 0 ? `${minWords} min` : '∞'} words
                    </span>
                  </div>
                  <Textarea
                    value={draftContent}
                    onChange={(e) =>
                      setFeedbackDrafts(prev => ({ ...prev, [video.id]: e.target.value }))
                    }
                    placeholder="Provide constructive feedback on this speech..."
                    className="min-h-[150px]"
                  />
                  {minWords > 0 && wordCount < minWords && (
                    <p className="text-xs text-muted-foreground">
                      {minWords - wordCount} more words needed for credit
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleSaveFeedback(video.id)}
                  disabled={isSaving}
                  className="w-full"
                  variant={isComplete ? 'outline' : 'default'}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isComplete ? 'Update Feedback' : 'Save Feedback'}
                    </>
                  )}
                </Button>

                {existingFeedback?.lastEditedAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Last edited: {new Date(existingFeedback.lastEditedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
