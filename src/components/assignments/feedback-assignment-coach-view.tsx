'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  User,
} from 'lucide-react';
import type { Assignment, Submission, SavedSpeech } from '@/lib/types';
import { format } from 'date-fns';

interface FeedbackAssignmentCoachViewProps {
  assignment: Assignment;
}

export function FeedbackAssignmentCoachView({ assignment }: FeedbackAssignmentCoachViewProps) {
  const { firestore } = useFirebase();

  // Fetch all feedback submissions for this assignment
  const feedbackSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'submissions'),
      where('assignmentId', '==', assignment.id)
    );
  }, [firestore, assignment.id]);

  const { data: submissions, isLoading } = useCollection<Submission>(feedbackSubmissionsQuery);

  // Debug: log submissions to see what data we have
  React.useEffect(() => {
    if (submissions) {
      console.log('Coach view - submissions:', submissions);
      submissions.forEach(sub => {
        console.log(`Submission ${sub.id}:`, {
          studentName: sub.studentName,
          videoFeedback: sub.videoFeedback,
          assignedSubmissionIds: sub.assignedSubmissionIds,
          isComplete: sub.isComplete
        });
      });
    }
  }, [submissions]);

  // Fetch source submissions to get video info
  const sourceSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !assignment.sourceAssignmentId) return null;
    return query(
      collection(firestore, 'submissions'),
      where('assignmentId', '==', assignment.sourceAssignmentId)
    );
  }, [firestore, assignment.sourceAssignmentId]);

  const { data: sourceSubmissions } = useCollection<Submission>(sourceSubmissionsQuery);

  // Fetch saved speeches for video links
  const { data: allRecordings } = useCollection<SavedSpeech>(
    useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'savedSpeeches');
    }, [firestore])
  );

  // Build map of recording IDs to recordings
  const recordingsMap = React.useMemo(() => {
    const map = new Map<string, SavedSpeech>();
    if (allRecordings) {
      allRecordings.forEach(rec => map.set(rec.id, rec));
    }
    return map;
  }, [allRecordings]);

  // Build map of submission IDs to source submissions
  const sourceMap = React.useMemo(() => {
    const map = new Map<string, Submission>();
    if (sourceSubmissions) {
      sourceSubmissions.forEach(sub => map.set(sub.id, sub));
    }
    return map;
  }, [sourceSubmissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No submissions yet</p>
          <p className="text-sm text-muted-foreground">
            Students haven't started this assignment yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map(submission => {
        const completedCount = submission.videoFeedback?.filter(vf => vf.isComplete).length || 0;
        const totalCount = submission.assignedSubmissionIds?.length || 0;
        const isComplete = submission.isComplete || false;

        return (
          <Card key={submission.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {submission.studentName}
                    {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {!isComplete && <Clock className="h-5 w-5 text-yellow-500" />}
                  </CardTitle>
                  <CardDescription>
                    {submission.classPeriod && `Period ${submission.classPeriod} • `}
                    {completedCount} / {totalCount} critiques completed
                    {assignment.autoGrade && ` • Grade: ${submission.grade || 0}/${assignment.maxPoints || 100}`}
                  </CardDescription>
                </div>
                <Badge variant={isComplete ? 'default' : 'secondary'}>
                  {isComplete ? 'Submitted' : 'In Progress'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {submission.videoFeedback && submission.videoFeedback.length > 0 ? (
                <div className="space-y-4">
                  {submission.videoFeedback.map((feedback, index) => {
                    const sourceSubmission = sourceMap.get(feedback.submissionId);
                    const recording = sourceSubmission?.recordingId
                      ? recordingsMap.get(sourceSubmission.recordingId)
                      : null;

                    return (
                      <div key={feedback.submissionId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Video {index + 1}: {feedback.studentName}</span>
                              {feedback.studentClassPeriod && (
                                <Badge variant="outline" className="text-xs">
                                  Period {feedback.studentClassPeriod}
                                </Badge>
                              )}
                            </div>
                            {feedback.recordingTitle && (
                              <p className="text-sm text-muted-foreground">{feedback.recordingTitle}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {recording?.videoUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={recording.videoUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Video
                                </a>
                              </Button>
                            )}
                            <Badge variant={feedback.isComplete ? 'default' : 'secondary'}>
                              {feedback.wordCount || 0} words
                            </Badge>
                          </div>
                        </div>

                        <div className="bg-muted/50 rounded p-3">
                          <p className="text-sm font-medium mb-2">Feedback:</p>
                          <ScrollArea className="max-h-[200px]">
                            <p className="text-sm whitespace-pre-wrap">
                              {feedback.content || 'No feedback provided yet'}
                            </p>
                          </ScrollArea>
                        </div>

                        {feedback.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            Completed: {format(new Date(feedback.completedAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No feedback submitted yet</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
