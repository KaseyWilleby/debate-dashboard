'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Video, FilterX, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { SavedSpeech, User, PracticeMode, Assignment, Submission } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { cn, getRoleBasedColor, formatTime } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SAVED_SPEECHES_STORAGE_KEY = 'work-session-saved-speeches';

const eventTypes: PracticeMode[] = [
  'extemp',
  'impromptu',
  'congress',
  'informative',
  'oratory',
  'humorous',
  'dramatic',
  'duo',
  'duet',
  'prose',
  'poetry',
];

export default function VideoDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();
  const [viewingSpeech, setViewingSpeech] = React.useState<SavedSpeech | null>(null);

  // Fetch all users from team
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(collection(firestore, 'users'), where('teamId', '==', user.teamId));
  }, [firestore, user]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  // Fetch all recordings from team
  const recordingsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(collection(firestore, 'savedSpeeches'), where('teamId', '==', user.teamId));
  }, [firestore, user]);
  const { data: savedRecordings, isLoading: areRecordingsLoading } = useCollection<SavedSpeech>(recordingsQuery);

  // Fetch all assignments from team
  const assignmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(collection(firestore, 'assignments'), where('teamId', '==', user.teamId));
  }, [firestore, user]);
  const { data: assignments } = useCollection<Assignment>(assignmentsQuery);

  // Fetch all submissions from team
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return collection(firestore, 'submissions');
  }, [firestore, user]);
  const { data: allSubmissions } = useCollection<Submission>(submissionsQuery);

  const [filters, setFilters] = React.useState<{
    event: string;
    userId: string;
    classPeriod: string;
    assignment: string;
    date: Date | undefined;
  }>({
    event: 'all',
    userId: 'all',
    classPeriod: 'all',
    assignment: 'all',
    date: undefined,
  });

  // Get unique class periods from users
  const classPeriods = React.useMemo(() => {
    if (!allUsers) return [];
    const periods = new Set(allUsers.map(u => u.classPeriod).filter(Boolean));
    return Array.from(periods).sort();
  }, [allUsers]);

  // Create a map of recording ID to submission status
  const recordingSubmissionMap = React.useMemo(() => {
    if (!allSubmissions) return new Map();
    const map = new Map<string, Submission[]>();
    allSubmissions.forEach(sub => {
      const existing = map.get(sub.recordingId) || [];
      map.set(sub.recordingId, [...existing, sub]);
    });
    return map;
  }, [allSubmissions]);

  const filteredRecordings = React.useMemo(() => {
    if (!savedRecordings) return [];

    return savedRecordings
      .filter((recording) => {
        // Event type filter
        const eventMatch = filters.event === 'all' || recording.mode === filters.event;

        // User filter
        const userMatch = filters.userId === 'all' || recording.ownerId === filters.userId;

        // Date filter
        const dateMatch =
          !filters.date ||
          new Date(recording.date).toDateString() === filters.date.toDateString();

        // Class period filter
        let classPeriodMatch = true;
        if (filters.classPeriod !== 'all' && allUsers) {
          const owner = allUsers.find(u => u.id === recording.ownerId);
          classPeriodMatch = owner?.classPeriod === filters.classPeriod;
        }

        // Assignment filter
        let assignmentMatch = true;
        if (filters.assignment !== 'all') {
          const submissions = recordingSubmissionMap.get(recording.id) || [];

          if (filters.assignment === 'submitted') {
            assignmentMatch = submissions.length > 0;
          } else if (filters.assignment === 'unsubmitted') {
            assignmentMatch = submissions.length === 0;
          } else {
            // Specific assignment ID
            assignmentMatch = submissions.some(sub => sub.assignmentId === filters.assignment);
          }
        }

        return eventMatch && userMatch && dateMatch && classPeriodMatch && assignmentMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [savedRecordings, filters, allUsers, recordingSubmissionMap]);

  const handleReset = () => {
    setFilters({ event: 'all', userId: 'all', classPeriod: 'all', assignment: 'all', date: undefined });
  };

  const handleViewSpeech = (speech: SavedSpeech) => {
    setViewingSpeech(speech);
  };

  const isLoading = isAuthLoading || areUsersLoading || areRecordingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'coach' && user?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Access denied. This page is only available to coaches and administrators.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Video Dashboard</h1>
        <p className="text-muted-foreground">
          View and manage all practice recordings from all users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">Filter Recordings</CardTitle>
          <CardDescription>
            Filter by event type, student, class period, assignment status, or date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                value={filters.event}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, event: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by event..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes.map((event) => (
                    <SelectItem key={event} value={event} className="capitalize">
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.userId}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, userId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by student..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {allUsers?.filter(u => u.role !== 'coach' && u.role !== 'superadmin').map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.classPeriod}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, classPeriod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by class period..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {classPeriods.map((period) => (
                    <SelectItem key={period} value={period!}>
                      {period === 'Club' ? 'Club' : `${period}${period === '1' ? 'st' : period === '2' ? 'nd' : period === '3' ? 'rd' : 'th'} Period`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.assignment}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, assignment: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by assignment..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recordings</SelectItem>
                  <SelectItem value="submitted">Submitted to Any Assignment</SelectItem>
                  <SelectItem value="unsubmitted">Not Submitted</SelectItem>
                  {assignments && assignments.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Specific Assignments</div>
                      {assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.title}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !filters.date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.date ? format(filters.date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.date}
                    onSelect={(date) =>
                      setFilters((prev) => ({ ...prev, date: date || undefined }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <FilterX size={16} />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Recordings ({filteredRecordings.length})</CardTitle>
          <CardDescription>
            {filters.event !== 'all' || filters.userId !== 'all' || filters.classPeriod !== 'all' || filters.assignment !== 'all' || filters.date
              ? 'Filtered recordings'
              : 'All practice recordings from your team'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecordings.length > 0 && allUsers ? (
            <Accordion type="single" collapsible className="w-full">
              {filteredRecordings.map((speech) => {
                const owner = allUsers.find((u) => u.id === speech.ownerId);
                const submissions = recordingSubmissionMap.get(speech.id) || [];
                return (
                  <AccordionItem value={speech.id} key={speech.id}>
                    <AccordionTrigger className="text-sm text-left">
                      <div className="flex-1 flex flex-col items-start gap-2">
                        <p>{speech.topic}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {speech.mode}
                          </Badge>
                          {owner && (
                            <div className="flex items-center gap-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback
                                  className={cn(getRoleBasedColor(owner.role), 'text-[10px]')}
                                >
                                  {owner.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {owner.name}
                              </span>
                              {owner.classPeriod && (
                                <Badge variant="outline" className="text-xs ml-1">
                                  {owner.classPeriod === 'Club' ? 'Club' : `Period ${owner.classPeriod}`}
                                </Badge>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(speech.date), 'PPP')}
                          </p>
                          {submissions.length > 0 && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Submitted ({submissions.length})
                            </Badge>
                          )}
                          {speech.sharedWith && speech.sharedWith.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Shared with {speech.sharedWith.length}
                            </Badge>
                          )}
                          {speech.feedback && speech.feedback.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {speech.feedback.length} feedback
                            </Badge>
                          )}
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
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-4">
              {filters.event !== 'all' || filters.userId !== 'all' || filters.classPeriod !== 'all' || filters.assignment !== 'all' || filters.date
                ? 'No recordings match your filters.'
                : 'No recordings available from your team yet.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Speech Dialog */}
      <Dialog open={!!viewingSpeech} onOpenChange={(open) => !open && setViewingSpeech(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{viewingSpeech?.topic}</DialogTitle>
            <DialogDescription>
              {viewingSpeech && allUsers && (
                <>
                  By {allUsers.find((u) => u.id === viewingSpeech.ownerId)?.name || 'Unknown'}
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
            {viewingSpeech?.sharedWith && viewingSpeech.sharedWith.length > 0 && allUsers && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Shared With:</h3>
                <div className="flex flex-wrap gap-2">
                  {viewingSpeech.sharedWith.map((userId) => {
                    const sharedUser = allUsers.find((u) => u.id === userId);
                    if (!sharedUser) return null;
                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-2 text-sm border rounded-md px-2 py-1"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback
                            className={cn(getRoleBasedColor(sharedUser.role), 'text-[10px]')}
                          >
                            {sharedUser.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{sharedUser.name}</span>
                      </div>
                    );
                  })}
                </div>
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
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
