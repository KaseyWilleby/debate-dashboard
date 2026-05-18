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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, PlusCircle, Trash2, Edit, Calendar, BarChart3, Loader2, Download, History, CheckCircle2, Filter } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import type { TournamentResult, PlacementType, User, Tournament } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { fetchAuthenticatedTournamentResults } from '@/ai/flows/fetch-authenticated-tournament-results-flow';
import { discoverTabroomTournaments } from '@/ai/flows/discover-tabroom-tournaments-flow';
import { ResultCard } from '@/components/result-card';

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
  { value: 'dropped', label: 'Dropped', color: 'bg-red-500' },
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

  // Query tournament results from Firestore
  const resultsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'tournamentResults');
  }, [firestore]);
  const { data: allResults } = useCollection<TournamentResult>(resultsQuery);

  const [isImporting, setIsImporting] = React.useState(false);
  const [importingTournamentId, setImportingTournamentId] = React.useState<string | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingResult, setEditingResult] = React.useState<TournamentResult | null>(null);
  const [activeTab, setActiveTab] = React.useState<'results' | 'tournaments' | 'stats'>('results');
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [selectedStudentName, setSelectedStudentName] = React.useState<string>('');
  const [selectedTournamentId, setSelectedTournamentId] = React.useState<string>('');

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
        // Also show tournaments that have results even if dated in future (handles edge cases)
        const hasResults = allResults ? allResults.some(r => r.tournamentId === t.id) : false;
        return isPast || hasResults;
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [tournaments, user, allResults]);

  /**
   * Match student to user ID by NSDA ID or name
   */
  const matchStudentToUser = (studentName: string, nsdaId?: string): string | null => {
    if (!allUsers || !studentName) return null;

    // Priority 1: Match by NSDA ID if provided
    if (nsdaId) {
      const match = allUsers.find(u => u.nsdaId === nsdaId);
      if (match) return match.id;
    }

    // Priority 2: Try exact name match
    const normalized = studentName.toLowerCase().trim();
    let match = allUsers.find(u => u.name.toLowerCase() === normalized);
    if (match) return match.id;

    // Priority 3: Try first name + last name match
    const parts = normalized.split(' ');
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];

      match = allUsers.find(u => {
        const uParts = u.name.toLowerCase().split(' ');
        return uParts[0] === firstName && uParts[uParts.length - 1] === lastName;
      });
      if (match) return match.id;
    }

    return null;
  };

  // Check if there are results for a tournament
  const hasResultsFor = (tournamentId: string) => {
    if (!allResults) return false;
    return allResults.some(r => r.tournamentId === tournamentId);
  };

  // Get results for a specific tournament
  const getResultsForTournament = (tournamentId: string) => {
    if (!allResults) return [];
    return allResults.filter(r => r.tournamentId === tournamentId);
  };

  const handleImportFromTabroom = async (tournament: Tournament) => {
    if (!firestore || !allUsers || !user) return;

    // Check if Tabroom credentials are set (admin only)
    if (user.role === 'admin' && (!user.tabroomEmail || !user.tabroomPassword)) {
      toast({
        title: 'Tabroom Credentials Required',
        description: 'Please add your Tabroom credentials in Settings before importing results.',
        variant: 'destructive',
      });
      return;
    }

    if (!tournament.webpageUrl) {
      toast({
        title: 'No Tabroom URL',
        description: 'This tournament does not have a Tabroom link.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportingTournamentId(tournament.id);

    toast({
      title: 'Importing Results',
      description: `Fetching all Cy-Woods results from Tabroom for ${tournament.name}...`,
    });

    try {
      // Fetch results from Tabroom using authenticated access
      const resultsData = await fetchAuthenticatedTournamentResults({
        tournamentUrl: tournament.webpageUrl,
        tabroomEmail: user.tabroomEmail || '',
        tabroomPassword: user.tabroomPassword || '',
        tabroomChapterId: user.tabroomChapterId || "26837",
        schoolName: "Cypress Woods",
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
      });

      if (!resultsData.success) {
        toast({
          title: 'Import Failed',
          description: resultsData.error || 'Failed to fetch results from Tabroom',
          variant: 'destructive',
        });
        setIsImporting(false);
        setImportingTournamentId(null);
        return;
      }

      if (!resultsData.results || resultsData.results.length === 0) {
        toast({
          title: 'No Results Found',
          description: 'Could not find any results for this tournament.',
          variant: 'destructive',
        });
        setIsImporting(false);
        setImportingTournamentId(null);
        return;
      }

      // Delete existing results for this tournament
      const existingResultsQuery = query(
        collection(firestore, 'tournamentResults'),
        where('tournamentId', '==', tournament.id)
      );
      const existingResults = await getDocs(existingResultsQuery);
      for (const doc of existingResults.docs) {
        await deleteDoc(doc.ref);
      }

      let savedCount = 0;

      // Match students and save results
      for (const result of resultsData.results) {
        const userId = matchStudentToUser(result.studentName, result.nsdaId);
        const partnerId = result.partnerName ? matchStudentToUser(result.partnerName, undefined) : null;

        // Save result for primary student
        const resultData: any = {
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          studentName: result.studentName,
          userId: userId || null,
          event: result.event,
          placement: result.placement,
          date: tournament.date,
          createdAt: new Date().toISOString(),
        };

        if (result.placementDetail !== undefined) resultData.placementDetail = result.placementDetail;
        if (result.partnerName !== undefined) {
          resultData.partnerName = result.partnerName;
          resultData.partnerId = partnerId || null;
        }
        if (result.preliminaryRecord !== undefined) resultData.preliminaryRecord = result.preliminaryRecord;
        if (result.eliminationRecord !== undefined) resultData.eliminationRecord = result.eliminationRecord;
        if (result.preliminaryRounds !== undefined) resultData.preliminaryRounds = result.preliminaryRounds;
        if (result.eliminationRounds !== undefined) resultData.eliminationRounds = result.eliminationRounds;
        if (result.speakerPoints !== undefined) resultData.speakerPoints = result.speakerPoints;
        if (result.averageSpeakerPoints !== undefined) resultData.averageSpeakerPoints = result.averageSpeakerPoints;
        if (result.speakerRank !== undefined) resultData.speakerRank = result.speakerRank;
        if (result.totalCompetitors !== undefined) resultData.totalCompetitors = result.totalCompetitors;
        if (result.breakingCompetitors !== undefined) resultData.breakingCompetitors = result.breakingCompetitors;
        if (result.notes !== undefined) resultData.notes = result.notes;
        if (result.nsdaId !== undefined) resultData.nsdaId = result.nsdaId;

        await addDoc(collection(firestore, 'tournamentResults'), resultData);
        savedCount++;

        // If team event with matched partner, create result for partner too
        if (result.partnerName && partnerId) {
          const partnerResultData = {
            ...resultData,
            studentName: result.partnerName,
            userId: partnerId,
            partnerName: result.studentName,
            partnerId: userId || null,
          };
          await addDoc(collection(firestore, 'tournamentResults'), partnerResultData);
          savedCount++;
        }
      }

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${savedCount} results for ${tournament.name}`,
      });

    } catch (error) {
      console.error('Error importing from Tabroom:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import results from Tabroom.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setImportingTournamentId(null);
    }
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

  const handleBulkImport = async () => {
    if (!firestore || !allUsers || !user) return;

    const tournamentsNeedingResults = pastTournaments.filter(t => !hasResultsFor(t.id) && t.webpageUrl);

    if (tournamentsNeedingResults.length === 0) {
      toast({
        title: 'All Set!',
        description: 'Results have already been imported for all completed tournaments.',
      });
      return;
    }

    toast({
      title: 'Bulk Import Started',
      description: `Importing results for ${tournamentsNeedingResults.length} tournaments...`,
    });

    setIsImporting(true);

    let successCount = 0;
    let failCount = 0;

    for (const tournament of tournamentsNeedingResults) {
      try {
        await handleImportFromTabroom(tournament);
        successCount++;
      } catch (error) {
        console.error(`Failed to import ${tournament.name}:`, error);
        failCount++;
      }
    }

    setIsImporting(false);

    toast({
      title: 'Bulk Import Complete',
      description: `Successfully imported ${successCount} tournaments. ${failCount > 0 ? `${failCount} failed.` : ''}`,
    });
  };

  const handleAutoDiscoverAndImport = async () => {
    if (!firestore || !allUsers || !user) return;

    // Check if Tabroom credentials are set
    if (user.role === 'admin' && (!user.tabroomEmail || !user.tabroomPassword)) {
      toast({
        title: 'Tabroom Credentials Required',
        description: 'Please add your Tabroom credentials in Settings before auto-importing.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    toast({
      title: 'Discovering Tournaments',
      description: 'Scanning Tabroom for tournaments with results...',
    });

    try {
      // Step 1: Discover tournaments from Tabroom
      const discoveryResult = await discoverTabroomTournaments({
        tabroomEmail: user.tabroomEmail || '',
        tabroomPassword: user.tabroomPassword || '',
        tabroomChapterId: user.tabroomChapterId || "26837",
      });

      if (!discoveryResult.success || discoveryResult.tournaments.length === 0) {
        toast({
          title: 'No Tournaments Found',
          description: discoveryResult.error || 'Could not find any tournaments with results on Tabroom.',
          variant: 'destructive',
        });
        setIsImporting(false);
        return;
      }

      console.log(`Discovered ${discoveryResult.tournaments.length} tournaments from Tabroom`);

      // Step 2: Check which tournaments need to be added to the system
      const existingTournamentUrls = new Set(tournaments?.map(t => t.webpageUrl) || []);
      const newTournaments = discoveryResult.tournaments.filter(dt => !existingTournamentUrls.has(dt.url));

      console.log(`${newTournaments.length} new tournaments to add`);

      // Step 3: Add new tournaments to Firestore
      const addedTournaments: Tournament[] = [];
      for (const discovered of newTournaments) {
        const tournamentData: any = {
          name: discovered.name,
          date: discovered.date,
          location: discovered.location || '',
          webpageUrl: discovered.url,
          entries: [],
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(firestore, 'tournaments'), tournamentData);
        addedTournaments.push({ ...tournamentData, id: docRef.id });
        console.log(`Added tournament: ${discovered.name}`);
      }

      toast({
        title: 'Tournaments Added',
        description: `Added ${addedTournaments.length} new tournaments. Now importing results...`,
      });

      // Step 4: Import results for all discovered tournaments (both new and existing)
      let successCount = 0;
      let failCount = 0;

      for (const discovered of discoveryResult.tournaments) {
        try {
          // Find the tournament in our system (either newly added or existing)
          const existingTournament = tournaments?.find(t => t.webpageUrl === discovered.url);
          const tournamentToImport = existingTournament || addedTournaments.find(t => t.webpageUrl === discovered.url);

          if (tournamentToImport && !hasResultsFor(tournamentToImport.id)) {
            await handleImportFromTabroom(tournamentToImport);
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to import ${discovered.name}:`, error);
          failCount++;
        }
      }

      toast({
        title: 'Auto-Import Complete',
        description: `Added ${addedTournaments.length} tournaments and imported ${successCount} result sets. ${failCount > 0 ? `${failCount} failed.` : ''}`,
      });

    } catch (error) {
      console.error('Error during auto-discovery:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to discover tournaments.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddResult = async () => {
    if (!user || !firestore) return;
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

    const resultData: any = {
      tournamentId: formData.tournamentId || `tournament-${Date.now()}`,
      tournamentName: formData.tournamentName,
      userId: user.id,
      studentName: user.name,
      event: formData.event,
      placement: formData.placement as PlacementType,
      date: formData.date,
      createdAt: editingResult?.createdAt || new Date().toISOString(),
    };

    if (formData.placementDetail) resultData.placementDetail = formData.placementDetail;
    if (formData.partnerId) {
      resultData.partnerId = formData.partnerId;
      resultData.partnerName = partnerName;
    }
    if (formData.preliminaryRecord) resultData.preliminaryRecord = formData.preliminaryRecord;
    if (formData.speakerPoints) resultData.speakerPoints = parseFloat(formData.speakerPoints);
    if (formData.speakerRank) resultData.speakerRank = parseInt(formData.speakerRank);
    if (formData.totalCompetitors) resultData.totalCompetitors = parseInt(formData.totalCompetitors);
    if (formData.breakingCompetitors) resultData.breakingCompetitors = parseInt(formData.breakingCompetitors);
    if (formData.notes) resultData.notes = formData.notes;

    try {
      if (editingResult) {
        // For manual edits, we don't support editing yet - just add new
        toast({ title: 'Not Supported', description: 'Editing imported results is not supported. Please delete and re-add.' });
      } else {
        await addDoc(collection(firestore, 'tournamentResults'), resultData);
        toast({ title: 'Result Added', description: 'Tournament result has been added.' });
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving result:', error);
      toast({
        title: 'Error',
        description: 'Failed to save result. Please try again.',
        variant: 'destructive',
      });
    }
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

  const handleDeleteResult = async (result: TournamentResult) => {
    if (!firestore) return;

    try {
      // Find and delete the document from Firestore
      const resultQuery = query(
        collection(firestore, 'tournamentResults'),
        where('tournamentId', '==', result.tournamentId),
        where('userId', '==', result.userId),
        where('event', '==', result.event)
      );
      const docs = await getDocs(resultQuery);

      for (const doc of docs.docs) {
        await deleteDoc(doc.ref);
      }

      toast({ title: 'Result Deleted', description: 'Tournament result has been removed.' });
    } catch (error) {
      console.error('Error deleting result:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete result. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Get unique students from results (for filtering)
  const uniqueStudents = React.useMemo(() => {
    if (!allResults) return [];

    const studentsMap = new Map<string, { name: string; userId: string | null }>();
    allResults.forEach(result => {
      const key = result.studentName.toLowerCase().trim();
      if (!studentsMap.has(key)) {
        studentsMap.set(key, {
          name: result.studentName,
          userId: result.userId || null,
        });
      }
    });

    return Array.from(studentsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [allResults]);

  // Get unique tournaments from results
  const uniqueTournaments = React.useMemo(() => {
    if (!allResults) return [];

    const tournamentsMap = new Map<string, { id: string; name: string; date: string }>();
    allResults.forEach(result => {
      if (!tournamentsMap.has(result.tournamentId)) {
        tournamentsMap.set(result.tournamentId, {
          id: result.tournamentId,
          name: result.tournamentName,
          date: result.date,
        });
      }
    });

    return Array.from(tournamentsMap.values()).sort((a, b) =>
      parseISO(b.date).getTime() - parseISO(a.date).getTime()
    );
  }, [allResults]);

  // Filter results based on user role and filters
  const displayedResults = React.useMemo(() => {
    if (!user || !allResults) return [];

    let filtered = allResults;

    // Filter by user/student
    if (user.role === 'admin') {
      if (selectedStudentName && selectedStudentName !== 'all') {
        // Filter by student name (works for all students, even without accounts)
        filtered = filtered.filter(r =>
          r.studentName.toLowerCase().trim() === selectedStudentName.toLowerCase().trim()
        );
      }
    } else {
      // Non-admin users only see their own results
      filtered = filtered.filter(r => r.userId === user.id);
    }

    // Filter by tournament
    if (selectedTournamentId && selectedTournamentId !== 'all') {
      filtered = filtered.filter(r => r.tournamentId === selectedTournamentId);
    }

    return filtered.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [allResults, user, selectedStudentName, selectedTournamentId]);

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
            {isAdmin && selectedStudentName && selectedStudentName !== 'all'
              ? `Viewing results for ${selectedStudentName}`
              : isAdmin
                ? 'View and manage all tournament results'
                : 'Track your tournament results and performance'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              onClick={handleAutoDiscoverAndImport}
              variant="secondary"
              disabled={isImporting}
            >
              {isImporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" />Auto-Import from Tabroom</>
              )}
            </Button>
          )}
          {tournamentsNeedingResults.length > 0 && (
            <Button onClick={handleBulkImport} variant="outline" disabled={isImporting}>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'results' | 'tournaments' | 'stats')}>
        <TabsList>
          <TabsTrigger value="results"><Trophy className="mr-2 h-4 w-4" />Results</TabsTrigger>
          <TabsTrigger value="tournaments"><History className="mr-2 h-4 w-4" />Past Tournaments</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="mr-2 h-4 w-4" />Statistics</TabsTrigger>
        </TabsList>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {isAdmin && (
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select value={selectedStudentName || 'all'} onValueChange={setSelectedStudentName}>
                      <SelectTrigger>
                        <SelectValue placeholder="All students" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        {uniqueStudents.map((student, idx) => (
                          <SelectItem key={idx} value={student.name}>
                            {student.name} {student.userId ? '(has account)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Tournament</Label>
                  <Select value={selectedTournamentId || 'all'} onValueChange={setSelectedTournamentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All tournaments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tournaments</SelectItem>
                      {uniqueTournaments.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({format(parseISO(t.date), 'MMM d, yyyy')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          {displayedResults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Results Found</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {selectedStudentName && selectedStudentName !== 'all' || selectedTournamentId && selectedTournamentId !== 'all'
                    ? 'No results match your current filters. Try adjusting the filters above.'
                    : isAdmin && selectedStudentName && selectedStudentName !== 'all'
                      ? 'This student has no tournament results yet.'
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {displayedResults.length} Result{displayedResults.length !== 1 ? 's' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Tournament</TableHead>
                        {isAdmin && <TableHead>Student</TableHead>}
                        <TableHead>Event</TableHead>
                        <TableHead>Placement</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead>Prelim</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedResults.map(result => {
                        const resultUser = allUsers?.find(u => u.id === result.userId);
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(parseISO(result.date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {result.tournamentName}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                {resultUser?.name || result.studentName}
                              </TableCell>
                            )}
                            <TableCell>{result.event}</TableCell>
                            <TableCell>
                              <Badge className={cn('text-white', getPlacementColor(result.placement))}>
                                {placementOptions.find(p => p.value === result.placement)?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {result.partnerName || '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {result.placement === 'dropped' ? (
                                <span className="text-red-500 font-medium">Drop</span>
                              ) : (
                                result.preliminaryRecord || '—'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {(!isAdmin || result.userId === user?.id) && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditResult(result)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
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
                                        <AlertDialogAction onClick={() => handleDeleteResult(result)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
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
                              {getResultsForTournament(tournament.id).length} Results
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
                            disabled={isImporting || !tournament.webpageUrl}
                          >
                            {isImporting && importingTournamentId === tournament.id ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
                            ) : (
                              <><Download className="mr-2 h-4 w-4" />Import from Tabroom</>
                            )}
                          </Button>
                        )}
                        <Button
                          onClick={() => handleImportFromTournament(tournament)}
                          variant="outline"
                          disabled={isImporting}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Manual
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {userEntry && userEntry.events.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-medium">Registered Events:</p>
                        <div className="flex flex-wrap gap-2">
                          {userEntry.events.map(event => (
                            <Badge key={event} variant="outline">{event}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasResults && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="results" className="border-0">
                          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                            Imported Results ({getResultsForTournament(tournament.id).length})
                          </AccordionTrigger>
                          <AccordionContent className="space-y-3 pt-3">
                            {getResultsForTournament(tournament.id).map((result, idx) => (
                              <ResultCard key={idx} result={result} showStudentName={true} />
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
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
