
'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, PlusCircle, Trash2, Edit, Gavel, Users, RefreshCcw, BookCopy, BookOpen, BrainCircuit, Loader2, Archive, ArchiveRestore } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { User, DebateCase, PracticeRound, Ballot, DebateFormat, SpeechStance, DebateTopic, Session } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { MultiSelect } from "@/components/ui/multi-select";
import { Separator } from "@/components/ui/separator";
import { FlowSheet } from "@/components/dashboard/flow-sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { extractNsdaTopics } from "@/ai/flows/extract-nsda-topics-flow";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc, addDoc } from "firebase/firestore";

const DEBATE_CASES_STORAGE_KEY = 'work-session-debate-cases';
const PRACTICE_ROUNDS_STORAGE_KEY = 'work-session-practice-rounds';
const DEBATE_TOPICS_STORAGE_KEY = 'work-session-debate-topics';

const getStanceLabels = (format: DebateFormat): { affirmative: string, negative: string } => {
    switch (format) {
        case 'PF': return { affirmative: 'Pro', negative: 'Con' };
        case 'WSD': return { affirmative: 'Proposition', negative: 'Opposition' };
        default: return { affirmative: 'Affirmative', negative: 'Negative' };
    }
};

const debateFormatOrder: DebateFormat[] = ['LD', 'PF', 'CX', 'WSD'];

const monthOrder = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

const parseMonths = (monthString: string | undefined): number => {
    if (!monthString) return -1;
    // Simple parsing, gets the first month mentioned. E.g. "September/October" -> "September"
    const firstMonth = monthString.split('/')[0].trim();
    const monthIndex = monthOrder.findIndex(m => m.startsWith(firstMonth));
    return monthIndex !== -1 ? monthIndex : -1;
};


