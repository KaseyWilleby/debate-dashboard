
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, RefreshCw, Loader2, Video, StopCircle, Save, ChevronsRight, Trash2, VideoIcon, Repeat, Camera, CameraOff, ArrowUp, ArrowDown, Share, BrainCircuit, Gavel, BookOpen, FilePenLine, Mic, PlusCircle, Upload } from "lucide-react";
import { cn, getRoleBasedColor, formatTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SavedSpeech, User, CongressDocket, CongressBill, WrittenSpeech, SpeechStance } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { MultiSelect } from "@/components/ui/multi-select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { congressDockets as initialDockets } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CongressSimulator } from "@/components/dashboard/congress-simulator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { extractBillsFromPdf } from "@/ai/flows/extract-bills-from-pdf-flow";


type Topic = { id: string; text: string };
type TimerDirection = "up" | "down";
type TimerFlashState = 'none' | 'yellow' | 'red' | 'expired';


const WRITTEN_SPEECHES_STORAGE_KEY = 'work-session-written-speeches';
const CONGRESS_DOCKETS_STORAGE_KEY = 'work-session-congress-dockets';
const SAVED_SPEECHES_STORAGE_KEY = 'work-session-saved-speeches';


export default function StudentCongressPage() {
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { firestore } = useFirebase();
    
    const usersCollectionRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'users');
    }, [firestore, user]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersCollectionRef);

    const [congressDockets, setCongressDockets] = React.useState<CongressDocket[]>(() => {
        if (typeof window === 'undefined') return initialDockets;
        try {
            const stored = localStorage.getItem(CONGRESS_DOCKETS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : initialDockets;
        } catch (e) {
            return initialDockets;
        }
    });

    const [selectedDocket, setSelectedDocket] = React.useState<CongressDocket | null>(null);
    const [billForDetail, setBillForDetail] = React.useState<CongressBill | null>(null);
    const [billForSpeechWriting, setBillForSpeechWriting] = React.useState<CongressBill | null>(null);
    
    // Admin state
    const [isCreateBillOpen, setIsCreateBillOpen] = React.useState(false);

    // Practice Session State (Recording)
    const [isPracticeSessionOpen, setIsPracticeSessionOpen] = React.useState(false);
    const [selectedTopic, setSelectedTopic] = React.useState<Topic | null>(null);
    const [currentSpeechContent, setCurrentSpeechContent] = React.useState('');
    const [currentSpeechStance, setCurrentSpeechStance] = React.useState<SpeechStance>('affirmative');

    const [initialSpeechTime] = React.useState(3.5 * 60);
    const [speechTime, setSpeechTime] = React.useState(initialSpeechTime);

    const [speechTimerActive, setSpeechTimerActive] = React.useState(false);
    const [speechTimerDirection, setSpeechTimerDirection] = React.useState<TimerDirection>('down');
    
    const [speechTimerFlashState, setSpeechTimerFlashState] = React.useState<TimerFlashState>('none');

    const speechTimeIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // Recording states
    const [isSaving, setIsSaving] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState(true);
    const [isCameraOn, setIsCameraOn] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const recordedChunksRef = React.useRef<Blob[]>([]);

    const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = React.useState<string | undefined>(undefined);
    const streamRef = React.useRef<MediaStream | null>(null);
    
    // Countdown states
    const [countdown, setCountdown] = React.useState<number | null>(null);
    const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // Share state (for both written and recorded)
    const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
    const [speechToShare, setSpeechToShare] = React.useState<SavedSpeech | WrittenSpeech | null>(null);
    const [usersToShareWith, setUsersToShareWith] = React.useState<string[]>([]);
    const [newFeedback, setNewFeedback] = React.useState("");
    
    // Written Speeches State
    const [writtenSpeeches, setWrittenSpeeches] = React.useState<WrittenSpeech[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(WRITTEN_SPEECHES_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    });
    const [activeSpeech, setActiveSpeech] = React.useState<WrittenSpeech | null>(null);
    const [speechContent, setSpeechContent] = React.useState('');
    const [speechStance, setSpeechStance] = React.useState<SpeechStance>('affirmative');

     const [filterBillId, setFilterBillId] = React.useState<string>('all');
     const allBills = React.useMemo(() => congressDockets.flatMap(d => d.items), [congressDockets]);

    const billSpeeches = React.useMemo(() => {
        if (!user || !billForSpeechWriting || !allUsers) return [];
        const speechesForBill = writtenSpeeches.filter(s => s.billId === billForSpeechWriting?.id);
        
        return speechesForBill
            .filter(s => s.ownerId === user.id || (s.sharedWith || []).includes(user.id))
            .sort((a,b) => {
                const dateA = a.updatedAt || a.createdAt;
                const dateB = b.updatedAt || b.createdAt;
                if (!dateA || !dateB) return 0;
                return new Date(dateB).getTime() - new Date(a.date).getTime()
            });

    }, [writtenSpeeches, billForSpeechWriting, user, allUsers]);
    
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(CONGRESS_DOCKETS_STORAGE_KEY, JSON.stringify(congressDockets));
        }
    }, [congressDockets]);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(WRITTEN_SPEECHES_STORAGE_KEY, JSON.stringify(writtenSpeeches));
            } catch (e) {
                 if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                    toast({
                        variant: 'destructive',
                        title: 'Storage Full',
                        description: 'Browser storage is full. Please delete some saved scripts to make space.',
                    });
                }
            }
        }
    }, [writtenSpeeches, toast]);

    const handleNewSpeech = () => {
        setActiveSpeech(null);
        setSpeechContent('');
        setSpeechStance('affirmative');
    }

    const handleSaveWrittenSpeech = () => {
        if (!user || !billForSpeechWriting) return;

        if (activeSpeech && activeSpeech.ownerId === user.id) { // Update existing
            const updatedSpeech = { ...activeSpeech, content: speechContent, stance: speechStance, updatedAt: new Date().toISOString() };
            setWrittenSpeeches(prev => prev.map(s => s.id === activeSpeech.id ? updatedSpeech : s));
            toast({ title: 'Speech Updated!' });
        } else { // Create new
            const newSpeech: WrittenSpeech = {
                id: `ws-${Date.now()}`,
                billId: billForSpeechWriting.id,
                ownerId: user.id,
                title: billForSpeechWriting.title, // Add title for consistency
                body: '', // Body is not used, content is
                stance: speechStance,
                content: speechContent,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sharedWith: [],
                mode: 'congress',
                date: new Date().toISOString(),
            };
            setWrittenSpeeches(prev => [newSpeech, ...prev]);
            setActiveSpeech(newSpeech);
            toast({ title: 'Speech Saved!' });
        }
    };

    const handleDeleteWrittenSpeech = (speechId: string) => {
        setWrittenSpeeches(prev => prev.filter(s => s.id !== speechId));
        if (activeSpeech?.id === speechId) {
            handleNewSpeech();
        }
        toast({ title: 'Speech Deleted', variant: 'destructive' });
    }

    React.useEffect(() => {
        if (activeSpeech) {
            setSpeechContent(activeSpeech.content || '');
            setSpeechStance(activeSpeech.stance || 'affirmative');
        } else {
            setSpeechContent('');
            setSpeechStance('affirmative');
        }
    }, [activeSpeech]);


    const [savedSpeeches, setSavedSpeeches] = React.useState<SavedSpeech[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(SAVED_SPEECHES_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    });

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(SAVED_SPEECHES_STORAGE_KEY, JSON.stringify(savedSpeeches));
        }
    }, [savedSpeeches]);

    const [viewingSpeech, setViewingSpeech] = React.useState<SavedSpeech | null>(null);

    const visibleWrittenSpeeches = React.useMemo(() => {
        if (!user || !writtenSpeeches || !allUsers) return [];
        const written = writtenSpeeches.filter(s => s.mode === 'congress' && (s.ownerId === user.id || (s.sharedWith || []).includes(user.id)))

        const filtered = filterBillId === 'all' 
            ? written 
            : written.filter(s => s.billId === filterBillId);

        return filtered.sort((a,b) => {
            const dateA = a.updatedAt || a.createdAt;
            const dateB = b.updatedAt || b.createdAt;
            if (!dateA || !dateB) return 0;
            return new Date(dateB).getTime() - new Date(a.date).getTime();
        });
    }, [writtenSpeeches, user, filterBillId, allUsers]);
    
    const visibleRecordedSpeeches = React.useMemo(() => {
        if (!user || !savedSpeeches) return [];
        const recorded = savedSpeeches.filter(s => s.mode === 'congress' && s.ownerId === user.id)
             .map(s => ({
                ...s,
                billId: s.billId || allBills.find(b => b.title === s.topic)?.id || '',
            }));


        const filtered = filterBillId === 'all'
            ? recorded
            : recorded.filter(s => s.billId === filterBillId);

        return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [savedSpeeches, user, filterBillId, allBills]);

    const sharedRecordedSpeeches = React.useMemo(() => {
        if (!user || !savedSpeeches) return [];
        const recorded = savedSpeeches.filter(s =>
            s.mode === 'congress' &&
            s.ownerId !== user.id &&
            s.sharedWith?.includes(user.id)
        ).map(s => ({
            ...s,
            billId: s.billId || allBills.find(b => b.title === s.topic)?.id || '',
        }));

        const filtered = filterBillId === 'all'
            ? recorded
            : recorded.filter(s => s.billId === filterBillId);

        return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [savedSpeeches, user, filterBillId, allBills]);


    const stopStream = React.useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if(videoRef.current){
            videoRef.current.srcObject = null;
        }
    }, []);

    const restoreCameraStream = React.useCallback(async (deviceId?: string) => {
        stopStream();
        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: true,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            setHasCameraPermission(true);
    
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
                variant: 'destructive',
                title: 'Camera Access Denied',
                description: 'Please enable camera permissions in your browser settings to use this feature.',
            });
        }
    }, [toast, stopStream]);
    
    // Initial device listing (permission requested on session open)
    React.useEffect(() => {
        const listDevices = async () => {
             // Enumerate devices to populate the selector
             const devices = await navigator.mediaDevices.enumerateDevices();
             const videoDevices = devices.filter(d => d.kind === 'videoinput');
             setVideoDevices(videoDevices);
 
             // Select a device
             const storedDeviceId = localStorage.getItem('selectedVideoDeviceId');
             let finalDeviceId = storedDeviceId;
             if (!videoDevices.some(d => d.deviceId === storedDeviceId)) {
                 finalDeviceId = videoDevices.length > 0 ? videoDevices[0].deviceId : undefined;
             }
             setSelectedVideoDeviceId(finalDeviceId);
        }

        navigator.mediaDevices.enumerateDevices().then(listDevices).catch(() => {});
    
        // Cleanup timers on unmount
        return () => {
            if (speechTimeIntervalRef.current) clearInterval(speechTimeIntervalRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 
    
    // Effect to handle camera stream based on selected device, dialog state and camera toggle
    React.useEffect(() => {
        if (isPracticeSessionOpen && !viewingSpeech && isCameraOn) {
            restoreCameraStream(selectedVideoDeviceId);
        } else {
            stopStream();
        }
    
        // Cleanup on device change or unmount
        return () => {
            stopStream();
        };
    }, [selectedVideoDeviceId, isPracticeSessionOpen, viewingSpeech, restoreCameraStream, isCameraOn, stopStream]);
    
    const stopRecording = React.useCallback(() => {
        if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
            mediaRecorderRef.current.stop();
        }
    }, []);

    React.useEffect(() => {
        if (speechTimerDirection === 'down') {
            if (speechTime <= 0 && speechTimerActive) {
                if (speechTimeIntervalRef.current) clearInterval(speechTimeIntervalRef.current);
                setSpeechTimerActive(false);
                setSpeechTimerFlashState('expired');
                stopRecording();
            } else if (speechTime <= 5) {
                setSpeechTimerFlashState('red');
            } else if (speechTime <= 10) {
                setSpeechTimerFlashState('yellow');
            } else {
                setSpeechTimerFlashState('none');
            }
        } else {
            setSpeechTimerFlashState('none');
        }
    }, [speechTime, speechTimerActive, stopRecording, speechTimerDirection]);

    
    const handleStartPracticeSession = (speech: WrittenSpeech) => {
        const bill = allBills.find(b => b.id === speech.billId);
        if (!bill) return;

        resetPractice();
        setSelectedTopic({ id: bill.id, text: bill.title });
        setCurrentSpeechContent(speech.content || ''); 
        setCurrentSpeechStance(speech.stance || 'affirmative');
        setIsPracticeSessionOpen(true);
        setBillForDetail(null);
        setBillForSpeechWriting(null);
    };

    const resetPractice = React.useCallback(() => {
        setIsPracticeSessionOpen(false);
        setViewingSpeech(null);
        setSelectedTopic(null);
        setCurrentSpeechContent("");
        
        setVideoUrl(null);
        recordedChunksRef.current = [];
        
        if(isRecording) {
            stopRecording();
        }
        setIsRecording(false);
        
        setSpeechTimerActive(false);
        if (speechTimeIntervalRef.current) clearInterval(speechTimeIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setCountdown(null);

        setSpeechTime(initialSpeechTime);
        
        setIsCameraOn(false);
        setSpeechTimerDirection('down');
        setSpeechTimerFlashState('none');
        stopStream();

    }, [isRecording, stopRecording, stopStream, initialSpeechTime]);

    // Timer controls
    const startSpeechTimer = () => {
        if (speechTimerDirection === 'down' && speechTime <= 0) return;
        setSpeechTimerActive(true);
        speechTimeIntervalRef.current = setInterval(() => {
            setSpeechTime(prev => speechTimerDirection === 'down' ? prev - 1 : prev + 1);
        }, 1000);

        if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
        }
    };

    const pauseSpeechTimer = () => {
        setSpeechTimerActive(false);
        if (speechTimeIntervalRef.current) clearInterval(speechTimeIntervalRef.current);

        if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
        }
    };

     const startRecording = () => {
        if (!isCameraOn || !streamRef.current || !hasCameraPermission) {
            toast({ variant: "destructive", title: "Camera not available", description: "Please grant camera permission and turn it on."});
            return;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            return;
        }
        
        setVideoUrl(null);
        recordedChunksRef.current = [];
        
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'video/webm; codecs=vp9,opus' });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);

            if (videoRef.current) {
                videoRef.current.srcObject = null;
                videoRef.current.muted = false;
            }
            setIsRecording(false);
            pauseSpeechTimer();
        };
        
        if (speechTimerDirection === 'up') {
            setSpeechTime(0);
        } else {
            setSpeechTime(initialSpeechTime);
        }
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        startSpeechTimer();
    };

    const initiateRecordingProcess = () => {
        if (!isCameraOn || !streamRef.current || !hasCameraPermission) {
            toast({ variant: "destructive", title: "Camera not available", description: "Please grant camera permission and turn it on." });
            return;
        }
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

        // Stop speech timer if it's running
        if (speechTimerActive) {
            pauseSpeechTimer();
        }

        setCountdown(5);

        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev === null || prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    setCountdown(null);
                    startRecording();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleRestartRecording = () => {
        if (mediaRecorderRef.current) {
            if (mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        }
        
        setSpeechTime(speechTimerDirection === 'down' ? initialSpeechTime : 0);
        if (speechTimeIntervalRef.current) {
            clearInterval(speechTimeIntervalRef.current);
        }
        restoreCameraStream(selectedVideoDeviceId);
        initiateRecordingProcess();
    };

    const handleSaveRecordedSpeech = async () => {
        if (recordedChunksRef.current.length === 0 || !selectedTopic || !user ) {
            toast({ variant: 'destructive', title: 'Cannot Save', description: 'No video or topic available to save.' });
            return;
        }
        
        setIsSaving(true);
        try {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            
            const newSavedSpeech: SavedSpeech = {
                id: `rec-${Date.now()}`,
                ownerId: user.id,
                topic: selectedTopic.text,
                notes: currentSpeechContent,
                speechTime: speechTimerDirection === 'down' ? initialSpeechTime - speechTime : speechTime,
                mode: 'congress',
                videoUrl: URL.createObjectURL(blob),
                date: new Date().toISOString(),
                sharedWith: [],
                stance: currentSpeechStance,
                billId: selectedTopic.id,
            };
            setSavedSpeeches(prev => [...prev, newSavedSpeech]);
            toast({ title: 'Recording Saved!', description: 'Your practice session has been archived.' });
            resetPractice();
        } catch (error) {
            console.error("Error saving speech: ", error);
            toast({ variant: "destructive", title: "Save failed", description: "Could not save video." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleViewArchivedSpeech = (speech: SavedSpeech) => {
        resetPractice();
        setViewingSpeech(speech);
        setSelectedTopic({ id: speech.billId || '', text: speech.topic });
        setCurrentSpeechContent(speech.notes);
        setVideoUrl(speech.videoUrl);

        setIsPracticeSessionOpen(true);
        setIsCameraOn(false);
    };

    const handleDeleteCurrentSpeech = () => {
        setVideoUrl(null);
        recordedChunksRef.current = [];
        setSpeechTime(speechTimerDirection === 'down' ? initialSpeechTime : 0);
        if (speechTimeIntervalRef.current) {
            clearInterval(speechTimeIntervalRef.current);
        }
        restoreCameraStream(selectedVideoDeviceId);
        toast({ title: 'Recording Discarded' });
    }
    
    const handleDeleteSpeech = async (speechId: string, type: 'written' | 'recorded') => {
        if (type === 'recorded') {
            setSavedSpeeches(prev => prev.filter(s => s.id !== speechId));
            toast({ title: 'Recording Deleted', variant: 'destructive'});
             if (viewingSpeech && viewingSpeech.id === speechId) {
                resetPractice();
            }
        } else {
            handleDeleteWrittenSpeech(speechId);
        }
    }


    const toggleSpeechTimerDirection = () => {
        setSpeechTimerDirection(prev => {
            const newDirection = prev === 'down' ? 'up' : 'down';
            if (newDirection === 'up') {
                setSpeechTime(0);
            } else {
                setSpeechTime(initialSpeechTime);
            }
            return newDirection;
        });
    };

    const openShareDialog = (speech: SavedSpeech | WrittenSpeech) => {
        setSpeechToShare(speech);
        setUsersToShareWith(speech.sharedWith || []);
        setIsShareDialogOpen(true);
    };

    const handleConfirmShare = async () => {
        if (!speechToShare || !allUsers) return;
    
        try {
            if ('videoUrl' in speechToShare) { // It's a SavedSpeech (recorded)
                const updatedSpeech = { ...speechToShare, sharedWith: usersToShareWith };
                setSavedSpeeches(prev => prev.map(s => s.id === speechToShare.id ? updatedSpeech : s));
                if (viewingSpeech?.id === speechToShare.id) {
                    setViewingSpeech(prev => prev ? {...prev, sharedWith: usersToShareWith} : null);
                }
            } else { // It's a WrittenSpeech
                const updatedSpeech: WrittenSpeech = { ...speechToShare, sharedWith: usersToShareWith };
                setWrittenSpeeches(prev => prev.map(s => s.id === updatedSpeech.id ? updatedSpeech : s));
            }
            
            toast({ title: 'Sharing Updated' });
        } catch (error) {
            console.error("Error updating sharing settings:", error);
            toast({ variant: 'destructive', title: 'Sharing Failed', description: (error as Error).message });
        }
    
        setIsShareDialogOpen(false);
        setSpeechToShare(null);
    }
    
    const handleAddFeedback = async () => {
        if (!newFeedback.trim() || !user || !viewingSpeech) return;
        
        // This is a placeholder as the type doesn't support feedback
        toast({ title: "Feedback functionality is not fully implemented." });

    };


    const renderBillCard = (bill: CongressBill) => (
        <Card 
            key={bill.id}
            className="cursor-pointer transition-all hover:bg-primary/10"
            onClick={() => {
                setBillForSpeechWriting(bill);
                handleNewSpeech();
            }}
        >
            <CardContent className="p-4 text-center">
                <p className="font-medium">{bill.title}</p>
            </CardContent>
        </Card>
    );

    const getTimerClass = (state: TimerFlashState) => {
        switch (state) {
            case 'yellow': return 'text-yellow-500 animate-pulse';
            case 'red': return 'text-red-500 animate-pulse';
            case 'expired': return 'text-red-600 animate-expired-flash';
            default: return '';
        }
    };
    
    const handleDocketChange = (docketId: string) => {
        const docket = congressDockets.find(d => d.id === docketId);
        setSelectedDocket(docket || null);
    }

    const Motion = ({ name, description, vote, isDebatable }: { name: string, description: string, vote: string, isDebatable: boolean }) => (
        <li className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border rounded-md bg-muted/50">
            <div>
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex gap-2 mt-2 sm:mt-0 flex-shrink-0">
                <Badge variant={isDebatable ? "outline" : "secondary"}>{isDebatable ? "Debatable" : "Not Debatable"}</Badge>
                <Badge variant="secondary">{vote}</Badge>
            </div>
        </li>
    );

    const associatedRecordings = React.useMemo(() => {
        if (!billForSpeechWriting || !savedSpeeches) return [];
        return savedSpeeches.filter(s => s.topic === billForSpeechWriting.title && s.mode === 'congress');
    }, [billForSpeechWriting, savedSpeeches]);

    const viewingSpeechBill = React.useMemo(() => {
        if (!viewingSpeech && !selectedTopic) return null;
        const billId = viewingSpeech ? viewingSpeech.billId : selectedTopic?.id;
        if (!billId) return null;
        return allBills.find(b => b.id === billId);
    }, [viewingSpeech, selectedTopic, allBills]);

    const handleCreateBill = (title: string, fullText: string, docketId: string) => {
        const newBill: CongressBill = {
            id: `bill-${Date.now()}`,
            title,
            fullText,
        };

        setCongressDockets(prev => {
            return prev.map(docket => {
                if (docket.id === docketId) {
                    return { ...docket, items: [...docket.items, newBill] };
                }
                return docket;
            });
        });
        toast({ title: 'Bill Created', description: `Added "${title}" to the docket.` });
        setIsCreateBillOpen(false);
    };
    
    const handleUploadDocket = (docket: CongressDocket) => {
        if (congressDockets.some(d => d.id === docket.id || d.name === docket.name)) {
            toast({ variant: 'destructive', title: 'Docket Exists', description: 'A docket with this ID or name already exists.' });
            return;
        }
        setCongressDockets(prev => [...prev, docket]);
        toast({ title: 'Docket Uploaded', description: `"${docket.name}" has been added.` });
    };

    const isLoading = isAuthLoading || areUsersLoading;

    if (isLoading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Student Congress</h1>
                    <p className="text-muted-foreground">Practice your congressional debate skills.</p>
                </div>
            </div>

            <Tabs defaultValue="practice" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="practice">Practice</TabsTrigger>
                    <TabsTrigger value="presiding-officer">Presiding Officer Training</TabsTrigger>
                </TabsList>
                <TabsContent value="practice" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                             <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Bill Selector</CardTitle>
                                    <CardDescription>
                                        Select a docket, then choose a bill or resolution to speak on.
                                    </CardDescription>
                                </div>
                                {user?.role === 'admin' && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setIsCreateBillOpen(true)}>
                                            <PlusCircle className="mr-2" /> New Bill
                                        </Button>
                                        <UploadDocketDialog onUpload={handleUploadDocket} />
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <Select onValueChange={handleDocketChange} value={selectedDocket?.id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a docket..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {congressDockets.map(docket => (
                                            <SelectItem key={docket.id} value={docket.id}>{docket.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedDocket && (
                                    <div className="grid grid-cols-1 gap-4">
                                        {selectedDocket.items.map(item => renderBillCard(item))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Saved Speeches</CardTitle>
                                <div className="w-64">
                                    <Select value={filterBillId} onValueChange={setFilterBillId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Filter by bill..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Bills</SelectItem>
                                            {allBills.map(bill => (
                                                <SelectItem key={bill.id} value={bill.id}>{bill.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                        {visibleWrittenSpeeches.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                                {visibleWrittenSpeeches.map(speech => {
                                    const owner = allUsers?.find(u => u.id === speech.ownerId);
                                    const isOwner = user?.id === speech.ownerId;
                                    const sharedUsers = speech.sharedWith?.map(id => allUsers?.find(u => u.id === id)).filter(Boolean) as User[];
                                    const speechDate = speech.updatedAt || speech.createdAt;

                                    return (
                                        <AccordionItem value={speech.id} key={speech.id}>
                                            <div className="flex items-center gap-4 py-2">
                                                <Badge variant={speech.stance === 'affirmative' ? 'default' : 'destructive'} className="capitalize bg-opacity-80 flex-shrink-0">{speech.stance}</Badge>
                                                <div className="flex-1">
                                                    <AccordionTrigger className="text-sm text-left hover:no-underline py-2">
                                                        <div className="flex-1 flex flex-col items-start gap-1">
                                                            <p className="font-semibold">{speech.title}</p>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary" className="capitalize">Student Congress</Badge>
                                                                {!isOwner && owner && <p className="text-xs text-muted-foreground">Shared by {owner.name}</p>}
                                                                {isOwner && sharedUsers && sharedUsers.length > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-xs text-muted-foreground">Shared with:</p>
                                                                        <div className="flex -space-x-2">
                                                                            <TooltipProvider>
                                                                            {sharedUsers.map(su => (
                                                                                <Tooltip key={su.id}>
                                                                                    <TooltipTrigger asChild>
                                                                                        <Avatar className="h-5 w-5 border-2 border-background"><AvatarFallback className={cn(getRoleBasedColor(su.role))}>{su.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent><p>{su.name}</p></TooltipContent>
                                                                                </Tooltip>
                                                                            ))}
                                                                            </TooltipProvider>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => { setBillForSpeechWriting(allBills.find(b => b.id === speech.billId) || null); setActiveSpeech(speech); }}>
                                                        <FilePenLine className="mr-2 h-4 w-4"/> Edit
                                                    </Button>
                                                    <Button size="sm" variant="default" onClick={() => handleStartPracticeSession(speech)}>
                                                        <Mic className="mr-2 h-4 w-4"/> Practice
                                                    </Button>
                                                </div>
                                            </div>
                                            <AccordionContent>
                                                {speechDate && <p className="text-xs text-muted-foreground mb-2">{format(new Date(speechDate), 'PPP')}</p>}
                                                <p className="text-sm text-muted-foreground line-clamp-3">{speech.content}</p>
                                                {isOwner && (
                                                     <div className="flex gap-2 mt-2">
                                                        {allUsers && (
                                                            <Button size="sm" variant="outline" onClick={() => openShareDialog(speech)}><Share className="mr-2 h-4 w-4"/> Share</Button>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this speech. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSpeech(speech.id, 'written')}>Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                     </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                            </Accordion>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-4">
                                {filterBillId === 'all' ? 'No saved Congress speeches yet.' : 'No speeches found for this bill.'}
                            </div>
                        )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Saved Recordings</CardTitle></CardHeader>
                        <CardContent>
                            {visibleRecordedSpeeches.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full">
                                    {visibleRecordedSpeeches.map(speech => {
                                        const owner = allUsers?.find(u => u.id === speech.ownerId);
                                        const isOwner = user?.id === speech.ownerId;
                                        return (
                                            <AccordionItem value={speech.id} key={speech.id}>
                                                <div className="flex items-center gap-4 py-2">
                                                    <Badge variant={speech.stance === 'affirmative' ? 'default' : 'destructive'} className="capitalize bg-opacity-80 flex-shrink-0">{speech.stance}</Badge>
                                                    <div className="flex-1">
                                                        <AccordionTrigger className="text-sm text-left hover:no-underline py-2">
                                                            <div className="flex-1 flex flex-col items-start gap-1">
                                                                <p className="font-semibold">{speech.topic}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="capitalize"><Mic className="mr-1 h-3 w-3" /> Recorded</Badge>
                                                                    {!isOwner && owner && (<p className="text-xs text-muted-foreground">Shared by {owner.name}</p>)}
                                                                </div>
                                                            </div>
                                                        </AccordionTrigger>
                                                    </div>
                                                    <Button size="sm" variant="secondary" onClick={() => handleViewArchivedSpeech(speech)}>
                                                        <ChevronsRight className="mr-2 h-4 w-4"/> View
                                                    </Button>
                                                </div>
                                                <AccordionContent>
                                                    <p className="text-xs text-muted-foreground mb-2">{format(new Date(speech.date), 'PPP')}</p>
                                                    {isOwner && (
                                                         <div className="flex gap-2">
                                                            {allUsers && (
                                                                <Button size="sm" variant="outline" onClick={() => openShareDialog(speech)}><Share className="mr-2 h-4 w-4"/> Share</Button>
                                                            )}
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSpeech(speech.id, 'recorded')}>Delete</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                         </div>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        )
                                    })}
                                </Accordion>
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    {filterBillId === 'all' ? 'No saved Congress recordings yet.' : 'No recordings found for this bill.'}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {sharedRecordedSpeeches.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Shared Recordings</CardTitle>
                                <CardDescription>Recordings that others have shared with you.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    {sharedRecordedSpeeches.map(speech => {
                                        const owner = allUsers?.find(u => u.id === speech.ownerId);
                                        return (
                                            <AccordionItem value={speech.id} key={speech.id}>
                                                <div className="flex items-center gap-4 py-2">
                                                    <Badge variant={speech.stance === 'affirmative' ? 'default' : 'destructive'} className="capitalize bg-opacity-80 flex-shrink-0">{speech.stance}</Badge>
                                                    <div className="flex-1">
                                                        <AccordionTrigger className="text-sm text-left hover:no-underline py-2">
                                                            <div className="flex-1 flex flex-col items-start gap-1">
                                                                <p className="font-semibold">{speech.topic}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="capitalize"><Mic className="mr-1 h-3 w-3" /> Recorded</Badge>
                                                                    {owner && (
                                                                        <p className="text-xs text-muted-foreground">Shared by {owner.name}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </AccordionTrigger>
                                                    </div>
                                                    <Button size="sm" variant="secondary" onClick={() => handleViewArchivedSpeech(speech)}>
                                                        <ChevronsRight className="mr-2 h-4 w-4"/> View
                                                    </Button>
                                                </div>
                                                <AccordionContent>
                                                    <p className="text-xs text-muted-foreground mb-2">{format(new Date(speech.date), 'PPP')}</p>
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
                <TabsContent value="presiding-officer" className="mt-6">
                   <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline text-xl flex items-center gap-2"><BookOpen className="h-5 w-5" /> Learning Center</CardTitle>
                                <CardDescription>Master the rules and responsibilities of a Presiding Officer.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Role of the Presiding Officer</AccordionTrigger>
                                        <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                            <p>Your primary duty is to be a fair, impartial, and efficient facilitator of debate. You do not participate in the debate. Key responsibilities include recognizing speakers, ruling on points of order, calling votes, and maintaining decorum. You are the servant of the chamber.</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Starting the Session</AccordionTrigger>
                                        <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                            <p>A session begins with your leadership. Follow these steps:</p>
                                            <ol className="list-decimal pl-5 space-y-1">
                                                <li><strong>Call to Order:</strong> Use one firm tap of the gavel and say, "The House is now in session."</li>
                                                <li><strong>Set the Docket:</strong> Announce the first item on the docket. "The first item on the docket is [Bill/Resolution Title]. Is there a motion to open debate?"</li>
                                                <li><strong>First Speech:</strong> Once a motion to open debate is made and seconded, call for an authorship/sponsorship speech. "Seeing a motion to open debate on the floor, is there an author or sponsor wishing to speak?"</li>
                                            </ol>
                                        </AccordionContent>
                                    </AccordionItem>
                                     <AccordionItem value="item-3">
                                        <AccordionTrigger>Managing Debate & Precedence</AccordionTrigger>
                                        <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                            <p>Fairness is maintained through a precedence chart. This chart tracks who has spoken and in what order to ensure everyone gets a chance to speak.</p>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li><strong>Precedence:</strong> Prioritizes speakers who have spoken the least number of times.</li>
                                                <li><strong>Recency:</strong> A secondary factor used to break ties in precedence. Prioritizes speakers who have spoken less recently than others with the same number of speeches.</li>
                                                <li><strong>Questioning:</strong> After each speech, there is a questioning period. You will manage this by recognizing members who rise to ask questions one at a time.</li>
                                            </ul>
                                            <p><strong>Example:</strong> "Thank you, Representative. The chair now recognizes members for a period of questioning. The chair recognizes the representative from..."</p>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-4">
                                        <AccordionTrigger>Core Parliamentary Motions</AccordionTrigger>
                                        <AccordionContent>
                                            <ul className="space-y-4">
                                                <Motion name="Previous Question" description="To end debate on a specific issue (e.g., the bill, an amendment) and move to an immediate vote." vote="2/3 Vote" isDebatable={false} />
                                                <Motion name="Lay on the Table / Take from the Table" description="To temporarily set aside the current legislation, or to bring it back for consideration." vote="Majority Vote" isDebatable={false} />
                                                <Motion name="Point of Order / Parliamentary Inquiry" description="To point out a rules violation (Order) or to ask a question about procedure (Inquiry)." vote="Chair's Decision" isDebatable={false} />
                                                <Motion name="Amend" description="To modify a bill or resolution. Requires an affirmative/negative speech cycle before voting on the amendment." vote="Majority Vote" isDebatable={true} />
                                                <Motion name="Recess" description="To take a short break in the session." vote="Majority Vote" isDebatable={false} />
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-5">
                                        <AccordionTrigger>Voting Procedures</AccordionTrigger>
                                        <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                            <p>Votes are your way of letting the chamber decide. Be clear and confident.</p>
                                            <ol className="list-decimal pl-5 space-y-1">
                                                <li><strong>Announce the Vote:</strong> "We are now voting on the motion for the Previous Question. This requires a two-thirds vote."</li>
                                                <li><strong>Call the Vote:</strong> "All those in favor, please raise your placards... All those opposed, please raise your placards..."</li>
                                                <li><strong>State the Result:</strong> Clearly announce whether the motion passes or fails, and the vote count if necessary. "With a vote of 15 in favor and 5 opposed, the motion for the Previous Question passes."</li>
                                            </ol>
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-6">
                                        <AccordionTrigger>Using the Gavel</AccordionTrigger>
                                        <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                                            <p>The gavel is a symbol of authority, not a toy. Use it sparingly but effectively.</p>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li><strong>One Tap:</strong> To call the chamber to order, to announce the result of a vote, or to signal the end of a recess.</li>
                                                <li><strong>Two Taps:</strong> To call the chamber to order if it is unruly.</li>
                                                <li><strong>Series of Taps:</strong> To restore order during a session that has become chaotic. Use with caution.</li>
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                        <CongressSimulator />
                   </div>
                </TabsContent>
            </Tabs>
            
            <CreateBillDialog 
                isOpen={isCreateBillOpen}
                onOpenChange={setIsCreateBillOpen}
                dockets={congressDockets}
                onCreate={handleCreateBill}
            />

             <Dialog open={!!billForSpeechWriting} onOpenChange={(open) => { if (!open) setBillForSpeechWriting(null)}}>
                <DialogContent className="max-w-7xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{billForSpeechWriting?.title}</DialogTitle>
                        <DialogDescription>Write or edit your speeches for this legislation.</DialogDescription>
                    </DialogHeader>
                    <div className="grid md:grid-cols-3 gap-6 h-full overflow-hidden py-4">
                        <div className="md:col-span-1 h-full flex flex-col">
                           <Card className="flex-grow flex flex-col">
                                <CardHeader>
                                    <CardTitle>Bill Text</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ScrollArea className="h-full max-h-[calc(80vh-120px)]">
                                        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans pr-4">
                                            {billForSpeechWriting?.fullText}
                                        </pre>
                                    </ScrollArea>
                                </CardContent>
                           </Card>
                        </div>
                         <div className="md:col-span-1 h-full flex flex-col">
                            <Card className="flex-grow flex flex-col">
                                <CardHeader>
                                    <CardTitle>Speech Editor</CardTitle>
                                    <ToggleGroup type="single" value={speechStance} onValueChange={(value) => {if (value) setSpeechStance(value as SpeechStance)}} className="pt-2">
                                        <ToggleGroupItem value="affirmative">Affirmative</ToggleGroupItem>
                                        <ToggleGroupItem value="negative">Negative</ToggleGroupItem>
                                    </ToggleGroup>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <Textarea 
                                        placeholder="Write your speech here..."
                                        className="h-full resize-none text-base"
                                        value={speechContent}
                                        onChange={(e) => setSpeechContent(e.target.value)}
                                        readOnly={!!activeSpeech && activeSpeech.ownerId !== user?.id}
                                    />
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    {activeSpeech && activeSpeech.ownerId === user?.id && (
                                        <Button variant="destructive" onClick={() => handleDeleteWrittenSpeech(activeSpeech.id)}>Delete</Button>
                                    )}
                                    {(!activeSpeech || activeSpeech.ownerId === user?.id) && (
                                        <Button onClick={handleSaveWrittenSpeech}><Save className="mr-2" />Save Speech</Button>
                                    )}
                                </CardFooter>
                            </Card>
                        </div>
                        <div className="md:col-span-1 h-full flex flex-col gap-4">
                           <Card className="flex-1 flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>My Speeches</CardTitle>
                                        <Button size="sm" variant="outline" onClick={handleNewSpeech}><PlusCircle className="mr-2" /> New</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ScrollArea className="h-full max-h-[calc(40vh-90px)]">
                                        {billSpeeches.length > 0 && allUsers ? (
                                            <div className="space-y-2 pr-4">
                                                {billSpeeches.map(speech => {
                                                    const owner = allUsers.find(u => u.id === speech.ownerId);
                                                    const isOwner = user?.id === speech.ownerId;
                                                    const sharedUsers = speech.sharedWith?.map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
                                                    return (
                                                        <Card 
                                                            key={speech.id} 
                                                            className={cn(
                                                                "cursor-pointer hover:bg-muted/50",
                                                                activeSpeech?.id === speech.id && "border-primary"
                                                            )}
                                                            onClick={() => setActiveSpeech(speech)}
                                                        >
                                                            <CardContent className="p-3">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex-1 space-y-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant={speech.stance === 'affirmative' ? 'default' : 'destructive'} className="capitalize">{speech.stance}</Badge>
                                                                            {isOwner && (
                                                                                <TooltipProvider>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleStartPracticeSession(speech)}}><Mic className="h-4 w-4"/></Button>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent><p>Practice Speech</p></TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground line-clamp-2">{speech.content || "Empty speech"}</p>
                                                                        {!isOwner && owner && (
                                                                            <p className="text-xs text-muted-foreground mt-1">Shared by {owner.name}</p>
                                                                        )}
                                                                         {isOwner && sharedUsers && sharedUsers.length > 0 && (
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-xs text-muted-foreground">Shared with:</p>
                                                                                <div className="flex -space-x-2">
                                                                                    <TooltipProvider>
                                                                                    {sharedUsers.map(su => (
                                                                                        <Tooltip key={su.id}>
                                                                                            <TooltipTrigger asChild>
                                                                                                <Avatar className="h-5 w-5 border-2 border-background">
                                                                                                    <AvatarFallback className={cn(getRoleBasedColor(su.role))}>
                                                                                                        {su.name.split(" ").map(n => n[0]).join("")}
                                                                                                    </AvatarFallback>
                                                                                                </Avatar>
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent><p>{su.name}</p></TooltipContent>
                                                                                        </Tooltip>
                                                                                    ))}
                                                                                    </TooltipProvider>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {isOwner && (
                                                                         <div className="flex flex-col gap-1">
                                                                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); openShareDialog(speech);}}><Share className="h-4 w-4"/></Button>
                                                                            <AlertDialog>
                                                                                <AlertDialogTrigger asChild>
                                                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button>
                                                                                </AlertDialogTrigger>
                                                                                <AlertDialogContent>
                                                                                    <AlertDialogHeader>
                                                                                        <AlertDialogTitle>Delete this speech?</AlertDialogTitle>
                                                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                                                    </AlertDialogHeader>
                                                                                    <AlertDialogFooter>
                                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                        <AlertDialogAction onClick={() => handleDeleteWrittenSpeech(speech.id)}>Delete</AlertDialogAction>
                                                                                    </AlertDialogFooter>
                                                                                </AlertDialogContent>
                                                                            </AlertDialog>
                                                                         </div>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center pt-8">No speeches written for this bill yet.</p>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                             <Card className="flex-1 flex flex-col">
                                <CardHeader><CardTitle>Practice Recordings</CardTitle></CardHeader>
                                <CardContent className="flex-grow">
                                    <ScrollArea className="h-full max-h-[calc(40vh-90px)]">
                                    {associatedRecordings.length > 0 ? (
                                        <ul className="space-y-2 pr-4">
                                            {associatedRecordings.map(rec => (
                                                <li key={rec.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium">Recorded on {format(new Date(rec.date), 'PPP')}</p>
                                                        <p className="text-xs text-muted-foreground">Duration: {formatTime(rec.speechTime)}</p>
                                                    </div>
                                                    <Button size="sm" variant="secondary" onClick={() => { setBillForSpeechWriting(null); handleViewArchivedSpeech(rec); }}>View</Button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-md h-full flex items-center justify-center">
                                            <p>No recordings for this bill yet.</p>
                                        </div>
                                    )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isPracticeSessionOpen} onOpenChange={(open) => !open && resetPractice()}>
                <DialogContent className="max-w-7xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">
                           {viewingSpeech ? "Saved Speech" : "Practice Session"}
                        </DialogTitle>
                        {selectedTopic && <DialogDescription>{selectedTopic.text}</DialogDescription>}
                    </DialogHeader>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                        <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2">
                            <Card>
                                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Speech</CardTitle>
                                        <CardDescription>
                                            {viewingSpeech && allUsers ? `Recorded by ${allUsers.find(u => u.id === viewingSpeech.ownerId)?.name || 'Unknown'}` : 'Record your speech for review.'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {!viewingSpeech && hasCameraPermission && (
                                            <div className="flex items-center space-x-2">
                                                <Switch id="camera-toggle" checked={isCameraOn} onCheckedChange={setIsCameraOn} />
                                                <Label htmlFor="camera-toggle">Camera</Label>
                                            </div>
                                        )}
                                        {!viewingSpeech && hasCameraPermission && videoDevices.length > 1 && (
                                            <Select value={selectedVideoDeviceId} onValueChange={(deviceId) => {
                                                setSelectedVideoDeviceId(deviceId);
                                                localStorage.setItem('selectedVideoDeviceId', deviceId);
                                            }}>
                                                <SelectTrigger className="w-full md:w-[250px]">
                                                    <VideoIcon className="mr-2 h-4 w-4" />
                                                    <SelectValue placeholder="Select a camera" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {videoDevices.map(device => (
                                                        <SelectItem key={device.deviceId} value={device.deviceId}>{device.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <div className="flex gap-2">
                                            {isRecording ? (
                                                <Button variant="destructive" onClick={stopRecording}>
                                                    <StopCircle className="mr-2"/> Stop
                                                </Button>
                                            ) : (
                                                <>
                                                    {videoUrl && !viewingSpeech ? (
                                                        <div className="flex gap-2">
                                                            <Button variant="outline" onClick={handleRestartRecording}><Repeat className="mr-2"/> Restart</Button>
                                                            <Button variant="destructive" onClick={handleDeleteCurrentSpeech}>
                                                                <Trash2 className="mr-2"/> Delete
                                                            </Button>
                                                            <Button onClick={handleSaveRecordedSpeech} disabled={isSaving}>
                                                                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2"/>}
                                                                {isSaving ? 'Saving...' : 'Save Recording'}
                                                            </Button>
                                                        </div>
                                                    ) : !viewingSpeech && (
                                                        <Button 
                                                            onClick={initiateRecordingProcess} 
                                                            disabled={!selectedTopic || !hasCameraPermission || !isCameraOn || !!viewingSpeech || countdown !== null}
                                                        >
                                                            {countdown !== null ? <Loader2 className="mr-2 animate-spin" /> : <Video className="mr-2" />}
                                                            {countdown !== null ? "Starting..." : "Record Speech"}
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                <div className="aspect-video w-full bg-black rounded-md flex items-center justify-center relative">
                                    <video ref={videoRef} src={videoUrl ?? undefined} className={cn("w-full h-full rounded-md object-cover", (!isCameraOn || viewingSpeech) && !videoUrl && 'hidden')} autoPlay={!videoUrl} playsInline controls={!!videoUrl} muted={!videoUrl || isRecording} />
                                    {countdown !== null && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                                            <span className="text-9xl font-bold text-white font-mono">{countdown}</span>
                                        </div>
                                    )}
                                    {!hasCameraPermission && !viewingSpeech && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
                                            <Alert variant="destructive" className="max-w-sm">
                                                <AlertTitle>Camera Access Required</AlertTitle>
                                                <AlertDescription>Please allow camera access in your browser to use this feature.</AlertDescription>
                                            </Alert>
                                        </div>
                                    )}
                                     {!isCameraOn && !videoUrl && !viewingSpeech && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                                            <CameraOff className="h-12 w-12 mb-2" />
                                            <p>Camera is off</p>
                                        </div>
                                    )}
                                </div>
                                </CardContent>
                            </Card>
                        
                           <Accordion type="multiple" className="w-full space-y-4" defaultValue={['bill-text']}>
                                {viewingSpeechBill && (
                                    <AccordionItem value="bill-text">
                                        <AccordionTrigger className="text-base font-medium bg-muted px-4 rounded-t-md">Bill Text</AccordionTrigger>
                                        <AccordionContent className="p-4 border border-t-0 rounded-b-md">
                                            <ScrollArea className="h-48">
                                                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans pr-4">{viewingSpeechBill.fullText}</pre>
                                            </ScrollArea>
                                        </AccordionContent>
                                    </AccordionItem>
                                )}
                                <AccordionItem value="feedback">
                                    <AccordionTrigger className="text-base font-medium bg-muted px-4 rounded-t-md">Feedback</AccordionTrigger>
                                    <AccordionContent className="p-4 border border-t-0 rounded-b-md">
                                        <div className="space-y-4">
                                            <ScrollArea className="h-48 pr-4">
                                                 <div className="space-y-4">
                                                   <p className="text-sm text-muted-foreground text-center pt-8">Feedback functionality is not yet available.</p>
                                                </div>
                                            </ScrollArea>
                                            {viewingSpeech && viewingSpeech.ownerId !== user?.id && (
                                                 <div className="space-y-2">
                                                    <Textarea value={newFeedback} onChange={e => setNewFeedback(e.target.value)} placeholder="Add your feedback..."/>
                                                    <Button onClick={handleAddFeedback} disabled={!newFeedback.trim()}>Submit Feedback</Button>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>

                        <ScrollArea className="lg:col-span-1 h-full">
                            <div className="space-y-6 pr-2">
                                {viewingSpeech ? (
                                    <>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Performance Stats</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 text-sm">
                                                <div className="flex items-center">
                                                    <p className="w-24 text-muted-foreground">Speech Time</p>
                                                    <p className="font-medium">{formatTime(viewingSpeech.speechTime)}</p>
                                                </div>
                                                <div className="flex items-center">
                                                    <p className="w-24 text-muted-foreground">Recorded</p>
                                                     <p className="font-medium">{format(new Date(viewingSpeech.date), 'PPP')}</p>
                                                </div>
                                            </CardContent>
                                             {user?.id === viewingSpeech.ownerId && (
                                                <CardFooter className="p-4 border-t grid grid-cols-2 gap-2">
                                                    <Button variant="outline" className="w-full" onClick={() => openShareDialog(viewingSpeech)}>
                                                        <Share className="mr-2"/> Share
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" className="w-full">
                                                                <Trash2 className="mr-2"/> Delete
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete this speech.
                                                            </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteSpeech(viewingSpeech.id, 'recorded')}>
                                                                Delete
                                                            </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </CardFooter>
                                            )}
                                        </Card>
                                         {viewingSpeech.sharedWith && viewingSpeech.sharedWith.length > 0 && allUsers && (
                                            <Card>
                                                <CardHeader><CardTitle className="text-base">Shared With</CardTitle></CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        {viewingSpeech.sharedWith.map(userId => {
                                                            const sharedUser = allUsers.find(u => u.id === userId);
                                                            if (!sharedUser) return null;
                                                            return (
                                                                <div key={userId} className="flex items-center gap-2 text-sm">
                                                                    <Avatar className="h-6 w-6"><AvatarFallback className={cn(getRoleBasedColor(sharedUser.role))}>{sharedUser.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                                                                    <span>{sharedUser.name}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </>
                                ) : (
                                    <>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Speech Timer</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-col items-center gap-4">
                                            <div className={cn("text-6xl font-bold font-mono tabular-nums", getTimerClass(speechTimerFlashState))}>
                                                {speechTimerFlashState === 'expired' && speechTimerDirection === 'down' ? "STOP" : formatTime(speechTime)}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" onClick={speechTimerActive ? pauseSpeechTimer : startSpeechTimer} disabled={!!viewingSpeech}>
                                                    {speechTimerActive ? <Pause /> : <Play />}
                                                </Button>
                                                <Button size="icon" variant="outline" onClick={toggleSpeechTimerDirection} disabled={speechTimerActive || !!viewingSpeech} title={`Switch to count ${speechTimerDirection === 'down' ? 'up' : 'down'}`}>
                                                    {speechTimerDirection === 'down' ? <ArrowUp /> : <ArrowDown />}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle>Speech Text</CardTitle></CardHeader>
                                        <CardContent>
                                            <ScrollArea className="h-48">
                                                 <p className="text-sm text-muted-foreground whitespace-pre-wrap pr-4">{currentSpeechContent || "No speech content loaded."}</p>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

             <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Speech</DialogTitle>
                        <DialogDescription>Select users to share this speech with.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                         <MultiSelect
                            options={(allUsers || []).filter(u => u.id !== user?.id).map(u => ({ label: u.name, value: u.id }))}
                            value={usersToShareWith}
                            onValueChange={setUsersToShareWith}
                            placeholder="Select users..."
                            maxCount={10}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleConfirmShare}>Save Sharing</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


function CreateBillDialog({ isOpen, onOpenChange, dockets, onCreate }: { isOpen: boolean, onOpenChange: (open: boolean) => void, dockets: CongressDocket[], onCreate: (title: string, fullText: string, docketId: string) => void }) {
    const [title, setTitle] = React.useState('');
    const [fullText, setFullText] = React.useState('');
    const [docketId, setDocketId] = React.useState<string | undefined>(undefined);
    const { toast } = useToast();

    const handleSubmit = () => {
        if (!title.trim() || !fullText.trim() || !docketId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill out all fields.' });
            return;
        }
        onCreate(title, fullText, docketId);
        setTitle('');
        setFullText('');
        setDocketId(undefined);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Bill</DialogTitle>
                    <DialogDescription>Add a new bill or resolution to an existing docket.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="bill-title">Title</Label>
                        <Input id="bill-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A Bill to..." />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="bill-text">Full Text</Label>
                        <Textarea id="bill-text" value={fullText} onChange={(e) => setFullText(e.target.value)} placeholder="BE IT ENACTED..." className="h-48 resize-none" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="docket-select">Docket</Label>
                         <Select value={docketId} onValueChange={setDocketId}>
                            <SelectTrigger id="docket-select">
                                <SelectValue placeholder="Select a docket to add this bill to..." />
                            </SelectTrigger>
                            <SelectContent>
                                {dockets.map(docket => (
                                    <SelectItem key={docket.id} value={docket.id}>{docket.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit}>Create Bill</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function UploadDocketDialog({ onUpload }: { onUpload: (docket: CongressDocket) => void }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [docketName, setDocketName] = React.useState('');
    const [fileName, setFileName] = React.useState('');
    const [fileDataUri, setFileDataUri] = React.useState('');
    const [isParsing, setIsParsing] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a PDF file.' });
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUri = e.target?.result as string;
            setFileDataUri(dataUri);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!docketName.trim()) {
            toast({ variant: 'destructive', title: 'Docket Name Required', description: 'Please provide a name for the docket.' });
            return;
        }
        if (!fileDataUri) {
            toast({ variant: 'destructive', title: 'PDF File Required', description: 'Please select a PDF file to upload.' });
            return;
        }

        setIsParsing(true);
        try {
            const extractedBills = await extractBillsFromPdf({ docketName, pdfDataUri: fileDataUri });
            
            const newDocket: CongressDocket = {
                id: `docket-${Date.now()}`,
                name: docketName,
                items: extractedBills,
            };
            onUpload(newDocket);
            setIsOpen(false);
        } catch (error) {
            console.error("AI Parsing Error:", error);
            toast({
                variant: 'destructive',
                title: 'AI Parsing Failed',
                description: (error as Error).message || "Could not extract bills from the PDF. Please check the PDF format.",
            });
        } finally {
            setIsParsing(false);
        }
    };

    React.useEffect(() => {
        if (!isOpen) {
            setDocketName('');
            setFileName('');
            setFileDataUri('');
            setIsParsing(false);
             if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Upload className="mr-2" /> Upload Docket</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Docket via PDF</DialogTitle>
                    <DialogDescription>Use AI to parse bills from a PDF file. Name the docket and select your file.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="docket-name">New Docket Name</Label>
                        <Input id="docket-name" value={docketName} onChange={(e) => setDocketName(e.target.value)} placeholder="e.g., TFA State 2026" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pdf-upload">PDF File</Label>
                        <Input id="pdf-upload" type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="file:text-foreground"/>
                        {fileName && <p className="text-sm text-muted-foreground">Selected: {fileName}</p>}
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isParsing}>Cancel</Button></DialogClose>
                    <Button onClick={handleUpload} disabled={isParsing}>
                        {isParsing ? <><Loader2 className="mr-2 animate-spin" /> Parsing...</> : <>Upload & Parse</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


    