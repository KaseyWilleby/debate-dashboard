
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Gavel, Mic, HelpCircle, Check, X, Users, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ChamberState = 'session_started' | 'docket_set' | 'debate_open' | 'speech' | 'questioning' | 'voting' | 'debate_closed';
type RepresentativeState = 'idle' | 'wants_to_speak' | 'wants_to_question' | 'speaking' | 'questioning';
type SpeechType = 'affirmative' | 'negative' | 'sponsorship';

interface Representative {
    id: number;
    name: string;
    state: RepresentativeState;
    speechCount: number;
    lastSpeechCycle: number | null;
}

interface LogEntry {
    id: string;
    text: string;
    timestamp: string;
}

const initialRepresentatives: Representative[] = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Rep. ${String.fromCharCode(65 + i)}`,
    state: 'idle',
    speechCount: 0,
    lastSpeechCycle: null,
}));

let logCounter = 0;

export function CongressSimulator() {
    const [chamberState, setChamberState] = React.useState<ChamberState>('session_started');
    const [representatives, setRepresentatives] = React.useState<Representative[]>(initialRepresentatives);
    const [log, setLog] = React.useState<LogEntry[]>([]);
    const [currentSpeaker, setCurrentSpeaker] = React.useState<Representative | null>(null);
    const [speechCycle, setSpeechCycle] = React.useState(0);
    const [voteResult, setVoteResult] = React.useState<{ aye: number; nay: number } | null>(null);

    const addLog = (text: string) => {
        setLog(prev => [...prev, { id: `${Date.now()}-${logCounter++}`, text, timestamp: new Date().toLocaleTimeString() }]);
    };
    
    // Simulate representatives wanting to speak
    React.useEffect(() => {
        if (chamberState === 'debate_open' || chamberState === 'speech' || chamberState === 'questioning') {
            const interval = setInterval(() => {
                setRepresentatives(prev => {
                    const idleReps = prev.filter(r => r.state === 'idle');
                    if (idleReps.length > 0 && Math.random() > 0.6) {
                        const randomRep = idleReps[Math.floor(Math.random() * idleReps.length)];
                        const wantsToSpeak = Math.random() > 0.3; // 70% want to speak, 30% question
                        const newState = (chamberState === 'speech' || chamberState === 'questioning') && !wantsToSpeak ? 'wants_to_question' : 'wants_to_speak';
                        
                        return prev.map(r => r.id === randomRep.id ? { ...r, state: newState } : r);
                    }
                    return prev;
                });
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [chamberState]);

    const handleStartSession = () => {
        addLog("PO: The house is now in session.");
        setChamberState('docket_set');
        addLog("PO: The first item on the docket is 'A Bill to Promote Renewable Energy'. Is there a motion to open debate?");
    };
    
    const handleOpenDebate = () => {
        addLog("Rep. A: I move to open debate.");
        addLog("PO: Seeing a motion to open debate, we will now move to a sponsorship speech.");
        setChamberState('debate_open');
    };

    const handleSelectSpeaker = (rep: Representative, speechType: SpeechType) => {
        const nextSpeechCycle = speechCycle + 1;
        setSpeechCycle(nextSpeechCycle);
        setRepresentatives(prev => prev.map(r => 
            r.id === rep.id ? { ...r, state: 'speaking', speechCount: r.speechCount + 1, lastSpeechCycle: nextSpeechCycle } : 
            r.state === 'wants_to_speak' ? { ...r, state: 'idle' } : r
        ));
        setCurrentSpeaker(rep);
        setChamberState('speech');
        addLog(`PO: The chair recognizes ${rep.name} for a ${speechType} speech.`);
    };

    const handleFinishSpeech = () => {
        if (!currentSpeaker) return;
        addLog(`${currentSpeaker.name} concludes their speech.`);
        addLog(`PO: Thank you, ${currentSpeaker.name}. The chair will now entertain a period of questioning.`);
        setChamberState('questioning');
        setRepresentatives(prev => prev.map(r => r.id === currentSpeaker.id ? { ...r, state: 'idle' } : r));
        setCurrentSpeaker(null);
    };
    
    const handleFinishQuestioning = () => {
        addLog("PO: The period of questioning has elapsed.");
        setChamberState('debate_open');
        setRepresentatives(prev => prev.map(r => r.state === 'wants_to_question' ? { ...r, state: 'idle' } : r));
    }
    
    const handleMoveToVote = () => {
        addLog("Rep. B: Motion for the previous question!");
        addLog("PO: The previous question has been moved. This is not debatable and requires a two-thirds vote.");
        const aye = Math.floor(Math.random() * 8) + 5; // 5-12
        const nay = 12 - aye;
        setVoteResult({ aye, nay });
        if (aye / 12 >= 2/3) {
            addLog(`PO: With a vote of ${aye} to ${nay}, the motion passes. We will now vote on the bill.`);
        } else {
            addLog(`PO: With a vote of ${aye} to ${nay}, the motion fails. Debate continues.`);
        }
        setChamberState('voting');
    }
    
    const handleResetRound = () => {
        setChamberState('session_started');
        setRepresentatives(initialRepresentatives);
        setLog([]);
        setCurrentSpeaker(null);
        setSpeechCycle(0);
        setVoteResult(null);
    }
    
    const getPrecedence = (reps: Representative[]) => {
        return [...reps].sort((a,b) => {
            if (a.speechCount < b.speechCount) return -1;
            if (a.speechCount > b.speechCount) return 1;
            if (a.lastSpeechCycle === null) return -1;
            if (b.lastSpeechCycle === null) return 1;
            if (a.lastSpeechCycle < b.lastSpeechCycle) return -1;
            if (a.lastSpeechCycle > b.lastSpeechCycle) return 1;
            return 0;
        });
    }

    const repsRequestingSpeech = representatives.filter(r => r.state === 'wants_to_speak');
    const sortedPrecedence = getPrecedence(repsRequestingSpeech);
    
    const repsRequestingQuestion = representatives.filter(r => r.state === 'wants_to_question');

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2"><Gavel className="h-5 w-5" /> Practice Simulator</CardTitle>
                <CardDescription>Run a simulated round of Student Congress and practice your duties as Presiding Officer.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Chamber Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {chamberState === 'session_started' && <Button onClick={handleStartSession}>Tap Gavel: Call to Order</Button>}
                             {chamberState === 'docket_set' && <Button onClick={handleOpenDebate}>Recognize Motion to Open Debate</Button>}
                             {chamberState === 'speech' && (
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <p><span className="font-bold">{currentSpeaker?.name}</span> is delivering a speech.</p>
                                    <Button onClick={handleFinishSpeech}>Conclude Speech</Button>
                                </div>
                             )}
                             {chamberState === 'questioning' && (
                                 <div className="text-center">
                                    <p className="mb-2">Awaiting questions for the previous speaker.</p>
                                    <Button onClick={handleFinishQuestioning}>End Questioning Period</Button>
                                 </div>
                            )}
                             {(chamberState === 'debate_open') && (
                                 <div className="text-center">
                                    <p className="text-muted-foreground mb-2">Debate is open. Recognize the next speaker from the precedence chart.</p>
                                    <Button onClick={handleMoveToVote} variant="secondary">Recognize Motion for Previous Question</Button>
                                 </div>
                             )}
                             {chamberState === 'voting' && voteResult && (
                                 <div className="text-center">
                                     <p className="font-bold text-lg">Vote Result: {voteResult.aye} AYE - {voteResult.nay} NAY</p>
                                     <Button onClick={handleFinishQuestioning}>Continue Debate</Button>
                                 </div>
                             )}

                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Representatives</CardTitle>
                         </CardHeader>
                         <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {representatives.map(rep => (
                                <div key={rep.id} className={cn("p-2 border rounded-md text-center text-xs", {
                                    'bg-yellow-100 dark:bg-yellow-900/50': rep.state === 'wants_to_speak',
                                    'bg-blue-100 dark:bg-blue-900/50': rep.state === 'wants_to_question',
                                    'bg-green-100 dark:bg-green-900/50 animate-pulse': rep.state === 'speaking',
                                })}>
                                    <p className="font-bold">{rep.name}</p>
                                    <p className="text-muted-foreground">{rep.speechCount} speeches</p>
                                </div>
                            ))}
                         </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1 space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Action Queue</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <h3 className="font-semibold text-sm flex items-center gap-1"><Mic className="h-4 w-4" /> Precedence Chart (Speech)</h3>
                             {sortedPrecedence.length > 0 ? (
                                <ul className="text-sm space-y-1">
                                    {sortedPrecedence.slice(0,5).map(rep => (
                                        <li key={rep.id} className="flex justify-between items-center">
                                            <span>{rep.name}</span>
                                            <div className="flex gap-1">
                                                <Button size="xs" variant="outline" onClick={() => handleSelectSpeaker(rep, 'affirmative')}>Aff</Button>
                                                <Button size="xs" variant="outline" onClick={() => handleSelectSpeaker(rep, 'negative')}>Neg</Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                             ) : <p className="text-xs text-muted-foreground">No representatives wish to speak.</p>}

                            <h3 className="font-semibold text-sm flex items-center gap-1 pt-2"><HelpCircle className="h-4 w-4" /> Questioning Queue</h3>
                             {repsRequestingQuestion.length > 0 ? (
                                <ul className="text-sm space-y-1">
                                    {repsRequestingQuestion.slice(0,3).map(rep => (
                                        <li key={rep.id}>{rep.name}</li>
                                    ))}
                                </ul>
                             ) : <p className="text-xs text-muted-foreground">No representatives have questions.</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Event Log</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                                <ul className="space-y-2 text-sm">
                                    {log.slice().reverse().map(entry => (
                                        <li key={entry.id} className="flex gap-2">
                                            <span className="text-muted-foreground tabular-nums">[{entry.timestamp}]</span>
                                            <span>{entry.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </ScrollArea>
                             <Button onClick={handleResetRound} variant="destructive" className="w-full mt-4">Reset Round</Button>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    )
}

    