
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Edit, User as UserIcon, Users, MapPin, Gavel } from "lucide-react";
import type { Session, SessionStatus, User } from "@/lib/types";
import { cn, getRoleBasedColor } from "@/lib/utils";
import Link from "next/link";
import CreateSessionDialog from "./create-session-dialog";
import BookSessionDialog from "./book-session-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import React from "react";

interface SessionCardProps {
  session: Session;
  onSessionUpdated: (session: Session) => void;
  users: User[];
}

const statusColors: Record<SessionStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800",
  booked: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800",
  completed: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  cancelled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
};

export default function SessionCard({ session, onSessionUpdated, users }: SessionCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const host = users.find((u) => u.id === session.hostId);
  const client = users.find((u) => u.id === session.clientId);
  const hostPartner = users.find((u) => u.id === session.hostPartnerId);
  const clientPartner = users.find((u) => u.id === session.clientPartnerId);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = React.useState(false);

  const handleBookSession = () => {
    if (!user || user.id === session.hostId) return;

    // If it's a partnered format and a practice round, show the partner selection dialog
    if (session.isPracticeRound && (session.debateFormat === 'PF' || session.debateFormat === 'CX')) {
      setIsBookingDialogOpen(true);
    } else {
      // Book immediately without partner
      confirmBooking();
    }
  };

  const confirmBooking = (partnerId?: string) => {
    if (!user) return;
    onSessionUpdated({
      ...session,
      clientId: user.id,
      clientPartnerId: partnerId || null,
      status: 'booked'
    });
    toast({ title: 'Session Booked!', description: 'The session has been added to your "My Sessions".' });
  };
  
  const handleCancelBooking = () => {
    if (!user || user.id !== session.clientId) return;
    onSessionUpdated({ ...session, clientId: null, clientPartnerId: null, status: 'available' });
    toast({ title: 'Booking Cancelled', description: 'The session is now available again.' });
  };

  const handleCancelSession = async () => {
    if (!user || (user.id !== session.hostId && user.role !== 'admin') || (session.status !== 'available' && session.status !== 'booked')) return;

    onSessionUpdated({
      ...session,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReadBy: [user.id],
    });

    toast({
      title: 'Session Cancelled',
      variant: 'destructive',
    });
  };

  const handleStartSession = () => {
    // Navigate to debate events page to create practice round from session
    router.push(`/dashboard/debate-events?tab=practice-rounds&createFromSession=${session.id}`);
  };

  const renderActionButtons = () => {
    if (!user) return null;
    if (session.status === 'cancelled' || session.status === 'completed') {
        return <Button asChild size="sm" variant="outline" disabled>View Details</Button>;
    }

    const isUserParticipant = session.hostId === user.id || session.clientId === user.id;
    const canStartSession = session.hostId && session.clientId && session.isPracticeRound && (isUserParticipant || user.role === 'admin');

    const canBook = (user.role === 'varsity' || user.role === 'novice') && session.status === 'available' && user.id !== session.hostId;
    const isClientOnBooked = user.id === session.clientId && session.status === 'booked';
    const canCancelSession = (user.id === session.hostId || user.role === 'admin') && (session.status === 'available' || session.status === 'booked');

    return (
      <>
        {user.role === 'admin' && (
           <CreateSessionDialog sessionToEdit={session} onSessionUpdated={onSessionUpdated}>
             <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
           </CreateSessionDialog>
        )}
        {canStartSession && (
          <Button size="sm" variant="default" onClick={handleStartSession}>
            <Gavel className="mr-2 h-4 w-4" />
            Start Session
          </Button>
        )}
        {isClientOnBooked && (
          <Button variant="destructive" size="sm" onClick={handleCancelBooking}>
            Cancel Booking
          </Button>
        )}
         {canCancelSession && (
          <Button variant="destructive" size="sm" onClick={handleCancelSession}>
            Cancel Session
          </Button>
        )}
        {canBook && (
          <Button size="sm" onClick={handleBookSession}>Book Session</Button>
        )}
        <Button asChild size="sm" variant={(canBook || isClientOnBooked || canCancelSession) ? 'outline' : 'default'} disabled={user.role !== 'admin' && !isUserParticipant && session.status !== 'available'}>
          <Link href={`/dashboard/sessions/${session.id}`}>View Details</Link>
        </Button>
      </>
    );
  };

  const UserAvatar = ({ userId, type }: { userId: string | null; type: 'Host' | 'Client' }) => {
    const participant = users.find(u => u.id === userId);
    if (!participant) return (
        <div className="flex items-center gap-2 text-muted-foreground">
            <Avatar className="h-6 w-6"><AvatarFallback><UserIcon size={14}/></AvatarFallback></Avatar>
            <span className="text-xs italic">{type} unassigned</span>
        </div>
    );
    const initials = participant.name.split(" ").map(n => n[0]).join("");
    return (
        <div className="flex items-center gap-2" title={participant.name}>
            <Avatar className="h-6 w-6">
                <AvatarFallback className={cn(getRoleBasedColor(participant.role))}>{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{participant.name}</span>
        </div>
    );
  };

  return (
    <Card className={cn(
        "flex flex-col hover:shadow-md transition-shadow duration-300",
        session.status === 'booked' && 'bg-purple-50 dark:bg-purple-900/30 border-white dark:border-gray-900',
        session.status === 'cancelled' && 'bg-red-50 dark:bg-red-900/30'
    )}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-headline text-xl leading-tight">{session.title}</CardTitle>
          <Badge className={cn("capitalize flex-shrink-0", statusColors[session.status])}>{session.status}</Badge>
        </div>
        <CardDescription className="line-clamp-2 pt-1">{session.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{new Date(session.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{session.time}</span>
        </div>
        {session.room && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="font-medium">{session.room}</span>
          </div>
        )}
         <div className="flex items-start text-sm text-muted-foreground">
          <Users className="mr-2 h-4 w-4 mt-1 flex-shrink-0" />
          <div className="flex flex-col gap-2">
             <div>
               <UserAvatar userId={session.hostId} type="Host" />
               {session.hostPartnerId && (session.debateFormat === 'PF' || session.debateFormat === 'CX') && hostPartner && (
                 <div className="ml-8 mt-1 flex items-center gap-2">
                   <Avatar className="h-5 w-5">
                     <AvatarFallback className={cn(getRoleBasedColor(hostPartner.role))}>
                       {hostPartner.name.split(" ").map(n => n[0]).join("")}
                     </AvatarFallback>
                   </Avatar>
                   <span className="text-xs truncate">{hostPartner.name} (Partner)</span>
                 </div>
               )}
             </div>
             <div>
               <UserAvatar userId={session.clientId} type="Client" />
               {session.clientPartnerId && (session.debateFormat === 'PF' || session.debateFormat === 'CX') && clientPartner && (
                 <div className="ml-8 mt-1 flex items-center gap-2">
                   <Avatar className="h-5 w-5">
                     <AvatarFallback className={cn(getRoleBasedColor(clientPartner.role))}>
                       {clientPartner.name.split(" ").map(n => n[0]).join("")}
                     </AvatarFallback>
                   </Avatar>
                   <span className="text-xs truncate">{clientPartner.name} (Partner)</span>
                 </div>
               )}
             </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center items-center gap-2 bg-muted/50 p-4 mt-auto">
        {renderActionButtons()}
      </CardFooter>
      <BookSessionDialog
        open={isBookingDialogOpen}
        onOpenChange={setIsBookingDialogOpen}
        session={session}
        users={users}
        currentUserId={user?.id || ''}
        onConfirmBooking={confirmBooking}
      />
    </Card>
  );
}
