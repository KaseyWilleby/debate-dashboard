
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import React from "react";
import type { Session, DebateFormat, SpeechStance, PracticeRoom, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useAuth } from "@/contexts/auth-context";

const sessionSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string(),
  date: z.date({ required_error: "A date is required." }),
  time: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s(AM|PM)$/,
      "Invalid time format (e.g., 02:00 PM)."
    ),
  room: z.enum(["Room A", "Room B", "Room C"]).optional(),
  isPracticeRound: z.boolean().default(false),
  debateFormat: z.enum(["LD", "PF", "CX", "WSD"]).optional(),
  hostStance: z.enum(["affirmative", "negative"]).optional(),
  hostPartnerId: z.string().optional(),
});

interface CreateSessionDialogProps {
  children: React.ReactNode;
  sessionToEdit?: Session;
  onSessionCreated?: (session: Session) => void;
  onSessionUpdated?: (session: Session) => void;
}

export default function CreateSessionDialog({
  children,
  sessionToEdit,
  onSessionCreated,
  onSessionUpdated,
}: CreateSessionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const [isPracticeRoundChecked, setIsPracticeRoundChecked] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState<string | undefined>(undefined);

  // Fetch all users for partner selection
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const form = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date(),
      time: "10:00 AM",
      room: undefined,
      isPracticeRound: false,
      debateFormat: undefined,
      hostStance: undefined,
      hostPartnerId: undefined,
    },
  });

  const isEditing = !!sessionToEdit;

  React.useEffect(() => {
    if (open) {
      if (isEditing && sessionToEdit) {
        const isPractice = sessionToEdit.isPracticeRound || false;
        setIsPracticeRoundChecked(isPractice);
        setSelectedFormat(sessionToEdit.debateFormat);
        form.reset({
          title: sessionToEdit.title,
          description: sessionToEdit.description,
          date: new Date(sessionToEdit.date),
          time: sessionToEdit.time,
          room: sessionToEdit.room,
          isPracticeRound: isPractice,
          debateFormat: sessionToEdit.debateFormat,
          hostStance: sessionToEdit.hostStance,
          hostPartnerId: sessionToEdit.hostPartnerId || undefined,
        });
      } else {
        setIsPracticeRoundChecked(false);
        setSelectedFormat(undefined);
        form.reset({
          title: "",
          description: "",
          date: new Date(),
          time: "10:00 AM",
          room: undefined,
          isPracticeRound: false,
          debateFormat: undefined,
          hostStance: undefined,
          hostPartnerId: undefined,
        });
      }
    }
  }, [sessionToEdit, form, open, isEditing]);

  async function onSubmit(values: z.infer<typeof sessionSchema>) {
    if (!firestore || !user) return;

    // Filter out undefined values (Firestore doesn't accept undefined)
    const sessionData = Object.fromEntries(
      Object.entries({
        ...values,
        date: format(values.date, "yyyy-MM-dd"),
      }).filter(([_, value]) => value !== undefined)
    );

    if (isEditing && sessionToEdit) {
      const updatedSession: Session = {
        ...sessionToEdit,
        ...sessionData,
        status:
          !!sessionToEdit.hostId && !!sessionToEdit.clientId
            ? "booked"
            : "available",
      };
      onSessionUpdated?.(updatedSession);
      toast({
        title: "Session Updated",
        description: "The session has been successfully updated.",
      });
    } else {
      // Create new session object and filter out undefined values
      const newSessionData = {
        ...sessionData,
        hostId: user?.id || null,
        clientId: null,
        status: "available",
        messages: [],
        lastMessageReadBy: [],
        cancellationReadBy: [],
      };

      // Filter out undefined values for Firestore
      const newSession = Object.fromEntries(
        Object.entries(newSessionData).filter(([_, value]) => value !== undefined)
      ) as Omit<Session, 'id'>;

      try {
        const sessionsCollection = collection(firestore, 'sessions');
        const docRef = await addDoc(sessionsCollection, newSession);

        // Create the complete session object with the Firestore-generated ID
        const createdSession: Session = {
          ...newSession,
          id: docRef.id,
        };

        // Notify parent component of the new session
        onSessionCreated?.(createdSession);

         toast({
            title: "Session Created",
            description: "The new session has been added to the dashboard.",
        });
      } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `sessions`,
            operation: 'create',
            requestResourceData: newSession
        }));
      }
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {isEditing ? "Edit Session" : "Create New Session"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this session."
              : "Fill in the details to create a new work session."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal w-full",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 02:00 PM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="room"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Practice Room (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a practice room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Room A">Room A</SelectItem>
                      <SelectItem value="Room B">Room B</SelectItem>
                      <SelectItem value="Room C">Room C</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPracticeRound"
              render={({ field }) => (
                <FormItem className="md:col-span-2 flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setIsPracticeRoundChecked(!!checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Mark as Practice Round
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      This session will be marked as a practice round for debate or speech events.
                    </p>
                  </div>
                </FormItem>
              )}
            />
            {isPracticeRoundChecked && (
              <>
                <FormField
                  control={form.control}
                  name="debateFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Debate Format</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedFormat(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select debate format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LD">Lincoln-Douglas (LD)</SelectItem>
                          <SelectItem value="PF">Public Forum (PF)</SelectItem>
                          <SelectItem value="CX">Policy/Cross-Examination (CX)</SelectItem>
                          <SelectItem value="WSD">World Schools Debate (WSD)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hostStance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Side</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your side" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="affirmative">Affirmative (Pro)</SelectItem>
                          <SelectItem value="negative">Negative (Con)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(selectedFormat === 'PF' || selectedFormat === 'CX') && (
                  <FormField
                    control={form.control}
                    name="hostPartnerId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Your Partner (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your partner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allUsers?.filter(u => u.id !== user?.id).map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
            <DialogFooter className="md:col-span-2 pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">
                {isEditing ? "Save Changes" : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
