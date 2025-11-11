'use client';

import * as React from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { DebateCase, CaseContention, CaseBlock, SpeechStance, ContentionOrder, DebateFormat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PlusCircle, Trash2, Save, BrainCircuit, Wand2, Edit, BookCopy, Scissors, Bold, Underline, Highlighter, Users, Pilcrow, Heading1, Heading2, Heading3, Archive, ArchiveRestore } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const DEBATE_CASES_STORAGE_KEY = 'work-session-debate-cases';

const getStanceLabels = (format: DebateFormat): { affirmative: string, negative: string } => {
    switch (format) {
        case 'PF': return { affirmative: 'Pro', negative: 'Con' };
        case 'WSD': return { affirmative: 'Proposition', negative: 'Opposition' };
        default: return { affirmative: 'Affirmative', negative: 'Negative' };
    }
};

export default function CaseEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const caseId = params.id as string;
    
    const [caseData, setCaseData] = React.useState<DebateCase | null>(null);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
        const storedCases = localStorage.getItem(DEBATE_CASES_STORAGE_KEY);
        
        if (storedCases) {
            try {
                const cases: DebateCase[] = JSON.parse(storedCases);
                const currentCase = cases.find(c => c.id === caseId);
                if (currentCase) {
                    setCaseData(currentCase);
                } else {
                    notFound();
                }
            } catch (e) {
                notFound();
            }
        } else {
             notFound();
        }
    }, [caseId]);
    
    const handleSave = () => {
        if (!caseData) return;
        const storedCases = localStorage.getItem(DEBATE_CASES_STORAGE_KEY);
        let cases: DebateCase[] = [];
        if (storedCases) {
            try {
                cases = JSON.parse(storedCases);
            } catch (e) {
                console.error("Error parsing cases from localStorage", e);
            }
        }
        const caseExists = cases.some(c => c.id === caseId);
        const updatedCases = caseExists 
            ? cases.map(c => c.id === caseId ? caseData : c)
            : [...cases, caseData];

        localStorage.setItem(DEBATE_CASES_STORAGE_KEY, JSON.stringify(updatedCases));
        toast({ title: 'Case Saved!' });
    }
    
    if (!isMounted || !caseData || !user) {
        return null; // Don't render until everything is loaded client-side
    }

    if (caseData.ownerId !== user.uid) {
        // This is a simple authorization check. In a real app, this should be handled by backend rules.
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You do not have permission to view this case.</p>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={() => router.back()}>Go Back</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    const stanceLabel = getStanceLabels(caseData.type)[caseData.stance];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => router.push('/dashboard/debate-events')}>
                    <ArrowLeft className="mr-2" /> Back to Debate Events
                </Button>
                <div className="flex items-center gap-4">
                    <Button onClick={handleSave}>
                        <Save className="mr-2" /> Save Case
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl font-headline">{caseData.resolution}</CardTitle>
                            <p className="text-muted-foreground">{caseData.name}</p>
                            <p className="text-muted-foreground">{caseData.type} - <span className="capitalize">{stanceLabel}</span></p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="framework" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="framework">Framework</TabsTrigger>
                    <TabsTrigger value="contentions">Contentions</TabsTrigger>
                    <TabsTrigger value="blocks">Blocks</TabsTrigger>
                </TabsList>
                
                <TabsContent value="framework" className="mt-4">
                    <FrameworkEditor caseData={caseData} setCaseData={setCaseData} />
                </TabsContent>

                <TabsContent value="contentions" className="mt-4">
                    <ContentionsEditor caseData={caseData} setCaseData={setCaseData} />
                </TabsContent>

                <TabsContent value="blocks" className="mt-4">
                    <BlocksEditor 
                        caseData={caseData} 
                        setCaseData={setCaseData} 
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FrameworkEditor({ caseData, setCaseData }: { caseData: DebateCase, setCaseData: React.Dispatch<React.SetStateAction<DebateCase | null>> }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [isWizardOpen, setIsWizardOpen] = React.useState(false);

    const handleFrameworkUpdate = (newFramework: string) => {
        setCaseData(prev => prev ? { ...prev, framework: newFramework } : null);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Framework</CardTitle>
                        <div className="flex gap-2">
                             <Button variant="outline" size="sm" onClick={() => setIsWizardOpen(true)}>
                                <BrainCircuit className="mr-2" /> Wizard
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                                <Edit className="mr-2" /> {isEditing ? 'Done' : 'Edit'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="Use the wizard or edit directly to build your framework..."
                        className="h-96 text-base"
                        value={caseData.framework}
                        onChange={e => handleFrameworkUpdate(e.target.value)}
                        readOnly={!isEditing}
                    />
                </CardContent>
            </Card>

            <FrameworkWizardDialog
                isOpen={isWizardOpen}
                onOpenChange={setIsWizardOpen}
                caseData={caseData}
                onFrameworkGenerated={handleFrameworkUpdate}
            />
        </>
    )
}

function ContentionsEditor({ caseData, setCaseData }: { caseData: DebateCase, setCaseData: React.Dispatch<React.SetStateAction<DebateCase | null>> }) {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [contentionToEdit, setContentionToEdit] = React.useState<CaseContention | null>(null);

    const handleSaveContention = (contentionData: Omit<CaseContention, 'id' | 'order'>) => {
        if (contentionToEdit) { // Editing
            const updatedContentions = caseData.contentions.map(c => 
                c.id === contentionToEdit.id ? { ...contentionToEdit, ...contentionData } : c
            );
            setCaseData(prev => prev ? { ...prev, contentions: updatedContentions } : null);
        } else { // Creating
            const nextOrder = (caseData.contentions.filter(c => c.order !== 'X').length + 1) as ContentionOrder;
            const newContention: CaseContention = { 
                id: `contention-${Date.now()}`, 
                order: nextOrder <= 5 ? nextOrder : 'X',
                ...contentionData
            };
            const newContentions = [...(caseData.contentions || []), newContention];
            setCaseData(prev => prev ? { ...prev, contentions: newContentions } : null);
        }
    };
    
    const handleOpenDialog = (contention?: CaseContention) => {
        setContentionToEdit(contention || null);
        setIsDialogOpen(true);
    };

    const handleUpdateOrder = (id: string, order: ContentionOrder) => {
        const updatedContentions = (caseData.contentions || []).map(c => c.id === id ? { ...c, order } : c);
        
        updatedContentions.sort((a, b) => {
            if (a.order === 'X' && b.order === 'X') return 0;
            if (a.order === 'X') return 1;
            if (b.order === 'X') return -1;
            return a.order - b.order;
        });

        setCaseData(prev => prev ? { ...prev, contentions: updatedContentions } : null);
    };

    const handleRemoveContention = (id: string) => {
        const newContentions = (caseData.contentions || []).filter(c => c.id !== id);
        setCaseData(prev => prev ? { ...prev, contentions: newContentions } : null);
    };
    
    const contentionOrderOptions: ContentionOrder[] = [1, 2, 3, 4, 5, 'X'];

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Contentions</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2"/> Add Contention
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {(caseData.contentions || []).length > 0 ? (
                            (caseData.contentions || []).map(contention => (
                                <li key={contention.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/50">
                                    <span className="font-medium flex-1">{contention.tagline || 'Untitled Contention'}</span>
                                    <div className="flex items-center gap-2">
                                        <Select value={String(contention.order)} onValueChange={(v) => handleUpdateOrder(contention.id, v as ContentionOrder)}>
                                            <SelectTrigger className="w-36 h-9">
                                                <SelectValue placeholder="Order" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {contentionOrderOptions.map(opt => (
                                                    <SelectItem key={opt} value={String(opt)}>
                                                        {opt === 'X' ? 'Excluded' : `Contention ${opt}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleOpenDialog(contention)}><Edit className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-9 w-9"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Contention?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete this contention and cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRemoveContention(contention.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No contentions created yet.</p>
                        )}
                    </ul>
                </CardContent>
            </Card>

            <ContentionDialog 
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSaveContention}
                contention={contentionToEdit}
                caseData={caseData}
            />
        </>
    )
}

function BlocksEditor({ caseData, setCaseData }: { caseData: DebateCase, setCaseData: React.Dispatch<React.SetStateAction<DebateCase | null>> }) {
    const [blockToEdit, setBlockToEdit] = React.useState<CaseBlock | null>(null);
    
    const addBlock = () => {
        const newBlock = { id: `block-${Date.now()}`, argument: 'Anticipated Argument', response: '' };
        const newBlocks = [...(caseData.blocks || []), newBlock];
        setCaseData(prev => prev ? { ...prev, blocks: newBlocks } : null);
        setBlockToEdit(newBlock); // Open editor for the new block
    }

    const handleSaveBlock = (updatedBlock: CaseBlock) => {
        const updatedBlocks = (caseData.blocks || []).map(b => b.id === updatedBlock.id ? updatedBlock : b);
        setCaseData(prev => prev ? { ...prev, blocks: updatedBlocks } : null);
        setBlockToEdit(null); // Close the dialog
    };
    
    const removeBlock = (id: string) => {
        const newBlocks = (caseData.blocks || []).filter(b => b.id !== id);
        setCaseData(prev => prev ? { ...prev, blocks: newBlocks } : null);
    }
    
    const renderBlockResponse = (response: string) => {
        return response.replace(/\n/g, '<br/>');
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Blocks</CardTitle>
                         <Button variant="outline" size="sm" onClick={addBlock}><PlusCircle className="mr-2"/> Add Block</Button>
                    </div>
                     <CardDescription>Prepare responses to arguments you expect to hear from your opponent.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {(caseData.blocks || []).map((block) => (
                        <Card key={block.id}>
                            <CardHeader className="p-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">{block.argument}</CardTitle>
                                 <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setBlockToEdit(block)}>
                                        <Edit className="mr-2" /> Edit
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive"><Trash2 className="mr-2" /> Remove</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete this block and cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => removeBlock(block.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <ScrollArea className="h-48 w-full rounded-md border p-4">
                                    <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: renderBlockResponse(block.response) }} />
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    ))}
                    {(caseData.blocks || []).length === 0 && <p className="text-sm text-muted-foreground text-center pt-8">No blocks prepared yet.</p>}
                </CardContent>
            </Card>
            <BlockEditorDialog
                isOpen={!!blockToEdit}
                onOpenChange={(open) => !open && setBlockToEdit(null)}
                block={blockToEdit}
                onSave={handleSaveBlock}
                caseData={caseData}
            />
        </>
    );
}

function ContentionDialog({ isOpen, onOpenChange, onSave, contention, caseData }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: (data: Omit<CaseContention, 'id' | 'order'>) => void, contention: CaseContention | null, caseData: DebateCase }) {
    const [tagline, setTagline] = React.useState('');
    const [claim, setClaim] = React.useState('');
    const [warrant, setWarrant] = React.useState('');
    const [impact, setImpact] = React.useState('');
    
    React.useEffect(() => {
        if (isOpen) {
            setTagline(contention?.tagline || '');
            setClaim(contention?.claim || '');
            setWarrant(contention?.warrant || '');
            setImpact(contention?.impact || '');
        }
    }, [isOpen, contention]);

    const handleSave = () => {
        onSave({ tagline, claim, warrant, impact });
        onOpenChange(false);
    };
    
    const renderWarrantPreview = (warrantText: string) => {
        if (typeof DOMParser === 'undefined') return warrantText; // SSR safety
        return warrantText.replace(/\n/g, '<br/>');
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{contention ? 'Edit Contention' : 'Create New Contention'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="tagline">Tagline</Label>
                            <Input id="tagline" value={tagline} onChange={e => setTagline(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="claim">Claim</Label>
                            <Textarea id="claim" value={claim} onChange={e => setClaim(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="warrant">Warrant</Label>
                            </div>
                             <Textarea id="warrant" value={warrant} onChange={e => setWarrant(e.target.value)} className="h-32" placeholder="Type your warrant..."/>
                             <div className="space-y-1">
                                 <Label className="text-xs text-muted-foreground">Preview</Label>
                                <ScrollArea className="h-32 w-full rounded-md border p-4">
                                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: renderWarrantPreview(warrant) }} />
                                </ScrollArea>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="impact">Impact</Label>
                            <Textarea id="impact" value={impact} onChange={e => setImpact(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSave}>Save Contention</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function FrameworkWizardDialog({ isOpen, onOpenChange, caseData, onFrameworkGenerated }: { isOpen: boolean, onOpenChange: (open: boolean) => void, caseData: DebateCase, onFrameworkGenerated: (framework: string) => void }) {
    const [agd, setAgd] = React.useState('');
    const [agdAuthor, setAgdAuthor] = React.useState('');
    const [definitions, setDefinitions] = React.useState('');
    const [value, setValue] = React.useState('');
    const [valueCriterion, setValueCriterion] = React.useState('');
    const [observations, setObservations] = React.useState('');
    const [thesis, setThesis] = React.useState('');
    
    const stanceLabel = getStanceLabels(caseData.type)[caseData.stance];

    const generateFramework = () => {
        const stanceText = `vote ${stanceLabel}`;

        const parts = [
            `${agd}\nBecause I agree with ${agdAuthor}, I must urge you to ${stanceText} for today's resolution:\n"${caseData.resolution}".`,
            definitions ? `\n\nFor clarification of today's debate, I offer the following definitions:\n${definitions}` : '',
            value ? `\n\nMy value for today's debate is ${value}.` : '',
            valueCriterion ? `\nMy value criterion is ${valueCriterion}.` : '',
            observations ? `\n\nObservations:\n${observations}` : '',
            thesis ? `\n\n${thesis}` : ''
        ];

        onFrameworkGenerated(parts.filter(Boolean).join(''));
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Framework Wizard</DialogTitle>
                    <DialogDescription>Construct your framework piece by piece.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Attention Getting Device (AGD)</Label>
                        <Textarea value={agd} onChange={e => setAgd(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Author of AGD (if applicable)</Label>
                        <Input value={agdAuthor} onChange={e => setAgdAuthor(e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>Definitions</Label>
                        <Textarea value={definitions} onChange={e => setDefinitions(e.target.value)} placeholder="Term: Definition..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Value</Label>
                        <Input value={value} onChange={e => setValue(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Value Criterion</Label>
                        <Input value={valueCriterion} onChange={e => setValueCriterion(e.target.value)} />
                    </div>
                     <div className="col-span-2 space-y-2">
                        <Label>Observations</Label>
                        <Textarea value={observations} onChange={e => setObservations(e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>Thesis / Summary</Label>
                        <Textarea value={thesis} onChange={e => setThesis(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={generateFramework}><Wand2 className="mr-2" /> Generate Framework</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function BlockEditorDialog({
    isOpen,
    onOpenChange,
    block,
    onSave,
    caseData,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    block: CaseBlock | null;
    onSave: (block: CaseBlock) => void;
    caseData: DebateCase;
}) {
    const [argument, setArgument] = React.useState('');
    const [response, setResponse] = React.useState('');

    React.useEffect(() => {
        if (block) {
            setArgument(block.argument);
            setResponse(block.response);
        }
    }, [block]);

    const handleSave = () => {
        if (!block) return;
        onSave({ ...block, argument, response });
        onOpenChange(false);
    };

    const renderResponsePreview = (responseText: string) => {
        if (typeof DOMParser === 'undefined') return responseText;
        return responseText.replace(/\n/g, '<br/>');
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Block</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="block-argument">Opponent's Argument</Label>
                            <Input id="block-argument" value={argument} onChange={e => setArgument(e.target.value)} placeholder="e.g., 'They will argue that...'"/>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="block-response">Your Response</Label>
                            </div>
                            <Textarea id="block-response" value={response} onChange={e => setResponse(e.target.value)} className="h-32" placeholder="My counter-argument and evidence..."/>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Preview</Label>
                                <ScrollArea className="h-48 w-full rounded-md border p-4">
                                    <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: renderResponsePreview(response) }} />
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSave}>Save Block</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

    