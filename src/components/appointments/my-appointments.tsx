"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, updateDoc, doc, query, where, or } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, User, MapPin, FileText, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Workspace } from "@/lib/types";

export function MyAppointments() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [completingId, setCompletingId] = React.useState<string | null>(null);

  // Fetch appointments where user is attendee OR provider
  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(
      collection(firestore, 'appointments'),
      where('teamId', '==', user.teamId),
      or(
        where('attendeeId', '==', user.id),
        where('providerId', '==', user.id)
      )
    );
  }, [firestore, user]);

  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsQuery);

  // Fetch workspaces
  const workspacesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(
      collection(firestore, 'workspaces'),
      where('teamId', '==', user.teamId)
    );
  }, [firestore, user]);

  const { data: workspaces } = useCollection<Workspace>(workspacesQuery);

  const getWorkspaceName = (workspaceId?: string) => {
    if (!workspaceId) return "Any workspace";
    return workspaces?.find(w => w.id === workspaceId)?.name || "Unknown";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hour, min] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${min} ${ampm}`;
  };

  const isUpcoming = (appointment: Appointment) => {
    const today = new Date().toISOString().split('T')[0];
    return appointment.date >= today && appointment.status === 'booked';
  };

  const isPast = (appointment: Appointment) => {
    const today = new Date().toISOString().split('T')[0];
    return appointment.date < today || appointment.status === 'completed' || appointment.status === 'cancelled';
  };

  const upcomingAppointments = React.useMemo(() => {
    return appointments?.filter(isUpcoming).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    }) || [];
  }, [appointments]);

  const pastAppointments = React.useMemo(() => {
    return appointments?.filter(isPast).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date); // Reverse order for past
      if (dateCompare !== 0) return dateCompare;
      return b.startTime.localeCompare(a.startTime);
    }) || [];
  }, [appointments]);

  const handleCancel = async (appointment: Appointment) => {
    if (!firestore || !user) return;

    const isProvider = appointment.providerId === user.id;
    const confirmMsg = isProvider
      ? `Are you sure you want to cancel this appointment with ${appointment.attendeeName}?`
      : `Are you sure you want to cancel this appointment with ${appointment.providerName}?`;

    if (!confirm(confirmMsg)) return;

    setCancellingId(appointment.id);
    try {
      await updateDoc(doc(firestore, 'appointments', appointment.id), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: user.id,
      });

      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled.",
      });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleMarkComplete = async (appointment: Appointment) => {
    if (!firestore || !user) return;

    // Only providers can mark as complete
    if (appointment.providerId !== user.id) return;

    setCompletingId(appointment.id);
    try {
      await updateDoc(doc(firestore, 'appointments', appointment.id), {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      toast({
        title: "Appointment Completed",
        description: "The appointment has been marked as completed.",
      });
    } catch (error) {
      console.error("Error completing appointment:", error);
      toast({
        title: "Error",
        description: "Failed to mark appointment as complete. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingId(null);
    }
  };

  const renderAppointmentCard = (appointment: Appointment, showActions = false) => {
    const isProvider = appointment.providerId === user?.id;
    const otherPerson = isProvider ? appointment.attendeeName : appointment.providerName;

    return (
      <Card key={appointment.id} className="relative">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatDate(appointment.date)}</span>
                <Badge variant={
                  appointment.status === 'booked' ? 'default' :
                  appointment.status === 'completed' ? 'secondary' :
                  'outline'
                }>
                  {appointment.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {isProvider ? (
                    <>Appointment with <strong>{otherPerson}</strong></>
                  ) : (
                    <>Meeting with <strong>{otherPerson}</strong></>
                  )}
                </span>
              </div>
              {appointment.workspaceId && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{getWorkspaceName(appointment.workspaceId)}</span>
                </div>
              )}
              {appointment.notes && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground italic">{appointment.notes}</span>
                </div>
              )}
            </div>
            {showActions && (
              <div className="flex flex-col gap-2">
                {isProvider && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkComplete(appointment)}
                    disabled={completingId === appointment.id}
                  >
                    {completingId === appointment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Complete
                      </>
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCancel(appointment)}
                  disabled={cancellingId === appointment.id}
                >
                  {cancellingId === appointment.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Appointments</CardTitle>
        <CardDescription>
          View and manage your appointments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center p-12 border border-dashed rounded-lg">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map(apt => renderAppointmentCard(apt, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastAppointments.length === 0 ? (
              <div className="text-center p-12 border border-dashed rounded-lg">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No past appointments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastAppointments.map(apt => renderAppointmentCard(apt, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
