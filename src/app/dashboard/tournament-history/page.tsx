'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trophy, PlusCircle, Trash2, Edit, Calendar, BarChart3, Loader2, Download, History, CheckCircle2 } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import type { TournamentResult, PlacementType, User, Tournament } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { extractTournamentResults } from '@/ai/flows/extract-tournament-results-flow';

const TOURNAMENT_RESULTS_STORAGE_KEY = 'tournament-results';

const placementOptions: { value: PlacementType; label: string; color: string }[] = [
  { value: 'champion', label: 'Champion', color: 'bg-yellow-500' },
  { value: 'finalist', label: 'Finalist', color: 'bg-gray-400' },
  { value: 'semifinalist', label: 'Semifinalist', color: 'bg-orange-500' },
  { value: 'quarterfinalist', label: 'Quarterfinalist', color: 'bg-blue-500' },
  { value: 'octafinalist', label: 'Octafinalist', color: 'bg-green-500' },
  { value: 'double-octafinalist', label: 'Double-Octafinalist', color: 'bg-purple-500' },
  { value: 'speaker-award', label: 'Speaker Award', color: 'bg-pink-500' },
  { value: 'top-speaker', label: 'Top Speaker', color: 'bg-yellow-400' },
  { value: 'preliminary-advancement', label: 'Cleared Prelims', color: 'bg-cyan-500' },
  { value: 'participated', label: 'Participated', color: 'bg-gray-500' },
  { value: 'other', label: 'Other', color: 'bg-indigo-500' },
];

const allEvents = [
  'LD', 'PF', 'CX', 'WSD',
  'USX', 'IX', 'FX', 'DX',
  'OO', 'INFO',
  'HI', 'DI', 'Duo', 'Duet', 'Prose', 'Poetry',
  'Congress',
  'Other'
];

