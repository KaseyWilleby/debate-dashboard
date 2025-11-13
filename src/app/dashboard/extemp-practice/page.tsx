
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, RefreshCw, Loader2, Video, StopCircle, Save, ChevronsRight, Trash2, VideoIcon, Repeat, Camera, CameraOff, ArrowUp, ArrowDown, Share, FilePenLine, Minus, Plus } from "lucide-react";
import { cn, getRoleBasedColor, formatTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { generatePracticeTopics, type GeneratePracticeTopicsInput } from "@/ai/flows/generate-practice-topics-flow";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { SavedSpeech, User, PracticeMode, WrittenSpeech } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { MultiSelect } from "@/components/ui/multi-select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WriteSpeechDialog } from "@/components/dashboard/write-speech-dialog";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

type Topic = { id: string; text: string };
type TimerDirection = "up" | "down";
type TimerFlashState = 'none' | 'yellow' | 'red' | 'expired';
type ExtempCategory = "domestic" | "foreign";

const WRITTEN_SPEECHES_STORAGE_KEY = 'work-session-written-speeches';
const SAVED_SPEECHES_STORAGE_KEY = 'work-session-saved-speeches';


const SavedScripts = ({ eventType, writtenSpeeches, setSpeechToEdit, setIsWritingDialogOpen, setScriptToPractice, handleDeleteWrittenSpeech, user }: { 
    eventType: 'informative' | 'oratory', 
    writtenSpeeches: WrittenSpeech[], 
    setSpeechToEdit: (speech: WrittenSpeech | null) => void,
    setIsWritingDialogOpen: (open: boolean) => void,
    setScriptToPractice: (script: WrittenSpeech | null) => void,
    handleDeleteWrittenSpeech: (id: string) => void,
    user: User | null
}) => {
    
    const relevantSpeeches = React.useMemo(() => {
        if (!user) return [];
        return writtenSpeeches.filter(s => s.mode === eventType)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [writtenSpeeches, user, eventType]);
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                         <CardTitle>Saved Scripts</CardTitle>
                         <CardDescription>
                            View, edit, and manage your written speeches.
                         </CardDescription>
                    </div>
                     <Button variant="outline" size="sm" onClick={() => { setSpeechToEdit(null); setIsWritingDialogOpen(true); }}>
                         <FilePenLine className="mr-2 h-4 w-4" />
                         New Script
                     </Button>
                </div>
            </CardHeader>
            <CardContent>
                 {relevantSpeeches.length > 0 ? (
                    <ul className="space-y-2">
                        {relevantSpeeches.map(speech => (
                            <li 
                                key={speech.id} 
                                className="flex items-center justify-between p-3 rounded-md border bg-muted/50"
                            >
                                <div className="flex-1 min-w-0 cursor-pointer hover:bg-muted" onClick={() => { setSpeechToEdit(speech); setIsWritingDialogOpen(true); }}>
                                    <p className="text-sm font-medium truncate">{speech.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{speech.body}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                                    <Button onClick={() => setScriptToPractice(speech)} variant="default" size="sm">Practice</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Script?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete "{speech.title}". This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteWrittenSpeech(speech.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                        No scripts saved for this event type.
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default function ExtempPracticePage() {
    const { toast } = useToast();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { firestore } = useFirebase();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'users');
    }, [firestore, user]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

    const [mode, setMode] = React.useState<PracticeMode>("extemp");
    const [isLoadingTopics, setIsLoadingTopics] = React.useState(false);
    const [topics, setTopics] = React.useState<Topic[]>([]);
    const [extempCategory, setExtempCategory] = React.useState<ExtempCategory>('domestic');
    
    // Practice Session State
    const [isPracticeSessionOpen, setIsPracticeSessionOpen] = React.useState(false);
    const [topicToConfirm, setTopicToConfirm] = React.useState<Topic | null>(null);
    const [selectedTopic, setSelectedTopic] = React.useState<Topic | null>(null);
    const [notes, setNotes] = React.useState("");
    const [scriptContent, setScriptContent] = React.useState("");

    // Timers
    const [prepTime, setPrepTime] = React.useState(30 * 60);
    const [initialSpeechTime, setInitialSpeechTime] = React.useState(7.5 * 60);
    const [speechTime, setSpeechTime] = React.useState(initialSpeechTime);

    const [prepTimerActive, setPrepTimerActive] = React.useState(false);
    const [speechTimerActive, setSpeechTimerActive] = React.useState(false);
    const [speechTimerDirection, setSpeechTimerDirection] = React.useState<TimerDirection>('down');
    
    const [speechTimerFlashState, setSpeechTimerFlashState] = React.useState<TimerFlashState>('none');
    
    const prepTimeIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
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

    // Share state
    const [isShareDialogOpen, setIsShareDialogOpen] = React.useState(false);
    const [speechToShare, setSpeechToShare] = React.useState<SavedSpeech | null>(null);
    const [usersToShareWith, setUsersToShareWith] = React.useState<string[]>([]);
    
    // Written speeches states
    const [isWritingDialogOpen, setIsWritingDialogOpen] = React.useState(false);
    const [speechToEdit, setSpeechToEdit] = React.useState<WrittenSpeech | null>(null);
    const [scriptToPractice, setScriptToPractice] = React.useState<WrittenSpeech | null>(null);

    const [writtenSpeeches, setWrittenSpeeches] = React.useState<WrittenSpeech[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(WRITTEN_SPEECHES_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    });
    
    const [savedRecordings, setSavedRecordings] = React.useState<SavedSpeech[]>(() => {
      if (typeof window === 'undefined') return [];
      try {
        const stored = localStorage.getItem(SAVED_SPEECHES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    });

    // Teleprompter states
    const [isTeleprompterActive, setIsTeleprompterActive] = React.useState(false);
    const [scrollSpeed, setScrollSpeed] = React.useState(5);
    const teleprompterRef = React.useRef<HTMLDivElement>(null);
    
    const isLoading = isAuthLoading || areUsersLoading;

    React.useEffect(() => {
        let animationFrameId: number;

        const scroll = () => {
            if (teleprompterRef.current && isTeleprompterActive) {
                const viewport = teleprompterRef.current.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) {
                    viewport.scrollTop += scrollSpeed / 40;
                }
            }
            animationFrameId = requestAnimationFrame(scroll);
        };

        if (isTeleprompterActive) {
            animationFrameId = requestAnimationFrame(scroll);
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isTeleprompterActive, scrollSpeed]);

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
    
    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SAVED_SPEECHES_STORAGE_KEY, JSON.stringify(savedRecordings));
      }
    }, [savedRecordings]);


    const [viewingSpeech, setViewingSpeech] = React.useState<SavedSpeech | null>(null);

    const visibleRecordings = React.useMemo(() => {
      if (!user) return [];
      return savedRecordings.filter((s: SavedSpeech) => s.mode === mode && s.ownerId === user.id)
          .sort((a: SavedSpeech,b: SavedSpeech) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [user, mode, savedRecordings]);

    const sharedRecordings = React.useMemo(() => {
      if (!user) return [];
      return savedRecordings.filter((s: SavedSpeech) =>
        s.mode === mode &&
        s.ownerId !== user.id &&
        s.sharedWith?.includes(user.id)
      ).sort((a: SavedSpeech,b: SavedSpeech) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [user, mode, savedRecordings]);
    
    const visibleWrittenSpeeches = React.useMemo(() => {
        if (!user) return [];
        return writtenSpeeches.filter(s => s.mode === mode)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [writtenSpeeches, user, mode]);
    
    const associatedRecordings = React.useMemo(() => {
        if (!speechToEdit || !savedRecordings) return [];
        return savedRecordings.filter(s => s.topic === speechToEdit.title && s.mode === speechToEdit.mode)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [speechToEdit, savedRecordings]);


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
            if (prepTimeIntervalRef.current) clearInterval(prepTimeIntervalRef.current);
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
        setIsTeleprompterActive(false);
    }, []);

    React.useEffect(() => {
        if (speechTimerDirection === 'down') {
            if (speechTime <= 0 && speechTimerActive) {
                if (speechTimeIntervalRef.current) clearInterval(speechTimeIntervalRef.current);
                setSpeechTimerActive(false);
                setSpeechTimerFlashState('expired');
                stopRecording();
            } else if (speechTime <= 30) {
                setSpeechTimerFlashState('red');
            } else if (speechTime <= 60) {
                setSpeechTimerFlashState('yellow');
            } else {
                setSpeechTimerFlashState('none');
            }
        } else {
            setSpeechTimerFlashState('none');
        }
    }, [speechTime, speechTimerActive, stopRecording, speechTimerDirection]);

    const handleModeChange = (newMode: string) => {
        if (newMode === mode) return;
        setMode(newMode as PracticeMode);
        resetPractice(); // Reset everything when mode changes
    };

    const handleGenerateTopics = async () => {
        setIsLoadingTopics(true);
        setTopics([]);
        try {
            const input: GeneratePracticeTopicsInput = { 
                type: mode as "extemp" | "impromptu",
            };
            if (mode === 'extemp') {
                input.extempCategory = extempCategory;
            }
            const result = await generatePracticeTopics(input);
            setTopics(result.topics.map((text, id) => ({ id: id.toString(), text })));
        } catch (error) {
            console.error("Failed to generate topics:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not generate topics. Please try again.",
            });
        } finally {
            setIsLoadingTopics(false);
        }
    };
    
    const handleConfirmTopic = () => {
        if (!topicToConfirm) return;
        resetPractice();
        setIsPracticeSessionOpen(true);
        setSelectedTopic(topicToConfirm);
        setTopicToConfirm(null);
    };

    const handleConfirmPractice = () => {
        if (!scriptToPractice) return;
        resetPractice();
        setIsPracticeSessionOpen(true);
        setSelectedTopic({ id: scriptToPractice.id, text: scriptToPractice.title });
        setScriptContent(scriptToPractice.body);
        setScriptToPractice(null);
    };

    const resetPractice = React.useCallback(() => {
        setViewingSpeech(null);
        setSelectedTopic(null);
        setNotes("");
        setScriptContent("");
        
        setVideoUrl(null);
        recordedChunksRef.current = [];
        
        if (isRecording) {
            stopRecording();
        }
        setIsRecording(false);
        
        setPrepTimerActive(false);
        setSpeechTimerActive(false);
        if (prepTimeIntervalRef.current) clearInterval(prepTimeIntervalRef.current);
        if (speechTimeIntervalRef.current) clearInterval(speechTimeIntervalRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setCountdown(null);

        let newInitialSpeech;
        let newInitialPrep = 30 * 60;
        switch (mode) {
            case 'impromptu':
                newInitialSpeech = 5.5 * 60;
                newInitialPrep = 2 * 60;
                break;
            case 'informative':
            case 'oratory':
                newInitialSpeech = 10.5 * 60;
                break;
            case 'extemp':
            default:
                newInitialSpeech = 7.5 * 60;
                newInitialPrep = 30 * 60;
                break;
        }
       
        setInitialSpeechTime(newInitialSpeech);
        setSpeechTime(newInitialSpeech);
        setPrepTime(newInitialPrep);
        
        setIsCameraOn(false);
        setSpeechTimerDirection('down');
        setSpeechTimerFlashState('none');
        stopStream();
        
        setIsTeleprompterActive(false);
        if (teleprompterRef.current) {
            const viewport = teleprompterRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTop = 0;
        }

    }, [isRecording, stopRecording, mode, stopStream]);

    // Timer controls
    const startPrepTimer = () => {
        if(prepTime <= 0) return;
        setPrepTimerActive(true);
        prepTimeIntervalRef.current = setInterval(() => {
            setPrepTime(prev => {
                if (prev <= 1) {
                    if (prepTimeIntervalRef.current) clearInterval(prepTimeIntervalRef.current);
                    setPrepTimerActive(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const pausePrepTimer = () => {
        setPrepTimerActive(false);
        if (prepTimeIntervalRef.current) clearInterval(prepTimeIntervalRef.current);
    };

    const startSpeechTimer = () => {
        if (speechTimerDirection === 'down' && speechTime <= 0) return;
        setSpeechTimerActive(true);
        speechTimeIntervalRef.current = setInterval(() => {
            setSpeechTime(prev => speechTimerDirection === 'down' ? prev - 1 : prev + 1);
        }, 1000);

        if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
        }
        if (scriptContent && (mode === 'informative' || mode === 'oratory')) {
            setIsTeleprompterActive(true);
        }
    };

    const pauseSpeechTimer = () => {
        setSpeechTimerActive(false);
        if (speechTimeIntervalRef.current) clearInterval(speechTimeIntervalRef.current);

        if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
        }
        setIsTeleprompterActive(false);
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
            setIsTeleprompterActive(false);
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

        if (prepTimerActive) pausePrepTimer();
        if (speechTimerActive) pauseSpeechTimer();

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
        
        if (teleprompterRef.current) {
            const viewport = teleprompterRef.current.querySelector('div[data-radix-scroll-area-viewport]');
            if (viewport) viewport.scrollTop = 0;
        }

        setSpeechTime(speechTimerDirection === 'down' ? initialSpeechTime : 0);
        if (speechTimeIntervalRef.current) {
            clearInterval(speechTimeIntervalRef.current);
        }
        restoreCameraStream(selectedVideoDeviceId);
        initiateRecordingProcess();
    };

    const handleSaveSpeech = async () => {
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
                notes,
                prepTime: prepTime,
                speechTime: speechTimerDirection === 'down' ? initialSpeechTime - speechTime : speechTime,
                mode,
                videoUrl: URL.createObjectURL(blob),
                date: new Date().toISOString(),
                sharedWith: [],
            };

            setSavedRecordings(prev => [...prev, newSavedSpeech]);

            toast({ title: 'Recording Saved!', description: 'Your practice session has been archived.' });
            setIsPracticeSessionOpen(false);
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
        setIsPracticeSessionOpen(true);
        
        setViewingSpeech(speech);
        setSelectedTopic({ id: speech.id, text: speech.topic });
        setNotes(speech.notes);
        setMode(speech.mode);
        setVideoUrl(speech.videoUrl);
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
    
    const handleDeleteSpeech = async (speech: SavedSpeech) => {
        setSavedRecordings(prev => prev.filter(s => s.id !== speech.id));
        toast({ title: 'Speech Deleted', variant: 'destructive'});
        if (viewingSpeech && viewingSpeech.id === speech.id) {
            setIsPracticeSessionOpen(false);
        }
    };

    const handleSaveWrittenSpeech = (title: string, body: string) => {
        if (!user) return;

        if (speechToEdit) {
            // Update
            const updatedSpeech: WrittenSpeech = { ...speechToEdit, title, body, date: new Date().toISOString() };
            setWrittenSpeeches(prev => prev.map(s => s.id === speechToEdit.id ? updatedSpeech : s));
            toast({ title: "Script Updated" });
        } else {
            // Create
            const newSpeech: WrittenSpeech = {
                id: `written-${Date.now()}`,
                ownerId: user.id,
                title,
                body,
                mode: mode,
                date: new Date().toISOString(),
            };
            setWrittenSpeeches(prev => [newSpeech, ...prev]);
            toast({ title: "Script Saved" });
        }
        setIsWritingDialogOpen(false);
        setSpeechToEdit(null);
    };

    const handleDeleteWrittenSpeech = (id: string) => {
        setWrittenSpeeches(prev => prev.filter(s => s.id !== id));
        toast({ title: "Script Deleted", variant: 'destructive' });
    };

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

    const openShareDialog = (speech: SavedSpeech) => {
        setSpeechToShare(speech);
        setUsersToShareWith(speech.sharedWith || []);
        setIsShareDialogOpen(true);
    };

    const handleConfirmShare = async () => {
        if (!speechToShare) return;
        
        const updatedSpeech = { ...speechToShare, sharedWith: usersToShareWith };
        
        setSavedRecordings(prev => prev.map(s => s.id === updatedSpeech.id ? updatedSpeech : s));
        if (viewingSpeech?.id === updatedSpeech.id) {
            setViewingSpeech(updatedSpeech);
        }

        toast({ title: 'Sharing Updated' });
        setIsShareDialogOpen(false);
        setSpeechToShare(null);
    }

    const renderTopicCard = (topic: Topic) => (
        <Card 
            key={topic.id}
            className="cursor-pointer transition-all hover:bg-primary/10"
            onClick={() => setTopicToConfirm(topic)}
        >
            <CardContent className="p-4 text-center">
                <p className="font-medium">{topic.text}</p>
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

    const eventNameMap: Record<PracticeMode, string> = {
        'extemp': 'Extemporaneous',
        'impromptu': 'Impromptu',
        'informative': 'Informative',
        'oratory': 'Oratory',
        'congress': 'Congress',
        'humorous': 'Humorous Interpretation',
        'dramatic': 'Dramatic Interpretation',
        'duo': 'Duo Interpretation',
        'duet': 'Duet Acting',
        'prose': 'Prose',
        'poetry': 'Poetry',
    };

    const isScriptedEvent = mode === 'informative' || mode === 'oratory';
    
    if (isLoading) {
      return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Speech Events</h1>
                    <p className="text-muted-foreground">Hone your speaking skills with timed practice sessions.</p>
                </div>
            </div>

            <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="extemp">Extemporaneous</TabsTrigger>
                    <TabsTrigger value="impromptu">Impromptu</TabsTrigger>
                    <TabsTrigger value="informative">Informative</TabsTrigger>
                    <TabsTrigger value="oratory">Oratory</TabsTrigger>
                </TabsList>
                <TabsContent value="extemp" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                             <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle>Topic Generator</CardTitle>
                                    <CardDescription>
                                        Generate three current event questions. Choose one to start your 30-minute prep time.
                                    </CardDescription>
                                </div>
                                <ToggleGroup type="single" value={extempCategory} onValueChange={(value: ExtempCategory) => value && setExtempCategory(value)} size="sm">
                                    <ToggleGroupItem value="domestic">Domestic</ToggleGroupItem>
                                    <ToggleGroupItem value="foreign">Foreign</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Button onClick={handleGenerateTopics} className="w-full" disabled={isLoadingTopics}>
                                    {isLoadingTopics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Generate Topics
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleGenerateTopics} disabled={isLoadingTopics}><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                            
                            {topics.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {topics.map(renderTopicCard)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="impromptu" className="space-y-6 mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Topic Generator</CardTitle>
                            <CardDescription>
                                Generate three prompts. Choose one to start your 2-minute prep time.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Button onClick={handleGenerateTopics} className="w-full" disabled={isLoadingTopics}>
                                    {isLoadingTopics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Generate Topics
                                </Button>
                                <Button variant="outline" size="icon" onClick={handleGenerateTopics} disabled={isLoadingTopics}><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                            
                            {topics.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {topics.map(renderTopicCard)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="informative" className="space-y-6 mt-4">
                    <SavedScripts 
                        eventType="informative" 
                        writtenSpeeches={visibleWrittenSpeeches} 
                        setSpeechToEdit={setSpeechToEdit} 
                        setIsWritingDialogOpen={setIsWritingDialogOpen} 
                        setScriptToPractice={setScriptToPractice}
                        handleDeleteWrittenSpeech={handleDeleteWrittenSpeech}
                        user={user}
                    />
                </TabsContent>
                <TabsContent value="oratory" className="space-y-6 mt-4">
                    <SavedScripts 
                        eventType="oratory" 
                        writtenSpeeches={visibleWrittenSpeeches}
                        setSpeechToEdit={setSpeechToEdit}
                        setIsWritingDialogOpen={setIsWritingDialogOpen}
                        setScriptToPractice={setScriptToPractice}
                        handleDeleteWrittenSpeech={handleDeleteWrittenSpeech}
                        user={user}
                    />
                </TabsContent>
            </Tabs>
            
            <Card>
                <CardHeader>
                    <CardTitle>Saved Recordings</CardTitle>
                    <CardDescription>Your recorded speeches for the selected event type.</CardDescription>
                </CardHeader>
                <CardContent>
                {visibleRecordings.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {visibleRecordings.map(speech => {
                             const owner = allUsers?.find(u => u.id === speech.ownerId);
                             const isOwner = user?.id === speech.ownerId;
                             const sharedUsers = speech.sharedWith?.map(id => allUsers?.find(u => u.id === id)).filter(Boolean) as User[] | undefined;
                            return (
                                <AccordionItem value={speech.id} key={speech.id}>
                                    <AccordionTrigger className="text-sm text-left">
                                         <div className="flex-1 flex flex-col items-start gap-2">
                                            <p>{speech.topic}</p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="capitalize text-xs">{speech.mode}</Badge>
                                                {!isOwner && owner && (
                                                    <p className="text-xs text-muted-foreground">Shared by {owner.name}</p>
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
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <p className="text-xs text-muted-foreground mb-2">{format(new Date(speech.date), 'PPP')}</p>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="secondary" className="flex-1" onClick={() => handleViewArchivedSpeech(speech)}>
                                                <ChevronsRight className="mr-2 h-4 w-4"/> View
                                            </Button>
                                             {isOwner && (
                                                <>
                                                    {allUsers && (
                                                        <Button size="sm" variant="outline" onClick={() => openShareDialog(speech)}>
                                                            <Share className="mr-2 h-4 w-4"/> Share
                                                        </Button>
                                                    )}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                             <Button size="sm" variant="destructive">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete this speech. This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteSpeech(speech)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                        No saved speeches yet for this event type.
                    </div>
                )}
                </CardContent>
            </Card>

            {sharedRecordings.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Shared Recordings</CardTitle>
                        <CardDescription>Recordings that others have shared with you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {sharedRecordings.map(speech => {
                                const owner = allUsers?.find(u => u.id === speech.ownerId);
                                return (
                                    <AccordionItem value={speech.id} key={speech.id}>
                                        <AccordionTrigger className="text-sm text-left">
                                             <div className="flex-1 flex flex-col items-start gap-2">
                                                <p>{speech.topic}</p>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="capitalize text-xs">{speech.mode}</Badge>
                                                    {owner && (
                                                        <p className="text-xs text-muted-foreground">Shared by {owner.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-xs text-muted-foreground mb-2">{format(new Date(speech.date), 'PPP')}</p>
                                            <Button size="sm" variant="secondary" onClick={() => handleViewArchivedSpeech(speech)}>
                                                <ChevronsRight className="mr-2 h-4 w-4"/> View
                                            </Button>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            <AlertDialog open={!!topicToConfirm} onOpenChange={(open) => !open && setTopicToConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Start Practice Session?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have selected the topic: "{topicToConfirm?.text}". Your prep time will begin immediately.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmTopic}>Start Prep</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!scriptToPractice} onOpenChange={(open) => {if(!open) setScriptToPractice(null)}}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Practice Speech?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Would you like to start a recording session for "{scriptToPractice?.title}"? The script body will be loaded into the teleprompter.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmPractice}>Start Recording</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isPracticeSessionOpen} onOpenChange={(open) => { if (!open) { setIsPracticeSessionOpen(false); resetPractice(); }}}>
                <DialogContent className="max-w-7xl h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">
                           {viewingSpeech ? "Saved Speech" : `${eventNameMap[mode]} Speech Practice`}
                        </DialogTitle>
                        {selectedTopic && <DialogDescription>{selectedTopic.text}</DialogDescription>}
                    </DialogHeader>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                        <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2">
                            <Card>
                                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Record Speech</CardTitle>
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
                                                            <Button onClick={handleSaveSpeech} disabled={isSaving}>
                                                                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2"/>}
                                                                {isSaving ? 'Saving...' : 'Save Recording'}
                                                            </Button>
                                                        </div>
                                                    ) : !viewingSpeech && (
                                                        <Button 
                                                            onClick={initiateRecordingProcess} 
                                                            disabled={!selectedTopic || !hasCameraPermission || !isCameraOn || !!viewingSpeech || countdown !== null || (prepTimerActive && !isScriptedEvent)}
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
                        
                            <Card>
                                <CardHeader>
                                    <CardTitle>Notes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Textarea 
                                        placeholder={viewingSpeech ? "No notes were taken for this speech." : "Start typing your notes here..."}
                                        className="h-48 text-base resize-none"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        readOnly={!!viewingSpeech}
                                    />
                                </CardContent>
                            </Card>
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
                                             {user?.id === viewingSpeech.ownerId && allUsers && (
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
                                                            <AlertDialogAction onClick={() => handleDeleteSpeech(viewingSpeech)}>
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
                                    {!isScriptedEvent && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Prep Timer</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex flex-col items-center gap-4">
                                                <div className="text-6xl font-bold font-mono tabular-nums">
                                                    {formatTime(prepTime)}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="icon" onClick={prepTimerActive ? pausePrepTimer : startPrepTimer}>
                                                        {prepTimerActive ? <Pause /> : <Play />}
                                                    </Button>
                                                    <Button size="icon" variant="outline" onClick={() => {pausePrepTimer(); setPrepTime(mode === 'impromptu' ? 2 * 60 : 30 * 60)}}>
                                                        <RefreshCw />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
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
                                     {isScriptedEvent && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Teleprompter</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ScrollArea className="h-48 border rounded-md" ref={teleprompterRef}>
                                                    <div className="p-4 text-lg leading-relaxed">
                                                        {scriptContent ? <p className="whitespace-pre-wrap">{scriptContent}</p> : <p className="text-sm text-muted-foreground text-center p-8">Your speech script or notes will appear here.</p>}
                                                    </div>
                                                </ScrollArea>
                                            </CardContent>
                                            <CardFooter className="flex-col items-stretch gap-4">
                                                <div className="flex items-center justify-center gap-4">
                                                    <Button size="icon" variant="outline" onClick={() => setScrollSpeed(s => Math.max(1, s - 1))} disabled={!scriptContent || !!viewingSpeech}>
                                                        <Minus />
                                                    </Button>
                                                     <Button 
                                                        size="icon" 
                                                        variant="default"
                                                        onClick={() => setIsTeleprompterActive(prev => !prev)}
                                                        disabled={!scriptContent || !!viewingSpeech || speechTimerActive}
                                                     >
                                                        {isTeleprompterActive ? <Pause/> : <Play />}
                                                     </Button>
                                                    <Button size="icon" variant="outline" onClick={() => setScrollSpeed(s => Math.min(20, s + 1))} disabled={!scriptContent || !!viewingSpeech}>
                                                        <Plus />
                                                    </Button>
                                                </div>
                                                 <div className="text-sm font-medium tabular-nums w-full text-center">
                                                    Speed: {scrollSpeed}
                                                 </div>
                                            </CardFooter>
                                        </Card>
                                     )}
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
            <WriteSpeechDialog 
                isWritingDialogOpen={isWritingDialogOpen}
                setIsWritingDialogOpen={setIsWritingDialogOpen}
                speechToEdit={speechToEdit}
                associatedRecordings={associatedRecordings}
                handleSaveWrittenSpeech={handleSaveWrittenSpeech}
                handleViewArchivedSpeech={handleViewArchivedSpeech}
            />
        </div>
    );
}
