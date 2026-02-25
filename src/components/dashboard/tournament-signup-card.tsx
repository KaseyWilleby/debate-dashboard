
"use client";

import * as React from "react";
import { format, isBefore, addDays } from "date-fns";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import type { Tournament, TournamentEntry, Partnership, User, SchoolEntry } from "@/lib/types";
import { events, partneredEvents } from "@/lib/events";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { ExternalLink, CheckCircle, Calendar, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TournamentSignupCardProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
  allUsers: User[];
}

interface SwingTournamentFormProps {
  form: any;
  schools: string[];
  allUsers: User[];
  currentUserId?: string;
}

const partnershipSchema = z.object({
  event: z.string().min(1, "Please select an event."),
  partnerIds: z.array(z.string()).min(1, "Please select at least one partner."),
});

const schoolEntrySchema = z.object({
  school: z.string(),
  events: z.array(z.string()),
  partnerships: z.array(partnershipSchema),
});

const signupSchema = z.object({
  events: z.array(z.string()),
  partnerships: z.array(partnershipSchema),
  schoolEntries: z.array(schoolEntrySchema).optional(),
});

// Event categories for validation
const debateEvents = [
  "Lincoln Douglas Debate (LD)",
  "Public Forum Debate (PF)",
  "Cross Examination Debate (CX)",
  "World Schools Debate (WSD)",
  "Student Congress (CD)",
];

const extempEvents = {
  foreign: "Foreign Extemp (FX)",
  domestic: "Domestic Extemp (DX)",
};