export default function TournamentHistoryPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'tournaments');
  }, [firestore, user]);
  const { data: tournaments } = useCollection<Tournament>(tournamentsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users');
  }, [firestore, user]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const [results, setResults] = React.useState<TournamentResult[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(TOURNAMENT_RESULTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOURNAMENT_RESULTS_STORAGE_KEY, JSON.stringify(results));
    }
  }, [results]);

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingResult, setEditingResult] = React.useState<TournamentResult | null>(null);
  const [activeTab, setActiveTab] = React.useState<'results' | 'tournaments' | 'stats'>('results');
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');

  // Form state
  const [formData, setFormData] = React.useState({
    tournamentId: '',
    tournamentName: '',
    event: '',
    placement: '' as PlacementType | '',
    placementDetail: '',
    partnerId: '',
    preliminaryRecord: '',
    speakerPoints: '',
    speakerRank: '',
    totalCompetitors: '',
    breakingCompetitors: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  const resetForm = () => {
    setFormData({
      tournamentId: '',
      tournamentName: '',
      event: '',
      placement: '' as PlacementType | '',
      placementDetail: '',
      partnerId: '',
      preliminaryRecord: '',
      speakerPoints: '',
      speakerRank: '',
      totalCompetitors: '',
      breakingCompetitors: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingResult(null);
  };

  // Get all past tournaments (regardless of registration status)
  const pastTournaments = React.useMemo(() => {
    if (!tournaments || !user) return [];

    const today = startOfDay(new Date());

    return tournaments
      .filter(t => {
        const tournDate = startOfDay(parseISO(t.date));
        const isPast = isBefore(tournDate, today) || tournDate.getTime() === today.getTime();
        return isPast; // Show all past tournaments, not just ones where user was registered
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [tournaments, user]);

  // Check if user has added results for a tournament
  const hasResultsFor = (tournamentId: string) => {
    if (!user) return false;
    return results.some(r => r.tournamentId === tournamentId && r.userId === user.id);
  };

  const handleImportFromTabroom = async (tournament: Tournament) => {
    if (!user) return;

    // Check if user has NSDA ID for matching
    if (!user.nsdaId) {
      toast({
        title: 'NSDA ID Required',
        description: 'Please add your NSDA ID in Settings to import results from Tabroom.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Importing Results',
      description: `Fetching your results from Tabroom for ${tournament.name}...`,
    });

    // TODO: Implement Tabroom results scraping
    // For now, show a message that this feature is coming soon
    setTimeout(() => {
      toast({
        title: 'Feature Coming Soon',
        description: 'Automatic result import from Tabroom is being implemented. For now, please use "Add Results" to enter manually.',
      });
    }, 1500);
  };

  const handleImportFromTournament = (tournament: Tournament) => {
    if (!user) return;

    const userEntry = tournament.entries.find(e => e.id === user.id);

    // Pre-fill with first event if only one and user is registered
    const firstEvent = userEntry?.events[0];

    setFormData({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      event: userEntry && userEntry.events.length === 1 ? firstEvent : '',
      placement: '' as PlacementType | '',
      placementDetail: '',
      partnerId: '',
      preliminaryRecord: '',
      speakerPoints: '',
      speakerRank: '',
      totalCompetitors: '',
      breakingCompetitors: '',
      notes: '',
      date: tournament.date,
    });

    setIsAddDialogOpen(true);

    toast({
      title: 'Tournament Loaded',
      description: `Ready to add results for ${tournament.name}`,
    });
  };

  const handleBulkImport = () => {
    if (!user) return;

    const tournamentsNeedingResults = pastTournaments.filter(t => !hasResultsFor(t.id));

    if (tournamentsNeedingResults.length === 0) {
      toast({
        title: 'All Set!',
        description: 'You have already added results for all past tournaments.',
      });
      return;
    }

    // Start with the first tournament needing results
    handleImportFromTournament(tournamentsNeedingResults[0]);
  };

  const handleAddResult = () => {
    if (!user) return;
    if (!formData.tournamentName || !formData.event || !formData.placement || !formData.date) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in tournament name, event, placement, and date.',
        variant: 'destructive',
      });
      return;
    }

    const partnerName = formData.partnerId
      ? allUsers?.find(u => u.id === formData.partnerId)?.name
      : undefined;

    const newResult: TournamentResult = {
      id: editingResult?.id || `result-${Date.now()}`,
      tournamentId: formData.tournamentId,
      tournamentName: formData.tournamentName,
      userId: user.id,
      event: formData.event,
      placement: formData.placement as PlacementType,
      placementDetail: formData.placementDetail || undefined,
      partnerId: formData.partnerId || undefined,
      partnerName,
      preliminaryRecord: formData.preliminaryRecord || undefined,
      speakerPoints: formData.speakerPoints ? parseFloat(formData.speakerPoints) : undefined,
      speakerRank: formData.speakerRank ? parseInt(formData.speakerRank) : undefined,
      totalCompetitors: formData.totalCompetitors ? parseInt(formData.totalCompetitors) : undefined,
      breakingCompetitors: formData.breakingCompetitors ? parseInt(formData.breakingCompetitors) : undefined,
      notes: formData.notes || undefined,
      date: formData.date,
      createdAt: editingResult?.createdAt || new Date().toISOString(),
    };

    if (editingResult) {
      setResults(results.map(r => r.id === editingResult.id ? newResult : r));
      toast({ title: 'Result Updated', description: 'Tournament result has been updated.' });
    } else {
      setResults([newResult, ...results]);
      toast({ title: 'Result Added', description: 'Tournament result has been added.' });
    }

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditResult = (result: TournamentResult) => {
    setEditingResult(result);
    setFormData({
      tournamentId: result.tournamentId,
      tournamentName: result.tournamentName,
      event: result.event,
      placement: result.placement,
      placementDetail: result.placementDetail || '',
      partnerId: result.partnerId || '',
      preliminaryRecord: result.preliminaryRecord || '',
      speakerPoints: result.speakerPoints?.toString() || '',
      speakerRank: result.speakerRank?.toString() || '',
      totalCompetitors: result.totalCompetitors?.toString() || '',
      breakingCompetitors: result.breakingCompetitors?.toString() || '',
      notes: result.notes || '',
      date: result.date,
    });
    setIsAddDialogOpen(true);
  };

  const handleDeleteResult = (id: string) => {
    setResults(results.filter(r => r.id !== id));
    toast({ title: 'Result Deleted', description: 'Tournament result has been removed.' });
  };

  // Filter results based on user role
  const displayedResults = React.useMemo(() => {
    if (!user) return [];

    let filtered = results;

    if (user.role === 'admin') {
      if (selectedUserId && selectedUserId !== 'all') {
        filtered = results.filter(r => r.userId === selectedUserId);
      }
    } else {
      filtered = results.filter(r => r.userId === user.id);
    }

    return filtered.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [results, user, selectedUserId]);

  // Statistics
  const stats = React.useMemo(() => {
    const eventStats: Record<string, { total: number; champion: number; finalist: number; break: number }> = {};

    displayedResults.forEach(result => {
      if (!eventStats[result.event]) {
        eventStats[result.event] = { total: 0, champion: 0, finalist: 0, break: 0 };
      }
      eventStats[result.event].total++;
      if (result.placement === 'champion') eventStats[result.event].champion++;
      if (result.placement === 'finalist') eventStats[result.event].finalist++;
      if (['champion', 'finalist', 'semifinalist', 'quarterfinalist', 'octafinalist', 'double-octafinalist', 'preliminary-advancement'].includes(result.placement)) {
        eventStats[result.event].break++;
      }
    });

    const totalTournaments = displayedResults.length;
    const totalChampionships = displayedResults.filter(r => r.placement === 'champion').length;
    const totalFinalist = displayedResults.filter(r => r.placement === 'finalist').length;
    const totalBreaks = displayedResults.filter(r =>
      ['champion', 'finalist', 'semifinalist', 'quarterfinalist', 'octafinalist', 'double-octafinalist', 'preliminary-advancement'].includes(r.placement)
    ).length;

    return { eventStats, totalTournaments, totalChampionships, totalFinalist, totalBreaks };
  }, [displayedResults]);

  const getPlacementColor = (placement: PlacementType) => {
    return placementOptions.find(p => p.value === placement)?.color || 'bg-gray-500';
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const tournamentsNeedingResults = pastTournaments.filter(t => !hasResultsFor(t.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Tournament History</h1>
          <p className="text-muted-foreground">
            {isAdmin && selectedUserId && selectedUserId !== 'all'
              ? `Viewing results for ${allUsers?.find(u => u.id === selectedUserId)?.name}`
              : isAdmin
                ? 'View and manage all tournament results'
                : 'Track your tournament results and performance'}
          </p>
        </div>
        <div className="flex gap-2">
          {tournamentsNeedingResults.length > 0 && (
            <Button onClick={handleBulkImport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Quick Add ({tournamentsNeedingResults.length})
            </Button>
          )}
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} variant="default">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Results
          </Button>
        </div>
      </div>

      {/* Admin user filter */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter by User</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedUserId || 'all'} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {allUsers?.filter(u => u.approved).map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'results' | 'tournaments' | 'stats')}>
        <TabsList>
          <TabsTrigger value="results"><Trophy className="mr-2 h-4 w-4" />Results</TabsTrigger>
          <TabsTrigger value="tournaments"><History className="mr-2 h-4 w-4" />Past Tournaments</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="mr-2 h-4 w-4" />Statistics</TabsTrigger>
        </TabsList>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {displayedResults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Results Yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isAdmin && selectedUserId && selectedUserId !== 'all'
                    ? 'This user has no tournament results yet.'
                    : 'Start tracking tournament performance by adding results.'}
                </p>
                <div className="flex gap-2 mt-4">
                  {tournamentsNeedingResults.length > 0 && (
                    <Button onClick={handleBulkImport} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Quick Add from Past Tournaments
                    </Button>
                  )}
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Results
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            displayedResults.map(result => {
              const resultUser = allUsers?.find(u => u.id === result.userId);
              return (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle>{result.tournamentName}</CardTitle>
                          <Badge className={cn('text-white', getPlacementColor(result.placement))}>
                            {placementOptions.find(p => p.value === result.placement)?.label}
                          </Badge>
                          {isAdmin && resultUser && (
                            <Badge variant="outline">{resultUser.name}</Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(result.date), 'MMMM d, yyyy')}
                        </CardDescription>
                      </div>
                      {(!isAdmin || result.userId === user?.id) && (
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" onClick={() => handleEditResult(result)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Result?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this tournament result. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteResult(result.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Event</p>
                        <p className="font-medium">{result.event}</p>
                      </div>
                      {result.placementDetail && (
                        <div>
                          <p className="text-muted-foreground">Detail</p>
                          <p className="font-medium">{result.placementDetail}</p>
                        </div>
                      )}
                      {result.partnerName && (
                        <div>
                          <p className="text-muted-foreground">Partner</p>
                          <p className="font-medium">{result.partnerName}</p>
                        </div>
                      )}
                      {result.preliminaryRecord && (
                        <div>
                          <p className="text-muted-foreground">Prelim Record</p>
                          <p className="font-medium">{result.preliminaryRecord}</p>
                        </div>
                      )}
                      {result.speakerRank && result.totalCompetitors && (
                        <div>
                          <p className="text-muted-foreground">Speaker Rank</p>
                          <p className="font-medium">{result.speakerRank} of {result.totalCompetitors}</p>
                        </div>
                      )}
                      {result.speakerPoints && (
                        <div>
                          <p className="text-muted-foreground">Speaker Points</p>
                          <p className="font-medium">{result.speakerPoints}</p>
                        </div>
                      )}
                    </div>
                    {result.notes && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm mt-1">{result.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Past Tournaments Tab */}
        <TabsContent value="tournaments" className="space-y-4">
          {pastTournaments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Past Tournaments</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  You haven't attended any tournaments yet, or they haven't been added to the system.
                </p>
              </CardContent>
            </Card>
          ) : (
            pastTournaments.map(tournament => {
              const userEntry = tournament.entries.find(e => e.id === user?.id);
              const hasResults = hasResultsFor(tournament.id);

              return (
                <Card key={tournament.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle>{tournament.name}</CardTitle>
                          {hasResults && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Results Added
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(tournament.date), 'MMMM d, yyyy')}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {tournament.webpageUrl && (
                          <Button
                            onClick={() => handleImportFromTabroom(tournament)}
                            variant="default"
                            disabled={!tournament.webpageUrl}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Import from Tabroom
                          </Button>
                        )}
                        <Button
                          onClick={() => handleImportFromTournament(tournament)}
                          variant="outline"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Results
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {userEntry && userEntry.events.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Your Events:</p>
                        <div className="flex flex-wrap gap-2">
                          {userEntry.events.map(event => (
                            <Badge key={event} variant="outline">{event}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No registration found. You can still add results manually.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTournaments}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Championships</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{stats.totalChampionships}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Finals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-400">{stats.totalFinalist}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Breaks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.totalBreaks}</div>
              </CardContent>
            </Card>
          </div>

          {Object.keys(stats.eventStats).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance by Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.eventStats).map(([event, data]) => (
                    <div key={event} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{event}</span>
                        <span className="text-sm text-muted-foreground">
                          {data.total} tournament{data.total !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="p-2 bg-yellow-500/10 rounded">
                          <p className="text-muted-foreground">Champions</p>
                          <p className="font-bold">{data.champion}</p>
                        </div>
                        <div className="p-2 bg-gray-400/10 rounded">
                          <p className="text-muted-foreground">Finals</p>
                          <p className="font-bold">{data.finalist}</p>
                        </div>
                        <div className="p-2 bg-green-500/10 rounded">
                          <p className="text-muted-foreground">Breaks</p>
                          <p className="font-bold">{data.break}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Break rate: {data.total > 0 ? Math.round((data.break / data.total) * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResult ? 'Edit' : 'Add'} Tournament Result</DialogTitle>
            <DialogDescription>
              Record tournament performance and track progress.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tournamentName">Tournament Name *</Label>
                <Input
                  id="tournamentName"
                  value={formData.tournamentName}
                  onChange={(e) => setFormData({ ...formData, tournamentName: e.target.value })}
                  placeholder="e.g., TFA State"
                  disabled={!!formData.tournamentId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={!!formData.tournamentId}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event">Event *</Label>
                <Select value={formData.event} onValueChange={(v) => setFormData({ ...formData, event: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEvents.map(event => (
                      <SelectItem key={event} value={event}>{event}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="placement">Placement *</Label>
                <Select
                  value={formData.placement}
                  onValueChange={(v) => setFormData({ ...formData, placement: v as PlacementType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select placement" />
                  </SelectTrigger>
                  <SelectContent>
                    {placementOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placementDetail">Placement Detail</Label>
              <Input
                id="placementDetail"
                value={formData.placementDetail}
                onChange={(e) => setFormData({ ...formData, placementDetail: e.target.value })}
                placeholder="e.g., 1st Place, 3rd Speaker, 7th Place"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnerId">Partner (for team events)</Label>
              <Select
                value={formData.partnerId || 'none'}
                onValueChange={(v) => setFormData({ ...formData, partnerId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {allUsers?.filter(u => u.id !== user?.id).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preliminaryRecord">Prelim Record</Label>
                <Input
                  id="preliminaryRecord"
                  value={formData.preliminaryRecord}
                  onChange={(e) => setFormData({ ...formData, preliminaryRecord: e.target.value })}
                  placeholder="e.g., 4-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speakerPoints">Speaker Points</Label>
                <Input
                  id="speakerPoints"
                  type="number"
                  step="0.1"
                  value={formData.speakerPoints}
                  onChange={(e) => setFormData({ ...formData, speakerPoints: e.target.value })}
                  placeholder="e.g., 28.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="speakerRank">Speaker Rank</Label>
                <Input
                  id="speakerRank"
                  type="number"
                  value={formData.speakerRank}
                  onChange={(e) => setFormData({ ...formData, speakerRank: e.target.value })}
                  placeholder="e.g., 5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalCompetitors">Total Competitors</Label>
                <Input
                  id="totalCompetitors"
                  type="number"
                  value={formData.totalCompetitors}
                  onChange={(e) => setFormData({ ...formData, totalCompetitors: e.target.value })}
                  placeholder="e.g., 60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="breakingCompetitors">Breaking Competitors</Label>
              <Input
                id="breakingCompetitors"
                type="number"
                value={formData.breakingCompetitors}
                onChange={(e) => setFormData({ ...formData, breakingCompetitors: e.target.value })}
                placeholder="e.g., 16"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this tournament..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddResult}>
              {editingResult ? 'Update' : 'Add'} Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
