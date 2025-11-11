
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Loader2, MapPin } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { SessionMessaging } from "@/components/dashboard/session-messaging";
import BookSessionDialog from "@/components/dashboard/book-session-dialog";
import { cn, getRoleBasedColor } from "@/lib/utils";
import type { Session, SessionStatus, User, Message } from "@/lib/types";
import { useEffect, useMemo } from "react";
import React from "react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, updateDoc, collection } from 'firebase/firestore';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useAuth } from "@/contexts/auth-context";


const statusColors: Record<SessionStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800",
  booked: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800",
  completed: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  cancelled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
};

export default function SessionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;

  const sessionDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'sessions', id) : null), [firestore, id]);
  const { data: session, isLoading: isSessionLoading } = useDoc<Session>(sessionDocRef);

  const hostId = session?.hostId;
  const clientId = session?.clientId;

  const hostDocRef = useMemoFirebase(() => (firestore && hostId ? doc(firestore, 'users', hostId) : null), [firestore, hostId]);
  const { data: host, isLoading: isHostLoading } = useDoc<User>(hostDocRef);

  const clientDocRef = useMemoFirebase(() => (firestore && clientId ? doc(firestore, 'users', clientId) : null), [firestore, clientId]);
  const { data: client, isLoading: isClientLoading } = useDoc<User>(clientDocRef);

  const hostPartnerId = session?.hostPartnerId;
  const clientPartnerId = session?.clientPartnerId;

  const hostPartnerDocRef = useMemoFirebase(() => (firestore && hostPartnerId ? doc(firestore, 'users', hostPartnerId) : null), [firestore, hostPartnerId]);
  const { data: hostPartner } = useDoc<User>(hostPartnerDocRef);

  const clientPartnerDocRef = useMemoFirebase(() => (firestore && clientPartnerId ? doc(firestore, 'users', clientPartnerId) : null), [firestore, clientPartnerId]);
  const { data: clientPartner } = useDoc<User>(clientPartnerDocRef);

  const usersForMessaging = useMemo(() => {
    const participants: User[] = [];
    if (host) participants.push(host);
    if (client) participants.push(client);
    if (user && !participants.some(p => p.id === user.id)) {
        participants.push(user);
    }
    return participants;
  }, [host, client, user]);

  // Fetch all users for partner selection
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: allUsers } = useCollection<User>(usersQuery);

  const [isBookingDialogOpen, setIsBookingDialogOpen] = React.useState(false);

  // Mark notifications as read when entering the page
  useEffect(() => {
    if (session && firestore && userId) {
        const updateData: Partial<Session> = {};
        let needsUpdate = false;

        if (session.status === 'cancelled' && !(session.cancellationReadBy || []).includes(userId)) {
            updateData.cancellationReadBy = [...(session.cancellationReadBy || []), userId];
            needsUpdate = true;
        }
        
        const lastMessage = session.messages?.[session.messages.length - 1];
        if (lastMessage && lastMessage.senderId !== userId && !(session.lastMessageReadBy || []).includes(userId)) {
            updateData.lastMessageReadBy = [...(session.lastMessageReadBy || []), userId];
            needsUpdate = true;
        }

        if (needsUpdate) {
            const sessionDocRef = doc(firestore, 'sessions', session.id);
            updateDoc(sessionDocRef, updateData).catch(error => {
                // We don't need to show an error for this background task
                console.error("Failed to mark notification as read:", error);
            });
        }
    }
  }, [session, firestore, userId]);

  const isLoading = isSessionLoading || isAuthLoading || isHostLoading || isClientLoading;

  if (isLoading) {
      return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!session) {
    notFound();
  }

  const canBook = session.status === 'available' && userId !== session.hostId;
  const canCancelBooking = userId === session.clientId && session.status === 'booked';
  const canCancelSession = (userId === session.hostId || userRole === 'admin') && (session.status === 'available' || session.status === 'booked');

  const onSessionUpdated = (dataToUpdate: Partial<Session>) => {
    if (!firestore) return;
    const sessionDocRef = doc(firestore, 'sessions', session.id);
    updateDoc(sessionDocRef, dataToUpdate).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: sessionDocRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate
      }))
    });
  };

  const handleBookSession = () => {
    if (!canBook || !userId) return;

    // If it's a partnered format and a practice round, show the partner selection dialog
    if (session.isPracticeRound && (session.debateFormat === 'PF' || session.debateFormat === 'CX')) {
      setIsBookingDialogOpen(true);
    } else {
      // Book immediately without partner
      confirmBooking();
    }
  };

  const confirmBooking = (partnerId?: string) => {
    if (!userId) return;
    onSessionUpdated({
      clientId: userId,
      clientPartnerId: partnerId || null,
      status: 'booked'
    });
    toast({ title: 'Session Booked!', description: 'The session has been added to your "My Sessions".' });
  };

  const handleCancelBooking = () => {
    if (!canCancelBooking) return;
    onSessionUpdated({ clientId: null, clientPartnerId: null, status: 'available' });
    toast({ title: 'Booking Cancelled', description: 'The session is now available again.' });
  };
  
  const handleCancelSession = async () => {
    if (!canCancelSession || !firestore || !userId) return;
    
    onSessionUpdated({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReadBy: [userId], // The user cancelling it has "read" it
    });

    toast({
      title: 'Session Cancelled',
      variant: 'destructive',
    });
  };

  const handleMessageSent = async (message: Message) => {
    if (!session || !userId || !firestore) return;
    const updatedMessages = [...(session.messages || []), message];
    onSessionUpdated({ 
      messages: updatedMessages,
      lastMessageReadBy: [userId], // The sender has read their own message.
    });
  };

  const UserInfo = ({ participant }: { participant: User | undefined }) => {
    if (!participant) return <div className="text-muted-foreground text-sm">Not assigned.</div>;
    
    const initials = participant.name.split(" ").map(n => n[0]).join("");
    return (
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={cn(getRoleBasedColor(participant.role))}>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{participant.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{participant.role}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/my-sessions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Sessions
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <CardTitle className="font-headline text-2xl">{session.title}</CardTitle>
                        <Badge className={cn("capitalize", statusColors[session.status])}>{session.status}</Badge>
                    </div>
                    <p className="text-muted-foreground pt-2">{session.description}</p>
                </CardHeader>
                <CardContent>
                    <SessionMessaging session={session} users={usersForMessaging || []} onMessageSent={handleMessageSent} />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-headline text-lg">Session Details</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>{new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>{session.time}</span>
              </div>
              {session.room && (
                <div className="flex items-center">
                  <MapPin className="mr-3 h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{session.room}</span>
                </div>
              )}
            </CardContent>
             {(canBook || canCancelBooking || canCancelSession) && (
              <CardFooter className="bg-muted/50 p-4">
                {canBook && (
                  <Button className="w-full" onClick={handleBookSession}>Book Session</Button>
                )}
                {canCancelBooking && (
                   <Button variant="destructive" className="w-full" onClick={handleCancelBooking}>Cancel Booking</Button>
                )}
                {canCancelSession && (
                  <Button variant="destructive" className="w-full" onClick={handleCancelSession}>
                    Cancel Session
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
           <Card>
            <CardHeader><CardTitle className="font-headline text-lg">Participants</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">HOST</p>
                  <UserInfo participant={host} />
                  {session.hostPartnerId && (session.debateFormat === 'PF' || session.debateFormat === 'CX') && hostPartner && (
                    <div className="ml-14 mt-2 flex items-center gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn(getRoleBasedColor(hostPartner.role))}>
                          {hostPartner.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{hostPartner.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{hostPartner.role} (Partner)</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">CLIENT</p>
                  <UserInfo participant={client} />
                  {session.clientPartnerId && (session.debateFormat === 'PF' || session.debateFormat === 'CX') && clientPartner && (
                    <div className="ml-14 mt-2 flex items-center gap-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn(getRoleBasedColor(clientPartner.role))}>
                          {clientPartner.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{clientPartner.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{clientPartner.role} (Partner)</p>
                      </div>
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <BookSessionDialog
        open={isBookingDialogOpen}
        onOpenChange={setIsBookingDialogOpen}
        session={session}
        users={allUsers || []}
        currentUserId={userId || ''}
        onConfirmBooking={confirmBooking}
      />
    </div>
  );
}
