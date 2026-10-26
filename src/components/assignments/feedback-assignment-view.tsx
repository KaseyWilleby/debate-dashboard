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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Assignment, Submission, VideoFeedback, SavedSpeech } from '@/lib/types';
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
  const [currentVideoIndex, setCurrentVideoIndex] = React.useState(0);

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

  // Fetch SavedSpeech documents for assigned videos
  const recordingIds = React.useMemo(() => {
    return assignedVideos
      .map(v => v.recordingId)
      .filter((id): id is string => !!id);
  }, [assignedVideos]);

  const recordingsQuery = useMemoFirebase(() => {
    if (!firestore || recordingIds.length === 0) return null;
    return collection(firestore, 'savedSpeeches');
  }, [firestore, recordingIds]);

  const { data: allRecordings } = useCollection<SavedSpeech>(recordingsQuery);

  // Map recordings by ID for quick lookup
  const recordingsMap = React.useMemo(() => {
    const map = new Map<string, SavedSpeech>();
    if (allRecordings) {
      allRecordings.forEach(rec => {
        map.set(rec.id, rec);
      });
    }
    return map;
  }, [allRecordings]);

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
        description: result.warning
          ? `${result.warning}. You have been assigned ${result.assignedIds.length} video${result.assignedIds.length === 1 ? '' : 's'} to review.`
          : `You have been assigned ${result.assignedIds.length} video${result.assignedIds.length === 1 ? '' : 's'} to review.`,
        variant: result.warning ? 'default' : undefined,
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
      if (assignment.autoGrade) {
        const assignedCount = mySubmission.assignedSubmissionIds?.length || 0;
        const maxPoints = assignment.maxPoints || 100;
        grade = calculateAutoGrade(updatedFeedback, assignedCount, maxPoints);
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
    <div className="space-y-6 max-w-none w-full">
      {/* Progress Overview */}
      <Card className="max-w-none">
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
          {assignment.autoGrade && (
            (() => {
              const assignedCount = mySubmission?.assignedSubmissionIds?.length || totalCount;
              const maxPoints = assignment.maxPoints || 100;
              const pointsPerCritique = assignedCount > 0 ? Math.round((maxPoints / assignedCount) * 100) / 100 : 0;
              return (
                <p className="text-sm text-muted-foreground mt-2">
                  Current Grade: {mySubmission.grade || 0} / {maxPoints}{' '}
                  points ({pointsPerCritique} points per complete critique)
                </p>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Assigned Videos with Horizontal Navigation */}
      {assignedVideos.length > 0 && (() => {
        const video = assignedVideos[currentVideoIndex];
        const existingFeedback = mySubmission.videoFeedback?.find(
          vf => vf.submissionId === video.id
        );
        const draftContent = feedbackDrafts[video.id] || '';
        const wordCount = countWords(draftContent);
        const minWords = assignment.minWordCount || 0;
        const isComplete = existingFeedback?.isComplete || false;

        return (
          <div className="space-y-4">
            {/* Navigation Controls */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentVideoIndex(prev => Math.max(0, prev - 1))}
                disabled={currentVideoIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {assignedVideos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVideoIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentVideoIndex
                        ? 'w-8 bg-primary'
                        : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to video ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentVideoIndex(prev => Math.min(assignedVideos.length - 1, prev + 1))}
                disabled={currentVideoIndex === assignedVideos.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Current Video Card - Full Width */}
            <Card className="w-full max-w-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>Video {currentVideoIndex + 1} of {assignedVideos.length}</span>
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
              <CardContent className="p-4 pt-0">
                {/* Side-by-side layout - video takes 75%, feedback takes 25% */}
                <div className="grid lg:grid-cols-[3fr_1fr] gap-4">
                  {/* Video Player */}
                  <div className="flex items-center justify-center">
                    {(() => {
                      const recording = video.recordingId ? recordingsMap.get(video.recordingId) : null;
                      const videoUrl = recording?.videoUrl || video.content || '#';
                      const hasValidUrl = videoUrl !== '#';

                      return hasValidUrl ? (
                        <div className="w-full bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                          <video
                            controls
                            className="w-full max-h-[calc(100vh-320px)] object-contain"
                            src={videoUrl}
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                          <div className="text-center text-muted-foreground">
                            <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Video Unavailable</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Feedback Area */}
                  <div className="flex flex-col gap-3" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                    <Separator className="lg:hidden" />

                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                      <div className="flex items-center justify-between flex-shrink-0">
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
                        className="resize-none"
                        style={{ height: 'calc(100vh - 480px)', minHeight: '200px' }}
                      />
                      {minWords > 0 && wordCount < minWords && (
                        <p className="text-xs text-muted-foreground flex-shrink-0">
                          {minWords - wordCount} more words needed for credit
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => handleSaveFeedback(video.id)}
                      disabled={isSaving}
                      className="w-full flex-shrink-0"
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
                      <p className="text-xs text-muted-foreground text-center flex-shrink-0">
                        Last edited: {new Date(existingFeedback.lastEditedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
