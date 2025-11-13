
"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { format, parse, isBefore, addDays } from "date-fns";
import { Calendar as CalendarIcon, ExternalLink, PlusCircle, Wand2, Loader2, Trash2, Search, RefreshCw, Pencil, Link, LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Tournament, ScrapedTournament } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { extractTournamentInfo } from "@/ai/flows/extract-tournament-info-flow";
import { scrapeTabroomTournaments } from "@/ai/flows/scrape-tabroom-flow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";


const tournamentSchema = z.object({
  name: z.string().min(3, "Tournament name must be at least 3 characters."),
  date: z.date({ required_error: "A date is required." }),
  registrationCloseDate: z.date().optional(),
  webpageUrl: z.string().url().optional().or(z.literal('')),
  scheduleUrl: z.string().url().optional().or(z.literal('')),
  leaveTime: z.string().optional(),
  periodLeaving: z.enum(['All Day', '2nd', '3rd', '4th', '5th', '6th', '7th']).optional(),
  notes: z.string().optional(),
  isSwing: z.boolean().optional(),
  schools: z.string().optional(), // Comma-separated school names
});

export default function TournamentSchedulerPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const { firestore } = useFirebase();

  const tournamentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading || user?.role !== 'admin') return null;
    return collection(firestore, 'tournaments');
  }, [firestore, user, isAuthLoading]);
  const { data: tournaments, isLoading: areTournamentsLoading } = useCollection<Tournament>(tournamentsQuery);
  const isLoading = isAuthLoading || (user?.role === 'admin' && areTournamentsLoading);

  // View mode state
  const [viewMode, setViewMode] = React.useState<'card' | 'list'>(() => {
    if (typeof window === 'undefined') return 'card';
    return (localStorage.getItem('tournament-view-mode') as 'card' | 'list') || 'card';
  });

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('tournament-view-mode', mode);
  };


  const addTournament = (tournament: Omit<Tournament, 'id' | 'entries'>) => {
    if (!firestore) return;
    const newTournament = { ...tournament, entries: [] };

    // Remove undefined values - Firestore doesn't accept them
    const cleanedData = Object.fromEntries(
      Object.entries(newTournament).filter(([_, value]) => value !== undefined)
    );

    addDoc(collection(firestore, 'tournaments'), cleanedData).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'tournaments',
          operation: 'create',
          requestResourceData: cleanedData
      }));
    });
    toast({ title: "Tournament Created!", description: `${newTournament.name} has been added.` });
  };
  
  const deleteTournament = (tournamentId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'tournaments', tournamentId)).catch(error => {
       errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `tournaments/${tournamentId}`,
          operation: 'delete',
      }));
    });
    toast({
        title: "Tournament Deleted",
        description: "The tournament has been successfully removed.",
        variant: "destructive"
    });
  }

  const updateTournament = (tournament: Tournament) => {
    if (!firestore) return;
    const { id, entries, ...tournamentData } = tournament;

    // Remove undefined values - Firestore doesn't accept them
    const cleanedData = Object.fromEntries(
      Object.entries(tournamentData).filter(([_, value]) => value !== undefined)
    );

    updateDoc(doc(firestore, 'tournaments', id), cleanedData).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `tournaments/${id}`,
        operation: 'update',
        requestResourceData: cleanedData
      }));
    });
    toast({
      title: "Tournament Updated",
      description: "The tournament information has been successfully updated.",
    });
  }

  // Sort tournaments: upcoming first (by date), past tournaments last (by date, most recent first)
  const sortedTournaments = React.useMemo(() => {
    if (!tournaments) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future: Tournament[] = [];
    const past: Tournament[] = [];

    tournaments.forEach(tournament => {
      const tournamentDate = parse(tournament.date, 'yyyy-MM-dd', new Date());
      if (isBefore(tournamentDate, today)) {
        past.push(tournament);
      } else {
        future.push(tournament);
      }
    });

    // Sort future tournaments by date (earliest first)
    future.sort((a, b) => {
      const dateA = parse(a.date, 'yyyy-MM-dd', new Date());
      const dateB = parse(b.date, 'yyyy-MM-dd', new Date());
      return dateA.getTime() - dateB.getTime();
    });

    // Sort past tournaments by date (most recent first)
    past.sort((a, b) => {
      const dateA = parse(a.date, 'yyyy-MM-dd', new Date());
      const dateB = parse(b.date, 'yyyy-MM-dd', new Date());
      return dateB.getTime() - dateA.getTime();
    });

    return [...future, ...past];
  }, [tournaments]);

  // Redirect if not admin
  if (!isAuthLoading && user?.role !== 'admin') {
    return (
       <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
          <h3 className="text-xl font-semibold font-headline">Access Denied</h3>
          <p className="text-muted-foreground mt-2">
            You must be an administrator to access this page.
          </p>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">
            Tournament Scheduler
          </h1>
          <p className="text-muted-foreground">
            Plan and manage your upcoming tournaments.
          </p>
        </div>
        <div className="flex gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && handleViewModeChange(value as 'card' | 'list')}>
              <ToggleGroupItem value="card" aria-label="Card view">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <ImportFromUrlDialog onTournamentCreated={addTournament} />
            <FindTournamentDialog onTournamentCreated={addTournament} existingTournaments={tournaments || []} />
            <AddTournamentDialog onTournamentCreated={addTournament} />
        </div>
      </div>

      {isLoading ? <Loader2 className="animate-spin m-auto" /> : (
        sortedTournaments && sortedTournaments.length > 0 ? (
          viewMode === 'card' ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {sortedTournaments.map((tournament) => (
                <TournamentItem key={tournament.id} tournament={tournament} onDelete={deleteTournament} onUpdate={updateTournament} />
              ))}
            </Accordion>
          ) : (
            <div className="space-y-2">
              {sortedTournaments.map((tournament) => (
                <TournamentListItem key={tournament.id} tournament={tournament} onDelete={deleteTournament} onUpdate={updateTournament} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
              <h3 className="text-xl font-semibold font-headline">No Tournaments Yet</h3>
              <p className="text-muted-foreground mt-2">
                Create your first tournament to get started.
              </p>
            </div>
        )
      )}
    </div>
  );
}

function AddTournamentDialog({ onTournamentCreated }: { onTournamentCreated: (tournament: Omit<Tournament, 'id' | 'entries'>) => void }) {
  const [open, setOpen] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof tournamentSchema>>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: { name: "", webpageUrl: "", scheduleUrl: "", leaveTime: "", periodLeaving: undefined, notes: "", isSwing: false, schools: "" },
  });

  const handleFetchFromUrl = async () => {
    const url = form.getValues("webpageUrl");
    if (!url) {
        toast({
            variant: "destructive",
            title: "URL Required",
            description: "Please enter a tournament webpage URL first.",
        });
        return;
    }

    setIsFetching(true);
    try {
        const result = await extractTournamentInfo(url);
        if (result.name) form.setValue('name', result.name);
        if (result.date) {
            const parsedDate = parse(result.date, 'MMMM d, yyyy', new Date());
            if (!isNaN(parsedDate.getTime())) {
                form.setValue('date', parsedDate);
            }
        }
        if (result.registrationCloseDate) {
            const parsedCloseDate = parse(result.registrationCloseDate, 'MMMM d, yyyy', new Date());
            if (!isNaN(parsedCloseDate.getTime())) {
                form.setValue('registrationCloseDate', parsedCloseDate);
            }
        }
        if (result.scheduleUrl) form.setValue('scheduleUrl', result.scheduleUrl);
        if (result.isSwing !== undefined) form.setValue('isSwing', result.isSwing);
        if (result.schools && result.schools.length > 0) {
            form.setValue('schools', result.schools.join(', '));
        }
        toast({
            title: "Information Extracted!",
            description: result.isSwing
                ? `Swing tournament detected with ${result.schools?.length || 0} schools.`
                : "The tournament details have been filled in.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Extraction Failed",
            description: "Could not extract information from the URL. Please fill in the details manually.",
        });
        console.error(error);
    } finally {
        setIsFetching(false);
    }
  };

  function onSubmit(values: z.infer<typeof tournamentSchema>) {
    const newTournamentData = {
      name: values.name,
      date: format(values.date, "yyyy-MM-dd"),
      registrationCloseDate: values.registrationCloseDate ? format(values.registrationCloseDate, "yyyy-MM-dd") : undefined,
      webpageUrl: values.webpageUrl,
      scheduleUrl: values.scheduleUrl,
      leaveTime: values.leaveTime,
      periodLeaving: values.periodLeaving,
      notes: values.notes,
      isSwing: values.isSwing,
      schools: values.isSwing && values.schools ? values.schools.split(',').map(s => s.trim()).filter(s => s) : undefined,
    };
    onTournamentCreated(newTournamentData);
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2" />
          New Tournament
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Tournament</DialogTitle>
          <DialogDescription>
            Fill in the details for the new tournament, or enter a URL to automatically extract them.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField control={form.control} name="webpageUrl" render={({ field }) => (
                <FormItem>
                    <FormLabel>Tournament Webpage URL</FormLabel>
                    <div className="flex gap-2">
                        <FormControl>
                            <Input placeholder="https://tabroom.com/..." {...field} />
                        </FormControl>
                        <Button type="button" variant="outline" size="icon" onClick={handleFetchFromUrl} disabled={isFetching}>
                            {isFetching ? <Loader2 className="animate-spin" /> : <Wand2 />}
                            <span className="sr-only">Fetch from URL</span>
                        </Button>
                    </div>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Tournament Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                    </PopoverContent>
                    </Popover><FormMessage />
                </FormItem>
                )}/>
                 <FormField control={form.control} name="registrationCloseDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Reg. Closes</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                    </Popover><FormMessage />
                </FormItem>
                )}/>
            </div>
             <FormField control={form.control} name="scheduleUrl" render={({ field }) => (
              <FormItem><FormLabel>Tournament Schedule URL</FormLabel><FormControl><Input placeholder="https://docs.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="leaveTime" render={({ field }) => (
                <FormItem><FormLabel>Leave Time</FormLabel><FormControl><Input placeholder="8:00 AM" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="periodLeaving" render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Leaving</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="All Day">All Day</SelectItem>
                      <SelectItem value="2nd">2nd Period</SelectItem>
                      <SelectItem value="3rd">3rd Period</SelectItem>
                      <SelectItem value="4th">4th Period</SelectItem>
                      <SelectItem value="5th">5th Period</SelectItem>
                      <SelectItem value="6th">6th Period</SelectItem>
                      <SelectItem value="7th">7th Period</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional tournament information..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="isSwing" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>This is a swing tournament</FormLabel>
                  <p className="text-sm text-muted-foreground">Check this if the tournament is co-hosted by multiple schools</p>
                </div>
              </FormItem>
            )}/>
            {form.watch("isSwing") && (
              <FormField control={form.control} name="schools" render={({ field }) => (
                <FormItem>
                  <FormLabel>Participating Schools</FormLabel>
                  <FormControl>
                    <Input placeholder="Cy-Fair High School, Cy-Creek High School" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Separate school names with commas</p>
                  <FormMessage />
                </FormItem>
              )}/>
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Create Tournament</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditTournamentDialog({ tournament, open, onOpenChange, onUpdate }: { tournament: Tournament, open: boolean, onOpenChange: (open: boolean) => void, onUpdate: (tournament: Tournament) => void }) {
  const form = useForm<z.infer<typeof tournamentSchema>>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: tournament.name,
      date: new Date(tournament.date),
      registrationCloseDate: tournament.registrationCloseDate ? new Date(tournament.registrationCloseDate) : undefined,
      webpageUrl: tournament.webpageUrl || "",
      scheduleUrl: tournament.scheduleUrl || "",
      leaveTime: tournament.leaveTime || "",
      periodLeaving: tournament.periodLeaving || undefined,
      notes: tournament.notes || "",
      isSwing: tournament.isSwing || false,
      schools: tournament.schools ? tournament.schools.join(', ') : "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: tournament.name,
        date: new Date(tournament.date),
        registrationCloseDate: tournament.registrationCloseDate ? new Date(tournament.registrationCloseDate) : undefined,
        webpageUrl: tournament.webpageUrl || "",
        scheduleUrl: tournament.scheduleUrl || "",
        leaveTime: tournament.leaveTime || "",
        periodLeaving: tournament.periodLeaving || undefined,
        notes: tournament.notes || "",
        isSwing: tournament.isSwing || false,
        schools: tournament.schools ? tournament.schools.join(', ') : "",
      });
    }
  }, [open, tournament, form]);

  function onSubmit(values: z.infer<typeof tournamentSchema>) {
    const updatedTournament = {
      ...tournament,
      name: values.name,
      date: format(values.date, "yyyy-MM-dd"),
      registrationCloseDate: values.registrationCloseDate ? format(values.registrationCloseDate, "yyyy-MM-dd") : undefined,
      webpageUrl: values.webpageUrl,
      scheduleUrl: values.scheduleUrl,
      leaveTime: values.leaveTime,
      periodLeaving: values.periodLeaving,
      notes: values.notes,
      isSwing: values.isSwing,
      schools: values.isSwing && values.schools ? values.schools.split(',').map(s => s.trim()).filter(s => s) : undefined,
    };
    onUpdate(updatedTournament);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
          <DialogDescription>
            Update the details for this tournament.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Tournament Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                    </PopoverContent>
                    </Popover><FormMessage />
                </FormItem>
                )}/>
                 <FormField control={form.control} name="registrationCloseDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Reg. Closes</FormLabel>
                    <Popover>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant={"outline"} className={cn(!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                    </Popover><FormMessage />
                </FormItem>
                )}/>
            </div>
            <FormField control={form.control} name="webpageUrl" render={({ field }) => (
              <FormItem><FormLabel>Tournament Webpage URL</FormLabel><FormControl><Input placeholder="https://tabroom.com/..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="scheduleUrl" render={({ field }) => (
              <FormItem><FormLabel>Tournament Schedule URL</FormLabel><FormControl><Input placeholder="https://docs.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="leaveTime" render={({ field }) => (
                <FormItem><FormLabel>Leave Time</FormLabel><FormControl><Input placeholder="8:00 AM" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="periodLeaving" render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Leaving</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="All Day">All Day</SelectItem>
                      <SelectItem value="2nd">2nd Period</SelectItem>
                      <SelectItem value="3rd">3rd Period</SelectItem>
                      <SelectItem value="4th">4th Period</SelectItem>
                      <SelectItem value="5th">5th Period</SelectItem>
                      <SelectItem value="6th">6th Period</SelectItem>
                      <SelectItem value="7th">7th Period</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional tournament information..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="isSwing" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>This is a swing tournament</FormLabel>
                  <p className="text-sm text-muted-foreground">Check this if the tournament is co-hosted by multiple schools</p>
                </div>
              </FormItem>
            )}/>
            {form.watch("isSwing") && (
              <FormField control={form.control} name="schools" render={({ field }) => (
                <FormItem>
                  <FormLabel>Participating Schools</FormLabel>
                  <FormControl>
                    <Input placeholder="Cy-Fair High School, Cy-Creek High School" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Separate school names with commas</p>
                  <FormMessage />
                </FormItem>
              )}/>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


function TournamentItem({ tournament, onDelete, onUpdate }: { tournament: Tournament, onDelete: (id: string) => void, onUpdate: (tournament: Tournament) => void }) {
    const [editOpen, setEditOpen] = React.useState(false);

    const registrationClosed = React.useMemo(() => {
        if (!tournament.registrationCloseDate) return false;
        return isBefore(new Date(tournament.registrationCloseDate), addDays(new Date(), -1));
    }, [tournament.registrationCloseDate]);
    
    return (
      <AccordionItem value={tournament.id} className="border-none">
        <div className={cn("bg-card border rounded-lg", registrationClosed && "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800")}>
          <div className="flex items-center p-4">
              <AccordionTrigger className="flex-1 text-left p-0 hover:no-underline">
                  <div className="space-y-1">
                      <h3 className="font-headline text-lg font-semibold">{tournament.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tournament.date), "EEEE, MMMM d, yyyy")}
                        {tournament.leaveTime && <span className="ml-2">• Leave: {tournament.leaveTime}</span>}
                      </p>
                      {tournament.registrationCloseDate && (
                         <p className={cn("text-xs", registrationClosed ? "text-red-700 dark:text-red-300 font-medium" : "text-muted-foreground")}>
                           Registration closes: {format(new Date(tournament.registrationCloseDate), "MMMM d, yyyy")}
                         </p>
                      )}
                      {tournament.notes && (
                         <p className="text-xs text-muted-foreground italic">{tournament.notes}</p>
                      )}
                  </div>
              </AccordionTrigger>
               <div className="flex items-center gap-2 pl-4">
                  {tournament.webpageUrl && (
                  <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                      <a href={tournament.webpageUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3"/> Webpage
                      </a>
                  </Button>
                  )}
                  {tournament.scheduleUrl && (
                  <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                      <a href={tournament.scheduleUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3 w-3"/> Schedule
                      </a>
                  </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}>
                      <Pencil className="mr-2 h-3 w-3" /> Edit
                  </Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="mr-2 h-3 w-3" /> Delete
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the
                              tournament and all of its entries.
                          </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(tournament.id)}>
                              Continue
                          </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              </div>
          </div>
          <AccordionContent className="p-4 pt-0">
             <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">Entries</h4>
                  </div>
                  {tournament.entries.length > 0 ? (
                      <ul className="space-y-3">
                        {tournament.entries.map(entry => (
                          <li key={entry.id} className="text-sm p-3 rounded-md bg-muted/50">
                            <p className="font-medium">{entry.name}</p>
                             <p className="text-muted-foreground text-xs">{entry.events.join(', ')}</p>
                             {entry.partnerships && entry.partnerships.length > 0 && (
                              <ul className="mt-2 space-y-1 pl-4 border-l">
                                {entry.partnerships.map(p => (
                                  <li key={p.event} className="text-xs">
                                    <span className="font-medium">{p.event}:</span>
                                    {p.partnerNames && p.partnerNames.length > 0 ? (
                                       <span className="text-muted-foreground ml-2">{p.partnerNames.join(', ')}</span>
                                    ) : (
                                       <span className="text-muted-foreground ml-2 italic">No partner selected</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                             )}
                          </li>
                        ))}
                      </ul>
                  ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">No entries added yet.</div>
                  )}
              </div>
          </AccordionContent>
        </div>
        <EditTournamentDialog tournament={tournament} open={editOpen} onOpenChange={setEditOpen} onUpdate={onUpdate} />
      </AccordionItem>
    )
}

function TournamentListItem({ tournament, onDelete, onUpdate }: { tournament: Tournament, onDelete: (id: string) => void, onUpdate: (tournament: Tournament) => void }) {
    const [editOpen, setEditOpen] = React.useState(false);

    const registrationClosed = React.useMemo(() => {
        if (!tournament.registrationCloseDate) return false;
        return isBefore(new Date(tournament.registrationCloseDate), addDays(new Date(), -1));
    }, [tournament.registrationCloseDate]);

    return (
      <>
        <div className={cn("flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors", registrationClosed && "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800")}>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-base font-semibold truncate">{tournament.name}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(tournament.date), "EEEE, MMMM d, yyyy")}
              {tournament.leaveTime && <span className="ml-2">• Leave: {tournament.leaveTime}</span>}
              {tournament.registrationCloseDate && (
                <span className={cn("ml-2 •", registrationClosed ? "text-red-700 dark:text-red-300 font-medium" : "")}>
                  Reg: {format(new Date(tournament.registrationCloseDate), "MMM d")}
                </span>
              )}
            </p>
            {tournament.entries.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {tournament.entries.length} {tournament.entries.length === 1 ? 'entry' : 'entries'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {tournament.webpageUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={tournament.webpageUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            {tournament.scheduleUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={tournament.scheduleUrl} target="_blank" rel="noopener noreferrer">
                  <Link className="h-3 w-3" />
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{tournament.name}" and all associated entries. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(tournament.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <EditTournamentDialog tournament={tournament} open={editOpen} onOpenChange={setEditOpen} onUpdate={onUpdate} />
      </>
    )
}

function ImportFromUrlDialog({ onTournamentCreated }: { onTournamentCreated: (tournament: Omit<Tournament, 'id' | 'entries'>) => void }) {
    const [open, setOpen] = React.useState(false);
    const [url, setUrl] = React.useState('');
    const [isImporting, setIsImporting] = React.useState(false);
    const { toast } = useToast();

    const handleImport = async () => {
        if (!url) {
            toast({
                variant: "destructive",
                title: "URL Required",
                description: "Please enter a tournament webpage URL.",
            });
            return;
        }

        setIsImporting(true);
        try {
            const result = await extractTournamentInfo(url);

            const parsedDate = parse(result.date, 'MMMM d, yyyy', new Date());
            const parsedCloseDate = result.registrationCloseDate ? parse(result.registrationCloseDate, 'MMMM d, yyyy', new Date()) : undefined;

            const newTournamentData = {
                name: result.name,
                date: format(!isNaN(parsedDate.getTime()) ? parsedDate : new Date(), "yyyy-MM-dd"),
                registrationCloseDate: parsedCloseDate && !isNaN(parsedCloseDate.getTime()) ? format(parsedCloseDate, "yyyy-MM-dd") : undefined,
                webpageUrl: url,
                scheduleUrl: result.scheduleUrl,
                isSwing: result.isSwing,
                schools: result.schools,
            };

            onTournamentCreated(newTournamentData);

            toast({
                title: "Tournament Imported!",
                description: result.isSwing
                    ? `${result.name} has been added as a swing tournament with ${result.schools?.length || 0} schools.`
                    : `${result.name} has been added to your scheduler.`,
            });

            setOpen(false);
            setUrl('');
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Import Failed",
                description: error?.message || "Could not import tournament from URL. Please try again or add manually.",
            });
            console.error(error);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default">
                    <Link className="mr-2 h-4 w-4" />
                    Import from URL
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import Tournament from URL</DialogTitle>
                    <DialogDescription>
                        Paste a Tabroom.com tournament URL to automatically import all details.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="url">Tournament URL</Label>
                        <Input
                            id="url"
                            placeholder="https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={isImporting}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isImporting}>
                        Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={isImporting}>
                        {isImporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            'Import Tournament'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function FindTournamentDialog({ onTournamentCreated, existingTournaments }: { onTournamentCreated: (tournament: Omit<Tournament, 'id' | 'entries'>) => void; existingTournaments: Tournament[] }) {
    const [open, setOpen] = React.useState(false);
    const [isScraping, setIsScraping] = React.useState(false);
    const [scrapedTournaments, setScrapedTournaments] = React.useState<ScrapedTournament[]>([]);
    const { toast } = useToast();

    const fetchAndFilterTournaments = React.useCallback(async () => {
        setIsScraping(true);
        try {
            const results = await scrapeTabroomTournaments();
            const existingUrls = new Set(existingTournaments.map(t => t.webpageUrl));
            const availableTournaments = results.filter(t => !existingUrls.has(t.url));
            setScrapedTournaments(availableTournaments);
             if (open) { 
                 if (availableTournaments.length === 0 && results.length > 0) {
                     toast({
                        title: "All Tournaments Added",
                        description: "All upcoming tournaments from Tabroom are already in your scheduler.",
                    });
                }
            }
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Scraping Failed",
                description: "Could not retrieve the tournament list from Tabroom.com.",
            });
            console.error(error);
        } finally {
            setIsScraping(false);
        }
    }, [toast, open, existingTournaments]);
    
    React.useEffect(() => {
        if (open) {
           fetchAndFilterTournaments();
        }
    }, [open, fetchAndFilterTournaments]);


    const handleAddTournament = async (scrapedTournament: ScrapedTournament) => {
        try {
            const result = await extractTournamentInfo(scrapedTournament.url);
            
            const parsedDate = parse(result.date, 'MMMM d, yyyy', new Date());
            const parsedCloseDate = result.registrationCloseDate ? parse(result.registrationCloseDate, 'MMMM d, yyyy', new Date()) : undefined;

            const newTournamentData = {
                name: result.name,
                date: format(!isNaN(parsedDate.getTime()) ? parsedDate : new Date(), "yyyy-MM-dd"),
                registrationCloseDate: parsedCloseDate && !isNaN(parsedCloseDate.getTime()) ? format(parsedCloseDate, "yyyy-MM-dd") : undefined,
                webpageUrl: scrapedTournament.url,
                scheduleUrl: result.scheduleUrl,
                isSwing: result.isSwing,
                schools: result.schools,
            };
            onTournamentCreated(newTournamentData);
            
            setScrapedTournaments(prev => prev.filter(t => t.url !== scrapedTournament.url));

        } catch (error) {
             toast({
                variant: "destructive",
                title: "Extraction Failed",
                description: "Could not extract tournament details. Please add it manually.",
            });
            console.error(error);
        }
    }
    
    const handleRefresh = () => {
         fetchAndFilterTournaments();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Search className="mr-2" />
                    Find Tournaments
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle>Add Tournaments from Tabroom</DialogTitle>
                            <DialogDescription>
                                A list of upcoming tournaments in Texas from Tabroom.com. Click add to import one to your scheduler.
                            </DialogDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isScraping}>
                           <RefreshCw className={cn("h-4 w-4", isScraping && "animate-spin")} />
                           <span className="sr-only">Refresh</span>
                        </Button>
                    </div>
                </DialogHeader>

                <div className="relative pt-4">
                    {isScraping ? (
                         <div className="h-72 flex items-center justify-center">
                            <Loader2 className="animate-spin text-muted-foreground" size={32} />
                         </div>
                    ) : scrapedTournaments.length > 0 ? (
                        <ScrollArea className="h-72">
                            <div className="space-y-2 pr-4">
                                {scrapedTournaments.map((t) => (
                                    <div key={t.url} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                        <div>
                                            <p className="text-sm font-medium">{t.name}</p>
                                            <p className="text-xs text-muted-foreground">{t.date}</p>
                                        </div>
                                        <Button size="sm" onClick={() => handleAddTournament(t)}>
                                            <PlusCircle className="mr-2" /> Add
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                         <div className="h-72 flex items-center justify-center text-center text-muted-foreground p-4">
                            <p>All available tournaments have been added. Delete a tournament from the main list to add it again.</p>
                         </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

    

    