export default function DebateEventsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get URL parameters
  const tabParam = searchParams.get('tab');
  const createFromSessionId = searchParams.get('createFromSession');

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || user?.role !== 'admin') return null;
    return collection(firestore, 'users');
  }, [firestore, user?.role]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  // Fetch session if creating from session
  const sessionDocRef = useMemoFirebase(() => {
    if (!firestore || !createFromSessionId) return null;
    return doc(firestore, 'sessions', createFromSessionId);
  }, [firestore, createFromSessionId]);
  const { data: sessionForRound } = useDoc<Session>(sessionDocRef);

  const [cases, setCases] = React.useState<DebateCase[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(DEBATE_CASES_STORAGE_KEY);
    try {
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
  });
  
  // Load practice rounds from Firestore instead of localStorage
  const practiceRoundsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'practiceRounds');
  }, [firestore]);
  const { data: firestorePracticeRounds } = useCollection<PracticeRound>(practiceRoundsQuery);

  const practiceRounds = React.useMemo(() => firestorePracticeRounds || [], [firestorePracticeRounds]);

  const [topics, setTopics] = React.useState<DebateTopic[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(DEBATE_TOPICS_STORAGE_KEY);
     try {
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
  });

  const [isRoundDialogOpen, setIsRoundDialogOpen] = React.useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  
  const [eventFilter, setEventFilter] = React.useState<string>('all');
  const [monthFilter, setMonthFilter] = React.useState<string>('all');
  const [showArchived, setShowArchived] = React.useState<boolean>(false);
  
  const [isCreateCaseDialogOpen, setIsCreateCaseDialogOpen] = React.useState(false);
  const [caseCreationData, setCaseCreationData] = React.useState<{ topicId: string; stance: SpeechStance } | null>(null);


  // Open round dialog when session is loaded from query param
  React.useEffect(() => {
    if (sessionForRound && createFromSessionId) {
      setIsRoundDialogOpen(true);
    }
  }, [sessionForRound, createFromSessionId]);

  React.useEffect(() => {
    localStorage.setItem(DEBATE_CASES_STORAGE_KEY, JSON.stringify(cases));
  }, [cases]);

  React.useEffect(() => {
    localStorage.setItem(DEBATE_TOPICS_STORAGE_KEY, JSON.stringify(topics));
  }, [topics]);

  const handleCreateCase = (caseName: string) => {
    if (!user || !caseCreationData) return;
    const topic = topics.find(t => t.id === caseCreationData.topicId);
    if (!topic) {
        toast({ variant: "destructive", title: "Topic not found." });
        return;
    }

    const newCase: DebateCase = {
        id: `case-${Date.now()}`,
        name: caseName,
        ownerId: user.id,
        topicId: topic.id,
        resolution: topic.resolution,
        type: topic.type,
        stance: caseCreationData.stance,
        framework: '',
        contentions: [],
        blocks: [],
        isArchived: false,
    };
    setCases(prev => [newCase, ...prev]);
    toast({ title: "Case Created", description: "Redirecting to the case editor..." });
    router.push(`/dashboard/debate-events/${newCase.id}`);
  };
  
  const handleDeleteCase = (id: string) => {
    setCases(prev => prev.filter(c => c.id !== id));
    toast({ title: "Case Deleted", variant: "destructive" });
  };
  
  const handleSaveRound = async (roundData: Omit<PracticeRound, 'id'>) => {
    if (!roundData.topic.trim()) {
      toast({
        variant: 'destructive',
        title: 'Topic Required',
        description: 'Please enter a topic/resolution for the round.',
      });
      return;
    }

    if (!firestore) return;

    try {
      const practiceRoundsCollection = collection(firestore, 'practiceRounds');
      await addDoc(practiceRoundsCollection, roundData);
      toast({ title: "Practice Round Created", description: "The practice round has been added." });
      setIsRoundDialogOpen(false);

      // Clear the query params
      router.push('/dashboard/debate-events?tab=practice-rounds');
    } catch (error) {
      console.error('Error creating practice round:', error);
      toast({
        title: 'Error',
        description: 'Failed to create practice round',
        variant: 'destructive',
      });
    }
  };

  // Practice rounds are now managed from sessions and stored in Firestore
  const handleDeleteRound = async (id: string) => {
    if (!firestore) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const roundRef = doc(firestore, 'practiceRounds', id);
      await deleteDoc(roundRef);
      toast({ title: "Practice Round Deleted", variant: "destructive" });
    } catch (error) {
      console.error('Error deleting practice round:', error);
      toast({ title: "Error", description: "Failed to delete practice round", variant: "destructive" });
    }
  };
  
  const handleBallotUpdate = async (roundId: string, ballot: Ballot) => {
    if (!firestore) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const roundRef = doc(firestore, 'practiceRounds', roundId);
      await updateDoc(roundRef, { ballot });

      if (ballot.submitted) {
        toast({
          title: "Ballot Submitted",
          description: "The ballot is now final and visible to competitors."
        });
      } else {
        toast({
          title: "Ballot Saved",
          description: "The ballot has been saved as a draft."
        });
      }
    } catch (error) {
      console.error('Error updating ballot:', error);
      toast({ title: 'Error', description: 'Failed to save ballot', variant: 'destructive' });
    }
  }

  const handleFlowUpdate = async (roundId: string, flow: { aff?: string[][], neg?: string[][] }) => {
    if (!firestore) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const roundRef = doc(firestore, 'practiceRounds', roundId);

      // Convert nested arrays to JSON strings for Firestore
      // Filter out undefined values as Firestore doesn't support them
      const serializedFlow: { aff?: string; neg?: string } = {};
      if (flow.aff) {
        serializedFlow.aff = JSON.stringify(flow.aff);
      }
      if (flow.neg) {
        serializedFlow.neg = JSON.stringify(flow.neg);
      }

      await updateDoc(roundRef, { flow: serializedFlow });
      // Silent save - no toast needed for auto-save
    } catch (error) {
      console.error('Error updating flow:', error);
      // Only show error if it's a critical issue
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'permission-denied') {
        toast({ title: 'Error', description: 'Failed to save flow', variant: 'destructive' });
      }
    }
  }
  
  const handleCreateTopic = (topic: Omit<DebateTopic, 'id' | 'createdAt' | 'isArchived'>) => {
    const newTopic: DebateTopic = {
        id: `topic-${Date.now()}`,
        createdAt: new Date().toISOString(),
        isArchived: false,
        ...topic,
    };
    setTopics(prev => [newTopic, ...prev]);
    toast({ title: 'Topic Created' });
    setIsTopicDialogOpen(false);
  }
  
  const handleDeleteTopic = (id: string) => {
    // Also delete associated cases
    setCases(prev => prev.filter(c => c.topicId !== id));
    setTopics(prev => prev.filter(t => t.id !== id));
    toast({ title: "Topic Deleted", description: "The topic and all associated cases have been removed.", variant: "destructive" });
  }
  
  const handleToggleArchiveTopic = (topicId: string) => {
    setTopics(prev => prev.map(t => t.id === topicId ? { ...t, isArchived: !t.isArchived } : t));
    const topic = topics.find(t => t.id === topicId);
    toast({ title: topic?.isArchived ? "Topic Restored" : "Topic Archived" });
  }

  const handleImportNsdaTopics = async () => {
    setIsImporting(true);
    try {
      const fetchedTopics = await extractNsdaTopics();
      const existingResolutions = new Set(topics.map(t => t.resolution));
      const newUniqueTopics: DebateTopic[] = [];

      fetchedTopics.forEach(topic => {
        if (!existingResolutions.has(topic.resolution)) {
          newUniqueTopics.push({
            ...topic,
            id: `topic-${Date.now()}-${newUniqueTopics.length}`,
            createdAt: new Date().toISOString(),
            isArchived: false,
          });
          existingResolutions.add(topic.resolution);
        }
      });
      
      if (newUniqueTopics.length > 0) {
        setTopics(prev => [...newUniqueTopics, ...prev]);
        toast({
          title: "Topics Imported",
          description: `Successfully imported ${newUniqueTopics.length} new topic(s) from the NSDA.`
        });
      } else {
        toast({
          title: "No New Topics",
          description: "All current NSDA topics are already in your list."
        });
      }
    } catch (error) {
      console.error("Failed to import NSDA topics:", error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: (error as Error).message || "Could not fetch topics from the NSDA website."
      });
    } finally {
      setIsImporting(false);
    }
  }

  const userCases = React.useMemo(() => {
    if (!user) return [];
    return cases.filter(c => c.ownerId === user.id);
  }, [cases, user]);

  const topicsWithUserCases = React.useMemo(() => {
    const topicMap = new Map<string, { topic: DebateTopic; cases: { affirmative: DebateCase[], negative: DebateCase[] } }>();
    
    // Add all topics first to ensure they are all displayed
    topics.forEach(topic => {
      if (!topicMap.has(topic.id)) {
        topicMap.set(topic.id, { topic, cases: { affirmative: [], negative: [] } });
      }
    });

    userCases.forEach(caseItem => {
        const entry = topicMap.get(caseItem.topicId);
        if (entry) {
            if (caseItem.stance === 'affirmative') {
                entry.cases.affirmative.push(caseItem);
            } else {
                entry.cases.negative.push(caseItem);
            }
        }
    });

    const filtered = Array.from(topicMap.values()).filter(({ topic }) => {
        const eventMatch = eventFilter === 'all' || topic.type === eventFilter;
        const monthMatch = monthFilter === 'all' || topic.months === monthFilter;
        const archiveMatch = showArchived || !topic.isArchived;
        return eventMatch && monthMatch && archiveMatch;
    });

    return filtered.sort((a, b) => {
        const formatIndexA = debateFormatOrder.indexOf(a.topic.type);
        const formatIndexB = debateFormatOrder.indexOf(b.topic.type);

        if (formatIndexA !== formatIndexB) {
            return formatIndexA - formatIndexB;
        }
        
        const monthA = parseMonths(a.topic.months);
        const monthB = parseMonths(b.topic.months);

        return monthB - monthA;
    });
  }, [topics, userCases, eventFilter, monthFilter, showArchived]);

  const sortedTopics = React.useMemo(() => {
    return [...topics].sort((a, b) => {
        const formatIndexA = debateFormatOrder.indexOf(a.type);
        const formatIndexB = debateFormatOrder.indexOf(b.type);

        if (formatIndexA !== formatIndexB) {
            return formatIndexA - formatIndexB;
        }
        
        const monthA = parseMonths(a.months);
        const monthB = parseMonths(b.months);

        return monthB - monthA; // Sort descending for months (most recent first)
    });
  }, [topics]);

  const monthOptions = React.useMemo(() => {
      const allMonths = new Set(topics.map(t => t.months).filter(Boolean));
      return Array.from(allMonths);
  }, [topics]);
  
  const isLoading = isAuthLoading || (user?.role === 'admin' && areUsersLoading);

  const tabList = [
    { value: 'case-creator', label: 'Case Creator', adminOnly: false },
    { value: 'practice-rounds', label: 'Practice Rounds', adminOnly: false },
    { value: 'topic-management', label: 'Topic Management', adminOnly: true }
  ];

  const visibleTabs = tabList.filter(t => !t.adminOnly || user?.role === 'admin');

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Debate Events</h1>
        <p className="text-muted-foreground">
          Construct cases and run practice rounds.
        </p>
      </div>

      <Tabs defaultValue={tabParam || "case-creator"} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
            {visibleTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
        </TabsList>
        <TabsContent value="case-creator" className="mt-4 space-y-6">
           <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>My Cases</CardTitle>
                        <CardDescription>Select a topic to start building or editing your cases.</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="show-archived" checked={showArchived} onCheckedChange={(checked) => setShowArchived(!!checked)} />
                            <Label htmlFor="show-archived">Show Archived</Label>
                        </div>
                        <Select value={eventFilter} onValueChange={setEventFilter}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Events</SelectItem>
                                <SelectItem value="LD">Lincoln Douglas</SelectItem>
                                <SelectItem value="PF">Public Forum</SelectItem>
                                <SelectItem value="CX">Policy</SelectItem>
                                <SelectItem value="WSD">World Schools</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={monthFilter} onValueChange={setMonthFilter}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {monthOptions.map(month => <SelectItem key={month} value={month!}>{month}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <Accordion type="single" collapsible className="w-full">
                    {topicsWithUserCases.map(({ topic, cases }) => {
                        const { affirmative, negative } = getStanceLabels(topic.type);
                        return (
                            <AccordionItem value={topic.id} key={topic.id}>
                                <div className="flex items-center justify-between pr-4">
                                <AccordionTrigger className="flex-1">
                                    <div className="flex flex-col text-left items-start">
                                        <p className="font-semibold">{topic.resolution}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="mt-1">{topic.type}</Badge>
                                            {topic.months && <Badge variant="outline" className="mt-1">{topic.months}</Badge>}
                                            {topic.isArchived && <Badge variant="destructive" className="mt-1">Archived</Badge>}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                {user?.role === 'admin' && (
                                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleToggleArchiveTopic(topic.id); }}>
                                        {topic.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                    </Button>
                                )}
                                </div>
                                <AccordionContent className="space-y-4">
                                     <div className="grid sm:grid-cols-2 gap-4">
                                        <CaseSideList stance="affirmative" label={affirmative} cases={cases.affirmative} topicId={topic.id} onCreate={() => { setCaseCreationData({ topicId: topic.id, stance: 'affirmative' }); setIsCreateCaseDialogOpen(true); }} onDelete={handleDeleteCase} router={router} />
                                        <CaseSideList stance="negative" label={negative} cases={cases.negative} topicId={topic.id} onCreate={() => { setCaseCreationData({ topicId: topic.id, stance: 'negative' }); setIsCreateCaseDialogOpen(true); }} onDelete={handleDeleteCase} router={router} />
                                     </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                     {topicsWithUserCases.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">No cases found for the current filter. Go to Topic Management to add a topic.</div>
                     )}
                 </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="practice-rounds" className="mt-4 space-y-6">
           <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Practice Rounds</CardTitle>
                  <CardDescription>Practice rounds created from booked sessions.</CardDescription>
                </div>
                <Button onClick={() => setIsRoundDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> New Round
                </Button>
              </div>
            </CardHeader>
            <CardContent>
               {practiceRounds.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {practiceRounds.map((round) => (
                    <PracticeRoundItem
                      key={round.id}
                      round={round}
                      allUsers={allUsers || []}
                      onDelete={handleDeleteRound}
                      onBallotUpdate={handleBallotUpdate}
                      onFlowUpdate={handleFlowUpdate}
                    />
                  ))}
                </Accordion>
              ) : (
                <div className="text-center text-muted-foreground py-8">No practice rounds created yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'admin' && (
            <TabsContent value="topic-management" className="mt-4 space-y-6">
            <Card>
                <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Topic Management</CardTitle>
                        <CardDescription>Add, import, and manage debate topics for the team.</CardDescription>
                    </div>
                    <div className="flex gap-4">
                        <Button onClick={() => setIsTopicDialogOpen(true)}><PlusCircle className="mr-2"/> Add New Topic</Button>
                        <Button variant="outline" onClick={handleImportNsdaTopics} disabled={isImporting}>
                            {isImporting ? <Loader2 className="mr-2 animate-spin"/> : <BookCopy className="mr-2"/>}
                            {isImporting ? 'Importing...' : 'Import NSDA Topics'}
                        </Button>
                    </div>
                </div>
                </CardHeader>
                <CardContent>
                    {sortedTopics.length > 0 ? (
                        <ul className="space-y-2">
                            {sortedTopics.map(topic => (
                                <li key={topic.id} className={cn("flex items-center justify-between p-3 rounded-md border bg-muted/50", topic.isArchived && "opacity-60")}>
                                    <div className="flex-1 pr-4">
                                        <p className="font-medium">{topic.resolution}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary">{topic.type}</Badge>
                                            {topic.months && <Badge variant="outline">{topic.months}</Badge>}
                                            {topic.isArchived && <Badge variant="destructive">Archived</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="icon" variant="ghost" className="h-9 w-9 flex-shrink-0" onClick={() => handleToggleArchiveTopic(topic.id)}>
                                            {topic.isArchived ? <ArchiveRestore className="h-4 w-4"/> : <Archive className="h-4 w-4"/>}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="destructive" className="h-9 w-9 flex-shrink-0"><Trash2 className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Topic?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the topic and ALL associated cases. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteTopic(topic.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">No topics created yet.</div>
                    )}
                </CardContent>
            </Card>
            </TabsContent>
        )}
      </Tabs>
       <RoundDialog
        isOpen={isRoundDialogOpen}
        onOpenChange={setIsRoundDialogOpen}
        onSave={handleSaveRound}
        sessionForRound={sessionForRound}
        allUsers={allUsers || []}
       />
       <TopicDialog
        isOpen={isTopicDialogOpen}
        onOpenChange={setIsTopicDialogOpen}
        onCreate={handleCreateTopic}
       />
       <CreateCaseDialog
         isOpen={isCreateCaseDialogOpen}
         onOpenChange={setIsCreateCaseDialogOpen}
         onCreate={handleCreateCase}
        />
    </div>
  );
}

function RoundDialog({ isOpen, onOpenChange, onSave, sessionForRound, allUsers }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: (data: Omit<PracticeRound, 'id'>) => void, sessionForRound: Session | null | undefined, allUsers: User[] }) {
    const [topic, setTopic] = React.useState('');
    const [type, setType] = React.useState<DebateFormat>('LD');
    const [judges, setJudges] = React.useState<string[]>([]);
    const [affTeam, setAffTeam] = React.useState<string[]>([]);
    const [negTeam, setNegTeam] = React.useState<string[]>([]);
    const { toast } = useToast();

    const availableUsers = React.useMemo(() => {
        if (!allUsers) return [];
        return allUsers.map(u => ({label: u.name, value: u.id}));
    }, [allUsers]);

    const maxTeamSize = React.useMemo(() => {
        switch (type) {
            case 'PF':
            case 'CX':
                return 2;
            case 'WSD':
                return 5;
            case 'LD':
            default:
                return 1;
        }
    }, [type]);

    // Pre-fill from session data
    React.useEffect(() => {
        if (isOpen && sessionForRound) {
            setTopic(sessionForRound.title || '');
            setType(sessionForRound.debateFormat || 'LD');
            setJudges([]);

            // Set up teams based on host stance
            const participants = [sessionForRound.hostId, sessionForRound.clientId].filter(Boolean) as string[];
            if (sessionForRound.hostPartnerId) participants.push(sessionForRound.hostPartnerId);
            if (sessionForRound.clientPartnerId) participants.push(sessionForRound.clientPartnerId);

            let affTeamIds: string[] = [];
            let negTeamIds: string[] = [];

            if (sessionForRound.hostStance === 'affirmative') {
                if (sessionForRound.hostId) affTeamIds.push(sessionForRound.hostId);
                if (sessionForRound.hostPartnerId) affTeamIds.push(sessionForRound.hostPartnerId);
                if (sessionForRound.clientId) negTeamIds.push(sessionForRound.clientId);
                if (sessionForRound.clientPartnerId) negTeamIds.push(sessionForRound.clientPartnerId);
            } else if (sessionForRound.hostStance === 'negative') {
                if (sessionForRound.clientId) affTeamIds.push(sessionForRound.clientId);
                if (sessionForRound.clientPartnerId) affTeamIds.push(sessionForRound.clientPartnerId);
                if (sessionForRound.hostId) negTeamIds.push(sessionForRound.hostId);
                if (sessionForRound.hostPartnerId) negTeamIds.push(sessionForRound.hostPartnerId);
            }

            setAffTeam(affTeamIds);
            setNegTeam(negTeamIds);
        } else if (!isOpen) {
            // Reset when dialog closes
            setTopic('');
            setType('LD');
            setJudges([]);
            setAffTeam([]);
            setNegTeam([]);
        }
    }, [isOpen, sessionForRound]);

    React.useEffect(() => {
        // Reset teams if they exceed max size for the new format
        if (affTeam.length > maxTeamSize) setAffTeam(affTeam.slice(0, maxTeamSize));
        if (negTeam.length > maxTeamSize) setNegTeam(negTeam.slice(0, maxTeamSize));
    }, [type, maxTeamSize, affTeam, negTeam]);

    const handleSave = () => {
        if (!topic.trim()) {
            toast({
                variant: 'destructive',
                title: 'Topic Required',
                description: 'Please enter a topic/resolution for the round.',
            });
            return;
        }
        const allParticipants = [...new Set([...affTeam, ...negTeam, ...judges])];
        onSave({ topic, type, participants: allParticipants, judges, affTeam: affTeam.length > 0 ? affTeam : undefined, negTeam: negTeam.length > 0 ? negTeam : undefined });
    };

    const handleFlip = () => {
        const currentAff = [...affTeam];
        const currentNeg = [...negTeam];
        setAffTeam(currentNeg);
        setNegTeam(currentAff);
    }

    const TeamSelect = ({ label, value, onChange, max, disabledIds }: { label: string, value: string[], onChange: (value: string[]) => void, max: number, disabledIds: string[] }) => {
        const options = availableUsers.filter(u => !disabledIds.includes(u.value) || value.includes(u.value));
        if (max === 1) {
            return (
                 <Select value={value[0] || ''} onValueChange={(v) => onChange(v ? [v] : [])}>
                    <SelectTrigger><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
                    <SelectContent>
                        {options.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )
        }
        return (
            <MultiSelect options={options} value={value} onValueChange={onChange} placeholder={`Select ${label} (up to ${max})...`} maxCount={max} />
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{sessionForRound ? 'Create Practice Round from Session' : 'Create Practice Round'}</DialogTitle>
                    <DialogDescription>
                        {sessionForRound ? 'Review and edit the practice round details before creating.' : 'Fill in the details for your practice round.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="round-topic">Topic/Resolution</Label>
                        <Input id="round-topic" value={topic} onChange={e => setTopic(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="round-type">Debate Type</Label>
                         <Select value={type} onValueChange={(v: DebateFormat) => setType(v)}>
                            <SelectTrigger id="round-type"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LD">Lincoln Douglas (LD)</SelectItem>
                                <SelectItem value="PF">Public Forum (PF)</SelectItem>
                                <SelectItem value="CX">Cross Examination (CX)</SelectItem>
                                <SelectItem value="WSD">World Schools Debate (WSD)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                         <div className="flex-1 space-y-2">
                            <Label>Affirmative</Label>
                            <TeamSelect label="Affirmative" value={affTeam} onChange={setAffTeam} max={maxTeamSize} disabledIds={negTeam} />
                        </div>
                        <Button size="icon" variant="outline" className="mt-8 flex-shrink-0" onClick={handleFlip}><RefreshCcw className="h-4 w-4"/></Button>
                         <div className="flex-1 space-y-2">
                            <Label>Negative</Label>
                            <TeamSelect label="Negative" value={negTeam} onChange={setNegTeam} max={maxTeamSize} disabledIds={affTeam} />
                        </div>
                    </div>

                     <div className="space-y-2">
                        <Label>Judges</Label>
                        <MultiSelect options={availableUsers} value={judges} onValueChange={setJudges} placeholder="Select judge(s)..."/>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave}>Create Round</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PracticeRoundItem({
  round,
  allUsers,
  onDelete,
  onBallotUpdate,
  onFlowUpdate
}: {
  round: PracticeRound,
  allUsers: User[],
  onDelete: (id: string) => void,
  onBallotUpdate: (roundId: string, ballot: Ballot) => void,
  onFlowUpdate: (roundId: string, flow: { aff?: string[][], neg?: string[][] }) => void
}) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState<'details' | 'ballot' | 'flow'>('details');

    const affTeam = (round.affTeam || []).map(id => allUsers.find(u => u.id === id)?.name).filter(Boolean);
    const negTeam = (round.negTeam || []).map(id => allUsers.find(u => u.id === id)?.name).filter(Boolean);

    const canDelete = user?.role === 'admin' || round.participants.includes(user?.id || '');
    const isJudge = round.judges.includes(user?.id || '');
    const isParticipant = round.participants.includes(user?.id || '');

    // Ballot form state
    const [ballotData, setBallotData] = React.useState<Ballot>(round.ballot || {
      winner: '',
      rfd: '',
      affPoints: '',
      negPoints: '',
      affComments: '',
      negComments: '',
      submitted: false
    });

    // Helper to deserialize flow from Firestore
    const deserializeFlow = (flowString: string | undefined): string[][] | undefined => {
      if (!flowString) return undefined;
      try {
        return JSON.parse(flowString);
      } catch (e) {
        console.error('Error parsing flow data:', e);
        return undefined;
      }
    };

    // Local flow state to avoid constant Firestore writes
    const [localAffFlow, setLocalAffFlow] = React.useState<string[][] | undefined>(
      deserializeFlow(round.flow?.aff)
    );
    const [localNegFlow, setLocalNegFlow] = React.useState<string[][] | undefined>(
      deserializeFlow(round.flow?.neg)
    );

    // Refs to track latest flow values for debounced saves
    const affFlowRef = React.useRef<string[][] | undefined>(deserializeFlow(round.flow?.aff));
    const negFlowRef = React.useRef<string[][] | undefined>(deserializeFlow(round.flow?.neg));

    // Debounced update refs
    const affFlowTimeoutRef = React.useRef<NodeJS.Timeout>();
    const negFlowTimeoutRef = React.useRef<NodeJS.Timeout>();

    // Sync refs with state
    React.useEffect(() => {
      affFlowRef.current = localAffFlow;
    }, [localAffFlow]);

    React.useEffect(() => {
      negFlowRef.current = localNegFlow;
    }, [localNegFlow]);

    const handleBallotSave = () => {
      // Save ballot without marking as submitted
      onBallotUpdate(round.id, { ...ballotData, submitted: false });
    };

    const handleBallotSubmit = () => {
      // Submit ballot and mark as final
      onBallotUpdate(round.id, { ...ballotData, submitted: true });
    };

    const handleFlowSave = () => {
      // Manually trigger flow save
      if (affFlowRef.current || negFlowRef.current) {
        onFlowUpdate(round.id, {
          aff: affFlowRef.current,
          neg: negFlowRef.current
        });
        toast({ title: 'Flow Saved', description: 'Your flow has been saved successfully.' });
      }
    };

    const handleFlowChangeAff = (flow: string[][]) => {
      setLocalAffFlow(flow);
      affFlowRef.current = flow;

      // Clear existing timeout
      if (affFlowTimeoutRef.current) {
        clearTimeout(affFlowTimeoutRef.current);
      }

      // Set new timeout to save after 1 second of inactivity
      affFlowTimeoutRef.current = setTimeout(() => {
        onFlowUpdate(round.id, {
          aff: flow,
          neg: negFlowRef.current
        });
      }, 1000);
    };

    const handleFlowChangeNeg = (flow: string[][]) => {
      setLocalNegFlow(flow);
      negFlowRef.current = flow;

      // Clear existing timeout
      if (negFlowTimeoutRef.current) {
        clearTimeout(negFlowTimeoutRef.current);
      }

      // Set new timeout to save after 1 second of inactivity
      negFlowTimeoutRef.current = setTimeout(() => {
        onFlowUpdate(round.id, {
          aff: affFlowRef.current,
          neg: flow
        });
      }, 1000);
    };

    // Cleanup timeouts on unmount
    React.useEffect(() => {
      return () => {
        if (affFlowTimeoutRef.current) clearTimeout(affFlowTimeoutRef.current);
        if (negFlowTimeoutRef.current) clearTimeout(negFlowTimeoutRef.current);
      };
    }, []);

    return (
        <AccordionItem value={round.id}>
            <AccordionTrigger>
                <div className="flex-1 text-left">
                    {round.topic}
                    <Badge variant="secondary" className="ml-2">{round.type}</Badge>
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="ballot">Ballot</TabsTrigger>
                        <TabsTrigger value="flow">Flow</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-1"><Users className="h-4 w-4"/> Sides</h4>
                                <div className="flex flex-col gap-1 text-muted-foreground">
                                    <span><Badge>AFF</Badge> {affTeam.join(', ') || 'Not set'}</span>
                                    <span><Badge variant="destructive">NEG</Badge> {negTeam.join(', ') || 'Not set'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold flex items-center gap-2"><Gavel className="h-4 w-4"/> Judges</h4>
                                <p className="text-muted-foreground">{round.judges.map(pId => allUsers.find(u => u.id === pId)?.name).join(', ') || 'No judges assigned'}</p>
                            </div>
                        </div>
                        {canDelete && (
                            <div className="flex justify-between items-center gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="mr-2"/> Delete Round</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete this round?</AlertDialogTitle></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(round.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="ballot" className="space-y-4">
                        {isJudge || user?.role === 'admin' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Winner</Label>
                                    <Select value={ballotData.winner} onValueChange={(v) => setBallotData({ ...ballotData, winner: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select winner..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="aff">Affirmative</SelectItem>
                                            <SelectItem value="neg">Negative</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Reason for Decision (RFD)</Label>
                                    <Textarea
                                        value={ballotData.rfd}
                                        onChange={(e) => setBallotData({ ...ballotData, rfd: e.target.value })}
                                        placeholder="Explain your decision..."
                                        rows={4}
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Affirmative Speaker Points</Label>
                                        <Input
                                            value={ballotData.affPoints}
                                            onChange={(e) => setBallotData({ ...ballotData, affPoints: e.target.value })}
                                            placeholder="e.g., 28.5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Negative Speaker Points</Label>
                                        <Input
                                            value={ballotData.negPoints}
                                            onChange={(e) => setBallotData({ ...ballotData, negPoints: e.target.value })}
                                            placeholder="e.g., 27.5"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Affirmative Comments</Label>
                                    <Textarea
                                        value={ballotData.affComments}
                                        onChange={(e) => setBallotData({ ...ballotData, affComments: e.target.value })}
                                        placeholder="Feedback for affirmative team..."
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Negative Comments</Label>
                                    <Textarea
                                        value={ballotData.negComments}
                                        onChange={(e) => setBallotData({ ...ballotData, negComments: e.target.value })}
                                        placeholder="Feedback for negative team..."
                                        rows={3}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleBallotSave}>Save Ballot</Button>
                                    <Button onClick={handleBallotSubmit}>Submit Ballot</Button>
                                </div>
                                {round.ballot && !round.ballot.submitted && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Your ballot is saved but not yet submitted. Click "Submit Ballot" to make it final and visible to competitors.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                {round.ballot && round.ballot.submitted ? (
                                    <div className="space-y-4 text-left">
                                        <div className="p-4 bg-muted rounded-lg">
                                            <p className="font-semibold">Winner: <span className="capitalize">{round.ballot.winner === 'aff' ? 'Affirmative' : 'Negative'}</span></p>
                                            <p className="mt-2"><strong>RFD:</strong> {round.ballot.rfd}</p>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-muted rounded-lg">
                                                <p className="font-semibold">Affirmative</p>
                                                <p className="text-sm">Points: {round.ballot.affPoints}</p>
                                                <p className="text-sm mt-2">{round.ballot.affComments}</p>
                                            </div>
                                            <div className="p-4 bg-muted rounded-lg">
                                                <p className="font-semibold">Negative</p>
                                                <p className="text-sm">Points: {round.ballot.negPoints}</p>
                                                <p className="text-sm mt-2">{round.ballot.negComments}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p>Ballot not yet submitted by the judge.</p>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="flow" className="space-y-4">
                        {isParticipant || user?.role === 'admin' ? (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <Badge>AFF</Badge> Affirmative Flow
                                    </h4>
                                    <FlowSheet flow={localAffFlow} onUpdate={handleFlowChangeAff} />
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <Badge variant="destructive">NEG</Badge> Negative Flow
                                    </h4>
                                    <FlowSheet flow={localNegFlow} onUpdate={handleFlowChangeNeg} />
                                </div>
                                <div className="flex justify-center mt-4">
                                    <Button onClick={handleFlowSave}>Save Flow</Button>
                                </div>
                                <p className="text-sm text-muted-foreground text-center">
                                    Flow auto-saves after 1 second of inactivity. You can also save manually using the button above.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                Only participants can view and edit flows.
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </AccordionContent>
        </AccordionItem>
    );
}

function TopicDialog({ isOpen, onOpenChange, onCreate }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onCreate: (topic: Omit<DebateTopic, 'id' | 'createdAt' | 'isArchived'>) => void }) {
    const [resolution, setResolution] = React.useState('');
    const [type, setType] = React.useState<DebateFormat | ''>('');
    const [months, setMonths] = React.useState('');
    const { toast } = useToast();

    const handleCreate = () => {
        if (!resolution.trim() || !type) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please provide a resolution and debate type.' });
            return;
        }
        onCreate({ resolution, type, months });
        setResolution('');
        setType('');
        setMonths('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Topic</DialogTitle>
                    <DialogDescription>Create a new resolution for the team to use.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="topic-resolution">Resolution</Label>
                        <Textarea id="topic-resolution" value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Resolved: ..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="topic-type">Debate Type</Label>
                            <Select value={type} onValueChange={(v: DebateFormat) => setType(v)}>
                                <SelectTrigger id="topic-type"><SelectValue placeholder="Select a format..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LD">Lincoln Douglas (LD)</SelectItem>
                                    <SelectItem value="PF">Public Forum (PF)</SelectItem>
                                    <SelectItem value="CX">Cross Examination (CX)</SelectItem>
                                    <SelectItem value="WSD">World Schools Debate (WSD)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="topic-months">Months</Label>
                            <Input id="topic-months" value={months} onChange={e => setMonths(e.target.value)} placeholder="e.g., September/October" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleCreate}>Create Topic</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CaseSideList({ stance, label, cases, topicId, onCreate, onDelete, router }: { stance: SpeechStance, label: string, cases: DebateCase[], topicId: string, onCreate: () => void, onDelete: (caseId: string) => void, router: any }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{label}</CardTitle>
                <Button size="sm" variant="outline" onClick={onCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Case
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {cases.length > 0 ? cases.map(caseData => (
                    <Card key={caseData.id} className="bg-muted/50">
                        <CardHeader className="p-3">
                            <p className="font-semibold text-sm">{caseData.name}</p>
                        </CardHeader>
                        <CardFooter className="p-3 pt-0 flex gap-2">
                            <Button size="sm" className="flex-1" onClick={() => router.push(`/dashboard/debate-events/${caseData.id}`)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Case
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button size="icon" variant="destructive" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete this case?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDelete(caseData.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </Card>
                )) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No {label.toLowerCase()} cases created yet.</p>
                )}
            </CardContent>
        </Card>
    );
}

function CreateCaseDialog({ isOpen, onOpenChange, onCreate }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onCreate: (name: string) => void }) {
    const [caseName, setCaseName] = React.useState('');

    React.useEffect(() => {
        if (!isOpen) {
            setCaseName('');
        }
    }, [isOpen]);

    const handleCreate = () => {
        if (!caseName.trim()) {
            // Basic validation, could be integrated with react-hook-form for more complex scenarios
            return;
        }
        onCreate(caseName);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Case</DialogTitle>
                    <DialogDescription>Give your new case a name to identify it (e.g., "Economy Advantage", "Kritik Case").</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="case-name">Case Name</Label>
                    <Input id="case-name" value={caseName} onChange={(e) => setCaseName(e.target.value)} placeholder="e.g., Economy Advantage" />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleCreate} disabled={!caseName.trim()}>Create Case</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
