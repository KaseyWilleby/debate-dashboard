
"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SavedSpeech, WrittenSpeech } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatTime } from '@/lib/utils';
import { Edit } from 'lucide-react';


export function WriteSpeechDialog({ 
    isWritingDialogOpen, 
    setIsWritingDialogOpen, 
    speechToEdit, 
    associatedRecordings,
    handleSaveWrittenSpeech,
    handleViewArchivedSpeech
}: {
    isWritingDialogOpen: boolean,
    setIsWritingDialogOpen: (open: boolean) => void,
    speechToEdit: WrittenSpeech | null,
    associatedRecordings: SavedSpeech[],
    handleSaveWrittenSpeech: (title: string, body: string) => void,
    handleViewArchivedSpeech: (speech: SavedSpeech) => void
}) {
    const [title, setTitle] = React.useState('');
    const [body, setBody] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (isWritingDialogOpen) {
            if (speechToEdit) {
                setTitle(speechToEdit.title);
                setBody(speechToEdit.body);
                setIsEditing(false); // Default to view mode
            } else {
                setTitle('');
                setBody('');
                setIsEditing(true); // Default to edit mode for new scripts
            }
        }
    }, [isWritingDialogOpen, speechToEdit]);

    const handleSave = () => {
        if (!title) {
            toast({ variant: 'destructive', title: 'Title is required' });
            return;
        }
        handleSaveWrittenSpeech(title, body);
        setIsEditing(false);
    }
    
    const handleCancelEdit = () => {
        if (speechToEdit) {
            setTitle(speechToEdit.title);
            setBody(speechToEdit.body);
        }
        setIsEditing(false);
    }

    return (
         <Dialog open={isWritingDialogOpen} onOpenChange={(open) => { if(!open) setIsWritingDialogOpen(false) }}>
            <DialogContent className="max-w-4xl h-[90vh]">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle>{speechToEdit ? (isEditing ? 'Edit Script' : 'View Script') : 'New Script'}</DialogTitle>
                            <DialogDescription>
                                {speechToEdit ? 'Review your script and practice recordings.' : 'Compose your script below.'}
                            </DialogDescription>
                        </div>
                         {speechToEdit && !isEditing && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                    </div>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 h-full overflow-hidden p-1">
                    <div className="space-y-4 flex flex-col">
                        <div className="space-y-2">
                            <Label htmlFor="write-title">Title</Label>
                            <Input id="write-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter script title" readOnly={!isEditing} />
                        </div>
                        <div className="space-y-2 flex-grow flex flex-col">
                            <Label htmlFor="write-body">Body</Label>
                            <Textarea id="write-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Start writing your script..." className="h-full flex-grow resize-none" readOnly={!isEditing} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        <h4 className="font-medium shrink-0">Practice Recordings</h4>
                        {associatedRecordings.length > 0 ? (
                        <ScrollArea className="h-full max-h-[calc(80vh-150px)] pr-4 -mr-4">
                            <ul className="space-y-2">
                                {associatedRecordings.map(rec => (
                                    <li key={rec.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">Recorded on {format(new Date(rec.date), 'PPP')}</p>
                                            <p className="text-xs text-muted-foreground">Duration: {formatTime(rec.speechTime)}</p>
                                        </div>
                                        <Button size="sm" variant="secondary" onClick={() => { setIsWritingDialogOpen(false); handleViewArchivedSpeech(rec); }}>View</Button>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                        ) : (
                        <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-md h-full flex items-center justify-center">
                            <p>No recordings for this script yet.</p>
                        </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                            <Button onClick={handleSave}>Save Script</Button>
                        </>
                    ) : (
                         <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