function SwingTournamentForm({ form, schools, allUsers, currentUserId }: SwingTournamentFormProps) {
  const schoolEntries = form.watch("schoolEntries") || [];

  return (
    <div className="space-y-6">
      {schools.map((school, schoolIndex) => {
        const schoolEntry = schoolEntries[schoolIndex];
        const selectedEvents = schoolEntry?.events || [];
        const schoolPartnerships = schoolEntry?.partnerships || [];

        // Auto-manage partnerships for selected events
        React.useEffect(() => {
          const partneredEventsSelected = selectedEvents.filter((e: string) => partneredEvents.includes(e));
          const newPartnerships: Omit<Partnership, 'partnerNames'>[] = [];

          partneredEventsSelected.forEach((event: string) => {
            const existing = schoolPartnerships.find((p: Partnership) => p.event === event);
            if (existing) {
              newPartnerships.push(existing);
            } else {
              newPartnerships.push({ event, partnerIds: [] });
            }
          });

          const sortedNewPartnerships = newPartnerships.sort((a, b) =>
            partneredEvents.indexOf(a.event) - partneredEvents.indexOf(b.event)
          );

          if (JSON.stringify(sortedNewPartnerships) !== JSON.stringify(schoolPartnerships)) {
            form.setValue(`schoolEntries.${schoolIndex}.partnerships`, sortedNewPartnerships);
          }
        }, [selectedEvents]);

        return (
          <div key={school} className="space-y-4 rounded-md border p-4 bg-muted/30">
            <h3 className="font-semibold text-lg">{school}</h3>

            <FormField
              control={form.control}
              name={`schoolEntries.${schoolIndex}.events`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Events</FormLabel>
                  <MultiSelect
                    options={events.map(e => ({ label: e, value: e }))}
                    onValueChange={field.onChange}
                    value={field.value || []}
                    placeholder="Select up to 3 events..."
                    maxCount={3}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {schoolPartnerships && schoolPartnerships.length > 0 && (
              <div className="space-y-4 rounded-md border p-4 bg-background">
                <h4 className="font-medium text-sm">Partnered Events</h4>
                {schoolPartnerships.map((partnership: Partnership, partnershipIndex: number) => {
                  const isWsd = partnership.event === "World Schools Debate (WSD)";
                  return (
                    <FormField
                      key={partnership.event}
                      control={form.control}
                      name={`schoolEntries.${schoolIndex}.partnerships.${partnershipIndex}.partnerIds`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{partnership.event}</FormLabel>
                          {isWsd ? (
                            <MultiSelect
                              options={(allUsers || []).filter(u => u.id !== currentUserId).map(u => ({ label: u.name, value: u.id }))}
                              onValueChange={field.onChange}
                              value={field.value || []}
                              placeholder="Select up to 4 teammates..."
                              maxCount={4}
                            />
                          ) : (
                            <Select onValueChange={(value) => field.onChange([value])} value={field.value?.[0] || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a partner" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(allUsers || []).filter(u => u.id !== currentUserId).map(u => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TournamentSignupCard({ tournament, onTournamentUpdate, allUsers }: TournamentSignupCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);

  const userEntry = user ? tournament.entries.find(entry => entry.id === user.id) : undefined;

  // Check if user is registered as a partner by someone else
  const partnershipInfo = React.useMemo(() => {
    if (!user) return null;

    const partnerships: Array<{
      event: string;
      partnerId: string;
      partnerName: string;
      school?: string;
    }> = [];

    for (const entry of tournament.entries) {
      // Skip if this is the user's own entry
      if (entry.id === user.id) continue;

      // Check regular tournaments
      if (!tournament.isSwing && entry.partnerships) {
        for (const partnership of entry.partnerships) {
          if (partnership.partnerIds.includes(user.id)) {
            partnerships.push({
              event: partnership.event,
              partnerId: entry.id,
              partnerName: entry.name,
            });
          }
        }
      }

      // Check swing tournaments
      if (tournament.isSwing && entry.schoolEntries) {
        for (const schoolEntry of entry.schoolEntries) {
          for (const partnership of schoolEntry.partnerships) {
            if (partnership.partnerIds.includes(user.id)) {
              partnerships.push({
                event: partnership.event,
                partnerId: entry.id,
                partnerName: entry.name,
                school: schoolEntry.school,
              });
            }
          }
        }
      }
    }

    return partnerships.length > 0 ? partnerships : null;
  }, [user, tournament.entries, tournament.isSwing]);

  const registrationClosed = React.useMemo(() => {
    if (!tournament.registrationCloseDate) return false;
    return isBefore(new Date(tournament.registrationCloseDate), addDays(new Date(), -1));
  }, [tournament.registrationCloseDate]);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      events: [],
      partnerships: [],
      schoolEntries: tournament.isSwing && tournament.schools ? tournament.schools.map(school => ({
        school,
        events: [],
        partnerships: [],
      })) : [],
    },
  });

  React.useEffect(() => {
    if (open) {
      if (tournament.isSwing && tournament.schools) {
        // Swing tournament - load school entries
        if (userEntry && userEntry.schoolEntries) {
          form.reset({
            events: [],
            partnerships: [],
            schoolEntries: tournament.schools.map(school => {
              const existingSchoolEntry = userEntry.schoolEntries?.find(se => se.school === school);
              return existingSchoolEntry || { school, events: [], partnerships: [] };
            }),
          });
        } else {
          form.reset({
            events: [],
            partnerships: [],
            schoolEntries: tournament.schools.map(school => ({ school, events: [], partnerships: [] })),
          });
        }
      } else {
        // Regular tournament - load events and partnerships
        if (userEntry) {
          form.reset({
            events: userEntry.events || [],
            partnerships: userEntry.partnerships.map(p => ({ event: p.event, partnerIds: p.partnerIds })) || [],
            schoolEntries: [],
          });
        } else {
          form.reset({ events: [], partnerships: [], schoolEntries: [] });
        }
      }
    }
  }, [open, userEntry, form, tournament.isSwing, tournament.schools]);


  const selectedEvents = form.watch("events");

  React.useEffect(() => {
    const currentPartnerships = form.getValues('partnerships');
    const newPartnerships: Omit<Partnership, 'partnerNames'>[] = [];
    const partneredEventsSelected = selectedEvents.filter(e => partneredEvents.includes(e));

    partneredEventsSelected.forEach(event => {
      const existing = currentPartnerships.find(p => p.event === event);
      if (existing) {
        newPartnerships.push(existing);
      } else {
        newPartnerships.push({ event, partnerIds: [] });
      }
    });
    
    const sortedNewPartnerships = newPartnerships.sort((a,b) => partneredEvents.indexOf(a.event) - partneredEvents.indexOf(b.event));

    if (JSON.stringify(sortedNewPartnerships) !== JSON.stringify(form.getValues('partnerships'))) {
      form.setValue('partnerships', sortedNewPartnerships);
    }

  }, [selectedEvents, form]);


  function onSubmit(values: z.infer<typeof signupSchema>) {
    if (!user) return;

    if (tournament.isSwing && values.schoolEntries) {
      // Validate swing tournament entries
      let hasEvents = false;
      for (const schoolEntry of values.schoolEntries) {
        if (schoolEntry.events.length > 0) {
          hasEvents = true;
          if (schoolEntry.events.length > 3) {
            toast({ variant: 'destructive', title: 'Too Many Events', description: `You can select up to 3 events per school. You selected ${schoolEntry.events.length} for ${schoolEntry.school}.`});
            return;
          }

          // Check debate event limit (max 1 per school)
          const debateEventsSelected = schoolEntry.events.filter(e => debateEvents.includes(e));
          if (debateEventsSelected.length > 1) {
            toast({
              variant: 'destructive',
              title: 'Debate Event Limit',
              description: `You can only select 1 debate event per school. You selected ${debateEventsSelected.length} debate events for ${schoolEntry.school}.`
            });
            return;
          }

          // Check extemp event conflict (cannot have both FX and DX per school)
          const hasForeignExtemp = schoolEntry.events.includes(extempEvents.foreign);
          const hasDomesticExtemp = schoolEntry.events.includes(extempEvents.domestic);
          if (hasForeignExtemp && hasDomesticExtemp) {
            toast({
              variant: 'destructive',
              title: 'Extemp Event Conflict',
              description: `You cannot select both Foreign Extemp and Domestic Extemp at ${schoolEntry.school}.`
            });
            return;
          }

          for (const partnership of schoolEntry.partnerships) {
            if (partnership.partnerIds.length === 0) {
              toast({ variant: 'destructive', title: 'Partner Required', description: `Please select a partner for ${partnership.event} at ${schoolEntry.school}.`});
              return;
            }
          }
        }
      }

      if (!hasEvents) {
        toast({ variant: 'destructive', title: 'No Events Selected', description: 'Please select at least one event from any school.'});
        return;
      }

      // Add partner names for swing entries
      const schoolEntriesWithNames: SchoolEntry[] = values.schoolEntries.map(se => ({
        ...se,
        partnerships: se.partnerships.map(p => ({
          ...p,
          partnerNames: p.partnerIds.map(id => allUsers.find(u => u.id === id)?.name || '')
        }))
      }));

      const newEntry: TournamentEntry = {
        id: user.id,
        name: user.name,
        events: [],
        partnerships: [],
        schoolEntries: schoolEntriesWithNames,
      };

      const updatedEntries = tournament.entries.filter(entry => entry.id !== user.id).concat(newEntry);
      onTournamentUpdate({ ...tournament, entries: updatedEntries });

      toast({ title: "Successfully Signed Up!", description: `Your entry for ${tournament.name} has been updated.` });
      setOpen(false);
    } else {
      // Regular tournament validation
      if (values.events.length === 0) {
        toast({ variant: 'destructive', title: 'No Events Selected', description: 'Please select at least one event.'});
        return;
      }
      if (values.events.length > 3) {
        toast({ variant: 'destructive', title: 'Too Many Events', description: 'You can select up to 3 events.'});
        return;
      }

      // Check debate event limit (max 1 per tournament)
      const debateEventsSelected = values.events.filter(e => debateEvents.includes(e));
      if (debateEventsSelected.length > 1) {
        toast({
          variant: 'destructive',
          title: 'Debate Event Limit',
          description: `You can only select 1 debate event per tournament. You selected: ${debateEventsSelected.join(', ')}.`
        });
        return;
      }

      // Check extemp event conflict (cannot have both FX and DX)
      const hasForeignExtemp = values.events.includes(extempEvents.foreign);
      const hasDomesticExtemp = values.events.includes(extempEvents.domestic);
      if (hasForeignExtemp && hasDomesticExtemp) {
        toast({
          variant: 'destructive',
          title: 'Extemp Event Conflict',
          description: 'You cannot select both Foreign Extemp and Domestic Extemp in the same tournament.'
        });
        return;
      }

      for (const partnership of values.partnerships) {
        if (partnership.partnerIds.length === 0) {
          toast({ variant: 'destructive', title: 'Partner Required', description: `Please select a partner for ${partnership.event}.`});
          return;
        }
      }

      const partnershipsWithNames: Partnership[] = values.partnerships.map(p => ({
          ...p,
          partnerNames: p.partnerIds.map(id => allUsers.find(u => u.id === id)?.name || '')
      }));

      const newEntry: TournamentEntry = {
        id: user.id,
        name: user.name,
        events: values.events,
        partnerships: partnershipsWithNames
      };

      const updatedEntries = tournament.entries.filter(entry => entry.id !== user.id).concat(newEntry);
      onTournamentUpdate({ ...tournament, entries: updatedEntries });

      toast({ title: "Successfully Signed Up!", description: `Your entry for ${tournament.name} has been updated.` });
      setOpen(false);
    }
  }

  const partnerships = form.watch('partnerships');

  const handleDrop = () => {
    if (!user) return;

    const updatedEntry: TournamentEntry = {
      ...userEntry!,
      dropped: true,
      droppedAt: new Date().toISOString(),
    };

    const updatedEntries = tournament.entries.map(entry =>
      entry.id === user.id ? updatedEntry : entry
    );

    onTournamentUpdate({ ...tournament, entries: updatedEntries });
    toast({ title: "Dropped from Tournament", description: `You have been marked as dropped from ${tournament.name}.` });
  };

  const handlePartnerDrop = () => {
    if (!user) return;

    const updatedEntries = tournament.entries.map(entry => {
      // Skip if this is the user's own entry
      if (entry.id === user.id) return entry;

      // Handle regular tournaments
      if (!tournament.isSwing && entry.partnerships) {
        const updatedPartnerships = entry.partnerships.map(partnership => {
          if (partnership.partnerIds.includes(user.id)) {
            // Remove user from partnership
            return {
              ...partnership,
              partnerIds: partnership.partnerIds.filter(id => id !== user.id),
              partnerNames: partnership.partnerNames?.filter((_, index) => partnership.partnerIds[index] !== user.id) || []
            };
          }
          return partnership;
        });

        return {
          ...entry,
          partnerships: updatedPartnerships
        };
      }

      // Handle swing tournaments
      if (tournament.isSwing && entry.schoolEntries) {
        const updatedSchoolEntries = entry.schoolEntries.map(schoolEntry => {
          const updatedPartnerships = schoolEntry.partnerships.map(partnership => {
            if (partnership.partnerIds.includes(user.id)) {
              // Remove user from partnership
              return {
                ...partnership,
                partnerIds: partnership.partnerIds.filter(id => id !== user.id),
                partnerNames: partnership.partnerNames?.filter((_, index) => partnership.partnerIds[index] !== user.id) || []
              };
            }
            return partnership;
          });

          return {
            ...schoolEntry,
            partnerships: updatedPartnerships
          };
        });

        return {
          ...entry,
          schoolEntries: updatedSchoolEntries
        };
      }

      return entry;
    });

    onTournamentUpdate({ ...tournament, entries: updatedEntries });
    toast({
      title: "Dropped as Partner",
      description: `You have been removed from all partnerships for ${tournament.name}.`
    });
  };

  return (
    <Card className={cn(
        "flex flex-col transition-all",
        (userEntry && !userEntry.dropped) && "bg-primary/10",
        (!userEntry && partnershipInfo) && "bg-blue-50 dark:bg-blue-900/20",
        userEntry?.dropped && "bg-orange-50 dark:bg-orange-900/20 opacity-90",
        registrationClosed && !userEntry && !partnershipInfo && "bg-red-50 dark:bg-red-900/30 opacity-80"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-headline">{tournament.name}</CardTitle>
            <div className="flex flex-wrap gap-1 justify-end items-center">
              {userEntry && !userEntry.dropped && <Badge variant="secondary" className={cn(registrationClosed ? "bg-gray-200 text-gray-600" : "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800")}><CheckCircle className="mr-1 h-3 w-3" />Registered</Badge>}
              {!userEntry && partnershipInfo && <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800"><CheckCircle className="mr-1 h-3 w-3" />Partner</Badge>}
              {userEntry?.dropped && <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800">Dropped</Badge>}
              {user?.role === 'admin' && (
                <Link href={`/dashboard/tournaments/${tournament.id}`}>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-1 h-3 w-3" />
                    Manage
                  </Button>
                </Link>
              )}
            </div>
        </div>
        <CardDescription>
          {format(new Date(tournament.date), "EEEE, MMMM d, yyyy")}
          {tournament.leaveTime && <span className="ml-2">• Leave: {tournament.leaveTime}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col gap-4">
        {tournament.registrationCloseDate && (
          <div className={cn("flex items-center text-sm", registrationClosed ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Registration Closes: {format(new Date(tournament.registrationCloseDate), "MMMM d, yyyy")}</span>
          </div>
        )}
        {tournament.notes && (
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Notes:</p>
            <p className="pl-2 border-l-2 border-primary">{tournament.notes}</p>
          </div>
        )}
        {userEntry?.dropped && (
          <div className="text-sm text-orange-700 dark:text-orange-400">
            <p className="font-medium mb-1">Status: Dropped</p>
            <p className="text-xs text-muted-foreground">
              You dropped from this tournament on {format(new Date(userEntry.droppedAt || ''), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        )}
        {userEntry && !userEntry.dropped && ((userEntry.events && userEntry.events.length > 0) || (userEntry.schoolEntries && userEntry.schoolEntries.some(se => se.events.length > 0))) && (
          <div className="text-sm">
            <p className="font-medium mb-2 text-green-700 dark:text-green-400">Your Registration:</p>
            {tournament.isSwing && userEntry.schoolEntries ? (
              <div className="space-y-3">
                {userEntry.schoolEntries.filter(se => se.events.length > 0).map(schoolEntry => (
                  <div key={schoolEntry.school} className="space-y-2">
                    <p className="font-semibold text-sm text-primary">{schoolEntry.school}</p>
                    {schoolEntry.events.map(event => {
                      const partnership = schoolEntry.partnerships.find(p => p.event === event);
                      return (
                        <div key={event} className="pl-2 border-l-2 border-green-500/30">
                          <p className="font-medium text-sm">{event}</p>
                          {partnership && partnership.partnerNames && partnership.partnerNames.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Partner{partnership.partnerNames.length > 1 ? 's' : ''}: {partnership.partnerNames.join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {userEntry.events.map(event => {
                  const partnership = userEntry.partnerships.find(p => p.event === event);
                  return (
                    <div key={event} className="pl-2 border-l-2 border-green-500/30">
                      <p className="font-medium text-sm">{event}</p>
                      {partnership && partnership.partnerNames && partnership.partnerNames.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Partner{partnership.partnerNames.length > 1 ? 's' : ''}: {partnership.partnerNames.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {partnershipInfo && (
          <div className="text-sm">
            <p className="font-medium mb-2 text-blue-700 dark:text-blue-400">Registered as Partner:</p>
            {tournament.isSwing ? (
              <div className="space-y-3">
                {[...new Set(partnershipInfo.map(p => p.school))].map(school => {
                  const schoolPartnerships = partnershipInfo.filter(p => p.school === school);
                  return (
                    <div key={school} className="space-y-2">
                      <p className="font-semibold text-sm text-primary">{school}</p>
                      {schoolPartnerships.map(partnership => (
                        <div key={partnership.event} className="pl-2 border-l-2 border-blue-500/30">
                          <p className="font-medium text-sm">{partnership.event}</p>
                          <p className="text-xs text-muted-foreground">
                            With: {partnership.partnerName}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {partnershipInfo.map(partnership => (
                  <div key={partnership.event} className="pl-2 border-l-2 border-blue-500/30">
                    <p className="font-medium text-sm">{partnership.event}</p>
                    <p className="text-xs text-muted-foreground">
                      With: {partnership.partnerName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
         <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {tournament.webpageUrl && (
                    <Button variant="outline" size="sm" asChild>
                        <a href={tournament.webpageUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-3 w-3"/> Webpage
                        </a>
                    </Button>
                )}
                {tournament.scheduleUrl && (
                    <Button variant="outline" size="sm" asChild>
                        <a href={tournament.scheduleUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-3 w-3"/> Schedule
                        </a>
                    </Button>
                )}
            </div>
         </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="flex-1"
              disabled={(registrationClosed && !userEntry) || userEntry?.dropped}
              variant={userEntry?.dropped ? "outline" : "default"}
            >
              {userEntry?.dropped
                ? 'Dropped'
                : registrationClosed
                  ? (userEntry || partnershipInfo ? 'Update Entry' : 'Registration Closed')
                  : (userEntry || partnershipInfo ? 'Update Entry' : 'Sign Up')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {userEntry || partnershipInfo ? 'Update Entry' : 'Sign Up'} for {tournament.name}
              </DialogTitle>
              <DialogDescription>
                {!userEntry && partnershipInfo ? (
                  <>
                    You're already registered as a partner. {tournament.isSwing
                      ? "Add up to 3 individual events per school that you'd like to compete in. Note: Maximum 1 debate event per school, and you cannot enter both Foreign and Domestic Extemp at the same school."
                      : "Add up to 3 individual events that you'd like to compete in. Note: Maximum 1 debate event, and you cannot enter both Foreign and Domestic Extemp."}
                  </>
                ) : tournament.isSwing
                  ? "Select up to 3 events per school. Partnered events require a partner. Note: Maximum 1 debate event per school, and you cannot enter both Foreign and Domestic Extemp at the same school."
                  : "Select up to 3 events. Partnered events require a partner. Note: Maximum 1 debate event, and you cannot enter both Foreign and Domestic Extemp."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-6">
                {tournament.isSwing && tournament.schools ? (
                  <SwingTournamentForm
                    form={form}
                    schools={tournament.schools}
                    allUsers={allUsers}
                    currentUserId={user?.id}
                  />
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="events"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Events</FormLabel>
                          <MultiSelect
                            options={events.map(e => ({ label: e, value: e }))}
                            onValueChange={field.onChange}
                            value={field.value}
                            placeholder="Select up to 3 events..."
                            maxCount={3}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {partnerships && partnerships.length > 0 && (
                      <div className="space-y-4 rounded-md border p-4">
                        <h4 className="font-medium">Partnered Events</h4>
                         {partnerships.map((partnership, index) => {
                           const isWsd = partnership.event === "World Schools Debate (WSD)";
                           return (
                             <FormField
                                key={partnership.event}
                                control={form.control}
                                name={`partnerships.${index}.partnerIds`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{partnership.event}</FormLabel>
                                        {isWsd ? (
                                            <MultiSelect
                                                options={(allUsers || []).filter(u => u.id !== user?.id).map(u => ({label: u.name, value: u.id}))}
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                placeholder="Select up to 4 teammates..."
                                                maxCount={4}
                                            />
                                        ) : (
                                            <Select onValueChange={(value) => field.onChange([value])} value={field.value?.[0] || ''}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                    <SelectValue placeholder="Select a partner" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(allUsers || []).filter(u => u.id !== user?.id).map(u => (
                                                    <SelectItem key={u.id} value={u.id}>
                                                        {u.name}
                                                    </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                              />
                           )
                         })}
                      </div>
                    )}
                  </>
                )}
                <DialogFooter>
                  <Button type="submit">Submit Entry</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        {userEntry && !userEntry.dropped && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Drop
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Drop from Tournament?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to drop from {tournament.name}? Your registration will be marked as dropped but not deleted. You can update your entry later if needed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDrop} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Drop Tournament
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {partnershipInfo && !userEntry?.dropped && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Drop as Partner
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Drop as Partner?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to drop as a partner from {tournament.name}? You will be removed from all partnerships, but the primary entry holder(s) can add a new partner.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePartnerDrop} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Drop as Partner
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
