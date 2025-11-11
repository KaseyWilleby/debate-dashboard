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
import { format } from "date-fns";
import { Calendar as CalendarIcon, ExternalLink, PlusCircle, UserPlus } from "lucide-react";
import type { Tournament, TournamentEntry } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

const tournamentSchema = z.object({
  name: z.string().min(3, "Tournament name must be at least 3 characters."),
  date: z.date({ required_error: "A date is required." }),
  webpageUrl: z.string().url().optional().or(z.literal('')),
  scheduleUrl: z.string().url().optional().or(z.literal('')),
});

const TOURNAMENTS_STORAGE_KEY = 'work-session-tournaments-list';

export default function TournamentSchedulerPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = React.useState<Tournament[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(tournaments));
  }, [tournaments]);

  const addTournament = (tournament: Tournament) => {
    setTournaments((prev) => [...prev, tournament]);
  };
  
  const updateTournament = (updatedTournament: Tournament) => {
    setTournaments(prev => prev.map(t => t.id === updatedTournament.id ? updatedTournament : t));
  }

  // Redirect if not admin
  if (user?.role !== 'admin') {
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
        <AddTournamentDialog onTournamentCreated={addTournament} />
      </div>

      {tournaments.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {tournaments.map((tournament) => (
            <TournamentItem key={tournament.id} tournament={tournament} />
          ))}
        </Accordion>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
            <h3 className="text-xl font-semibold font-headline">No Tournaments Yet</h3>
            <p className="text-muted-foreground mt-2">
              Create your first tournament to get started.
            </p>
          </div>
      )}
    </div>
  );
}

function AddTournamentDialog({ onTournamentCreated }: { onTournamentCreated: (tournament: Tournament) => void }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof tournamentSchema>>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: { name: "", webpageUrl: "", scheduleUrl: "" },
  });

  function onSubmit(values: z.infer<typeof tournamentSchema>) {
    const newTournament: Tournament = {
      id: `tourney-${Date.now()}`,
      name: values.name,
      date: format(values.date, "yyyy-MM-dd"),
      webpageUrl: values.webpageUrl,
      scheduleUrl: values.scheduleUrl,
      entries: [],
    };
    onTournamentCreated(newTournament);
    toast({ title: "Tournament Created!", description: `${newTournament.name} has been added.` });
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
            Fill in the details for the new tournament.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Tournament Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
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
            <FormField control={form.control} name="webpageUrl" render={({ field }) => (
              <FormItem><FormLabel>Tournament Webpage URL</FormLabel><FormControl><Input placeholder="https://tabroom.com/..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="scheduleUrl" render={({ field }) => (
              <FormItem><FormLabel>Tournament Schedule URL</FormLabel><FormControl><Input placeholder="https://docs.google.com/..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
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


function TournamentItem({ tournament }: { tournament: Tournament }) {
  return (
    <AccordionItem value={tournament.id} className="border-none">
      <div className="bg-card border rounded-lg">
        <AccordionTrigger className="p-4 hover:no-underline">
          <div className="flex-1 text-left">
            <h3 className="font-headline text-lg font-semibold">{tournament.name}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(tournament.date), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 pr-4">
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
          </div>
        </AccordionTrigger>
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
                           {entry.partnerships.length > 0 && (
                            <ul className="mt-2 space-y-1 pl-4 border-l">
                              {entry.partnerships.map(p => (
                                <li key={p.event} className="text-xs">
                                  <span className="font-medium">{p.event}:</span>
                                  <span className="text-muted-foreground ml-2">{p.partnerNames?.join(', ')}</span>
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
    </AccordionItem>
  )
}
