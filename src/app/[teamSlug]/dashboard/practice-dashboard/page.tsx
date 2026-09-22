'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Video, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import type { SavedSpeech, User, SpeechFeedback } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn, getRoleBasedColor, formatTime } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const SAVED_SPEECHES_STORAGE_KEY = 'work-session-saved-speeches';

export default function PracticeDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [viewingSpeech, setViewingSpeech] = React.useState<SavedSpeech | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = React.useState(false);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users');
  }, [firestore, user]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  const [savedRecordings, setSavedRecordings] = React.useState<SavedSpeech[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(SAVED_SPEECHES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_SPEECHES_STORAGE_KEY, JSON.stringify(savedRecordings));
    }
  }, [savedRecordings]);

  const recentRecordings = React.useMemo(() => {
    if (!user) return [];
    return savedRecordings
      .filter((s) => s.ownerId === user.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [user, savedRecordings]);

  const sharedRecordings = React.useMemo(() => {
    if (!user) return [];
    return savedRecordings
      .filter((s) => s.ownerId !== user.id && s.sharedWith?.includes(user.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user, savedRecordings]);

  const handleViewSpeech = (speech: SavedSpeech) => {
    setViewingSpeech(speech);
  };

  const handleOpenFeedback = (speech: SavedSpeech) => {
    setViewingSpeech(speech);
    setFeedbackDialogOpen(true);
    setFeedbackText('');
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim() || !viewingSpeech || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter feedback text.' });
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const newFeedback: SpeechFeedback = {
        id: `feedback-${Date.now()}`,
        authorId: user.id,
        authorName: user.name,
        content: feedbackText,
        timestamp: new Date().toISOString(),
      };

      const updatedSpeech = {
        ...viewingSpeech,
        feedback: [...(viewingSpeech.feedback || []), newFeedback],
      };

      setSavedRecordings((prev) =>
        prev.map((s) => (s.id === updatedSpeech.id ? updatedSpeech : s))
      );

      setViewingSpeech(updatedSpeech);
      toast({ title: 'Feedback Submitted', description: 'Your feedback has been added to this recording.' });
      setFeedbackDialogOpen(false);
      setFeedbackText('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit feedback.' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const isLoading = isAuthLoading || areUsersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Practice Hub</h1>
        <p className="text-muted-foreground">
          View your recent recordings and recordings shared with you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Recordings</CardTitle>
          <CardDescription>Your 10 most recent practice recordings.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRecordings.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {recentRecordings.map((speech) => (
                <AccordionItem value={speech.id} key={speech.id}>
                  <AccordionTrigger className="text-sm text-left">
                    <div className="flex-1 flex flex-col items-start gap-2">
                      <p>{speech.topic}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize text-xs">
                          {speech.mode}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(speech.date), 'PPP')}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Speech Time: {formatTime(speech.speechTime)}
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleViewSpeech(speech)}
                      >
                        <Video className="mr-2 h-4 w-4" /> View
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-4">
              No recordings yet. Start practicing to see your recordings here!
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shared with You</CardTitle>
          <CardDescription>
            Recordings that others have shared with you for feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sharedRecordings.length > 0 && allUsers ? (
            <Accordion type="single" collapsible className="w-full">
              {sharedRecordings.map((speech) => {
                const owner = allUsers.find((u) => u.id === speech.ownerId);
                return (
                  <AccordionItem value={speech.id} key={speech.id}>
                    <AccordionTrigger className="text-sm text-left">
                      <div className="flex-1 flex flex-col items-start gap-2">
                        <p>{speech.topic}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {speech.mode}
                          </Badge>
                          {owner && (
                            <p className="text-xs text-muted-foreground">
                              Shared by {owner.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(speech.date), 'PPP')}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          Speech Time: {formatTime(speech.speechTime)}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewSpeech(speech)}
                          >
                            <Video className="mr-2 h-4 w-4" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenFeedback(speech)}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" /> Give Feedback
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-4">
              No recordings have been shared with you yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Speech Dialog */}
      <Dialog
        open={!!viewingSpeech && !feedbackDialogOpen}
        onOpenChange={(open) => !open && setViewingSpeech(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{viewingSpeech?.topic}</DialogTitle>
            <DialogDescription>
              {viewingSpeech && allUsers && (
                <>
                  {viewingSpeech.ownerId === user?.id
                    ? 'Your recording'
                    : `Shared by ${allUsers.find((u) => u.id === viewingSpeech.ownerId)?.name || 'Unknown'}`}
                  {' · '}
                  {format(new Date(viewingSpeech.date), 'PPP')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video w-full bg-black rounded-md">
              <video
                src={viewingSpeech?.videoUrl}
                className="w-full h-full rounded-md object-cover"
                controls
              />
            </div>
            {viewingSpeech?.notes && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Notes:</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewingSpeech.notes}
                </p>
              </div>
            )}
            {viewingSpeech?.feedback && viewingSpeech.feedback.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Feedback:</h3>
                <div className="space-y-3">
                  {viewingSpeech.feedback.map((fb) => (
                    <div key={fb.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback
                            className={cn(
                              getRoleBasedColor(
                                allUsers?.find((u) => u.id === fb.authorId)?.role || 'novice'
                              )
                            )}
                          >
                            {fb.authorName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{fb.authorName}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(fb.timestamp), 'PPp')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{fb.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {viewingSpeech && viewingSpeech.ownerId !== user?.id && (
              <Button onClick={() => handleOpenFeedback(viewingSpeech)}>
                <MessageSquare className="mr-2 h-4 w-4" /> Give Feedback
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Feedback</DialogTitle>
            <DialogDescription>
              Share your thoughts and suggestions for this recording.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Write your feedback here..."
              className="min-h-[150px]"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmitFeedback} disabled={isSubmittingFeedback}>
              {isSubmittingFeedback ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
