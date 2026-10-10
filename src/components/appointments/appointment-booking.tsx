"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, addDoc, updateDoc, doc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, Clock, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, AppointmentWindow, OfficerAvailability, Workspace, User as UserType } from "@/lib/types";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface GeneratedSlot {
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  providerId: string;
  providerName: string;
  windowId: string;
  windowTitle: string;
  workspaceId?: string;
  availabilityId?: string;
  existingAppointment?: Appointment;
}

export function AppointmentBooking() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [currentWeekStart, setCurrentWeekStart] = React.useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });

  const [selectedSlot, setSelectedSlot] = React.useState<GeneratedSlot | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = React.useState(false);
  const [bookingNotes, setBookingNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filters
  const [filterProvider, setFilterProvider] = React.useState<string>("all");

  // Fetch appointment windows
  const windowsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(
      collection(firestore, 'appointmentWindows'),
      where('teamId', '==', user.teamId),
      where('isActive', '==', true)
    );
  }, [firestore, user]);

  const { data: windows } = useCollection<AppointmentWindow>(windowsQuery);

  // Fetch officer availability
  const availabilityQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(
      collection(firestore, 'officerAvailability'),
      where('teamId', '==', user.teamId),
      where('isActive', '==', true)
    );
  }, [firestore, user]);

  const { data: officerAvailability } = useCollection<OfficerAvailability>(availabilityQuery);

  // Fetch existing appointments for current week
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const appointmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    const startStr = currentWeekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];
    return query(
      collection(firestore, 'appointments'),
      where('teamId', '==', user.teamId),
      where('date', '>=', startStr),
      where('date', '<=', endStr)
    );
  }, [firestore, user, currentWeekStart]);

  const { data: appointments, isLoading } = useCollection<Appointment>(appointmentsQuery);

  // Fetch workspaces
  const workspacesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(
      collection(firestore, 'workspaces'),
      where('teamId', '==', user.teamId),
      where('isActive', '==', true)
    );
  }, [firestore, user]);

  const { data: workspaces } = useCollection<Workspace>(workspacesQuery);

  // Fetch all team users for provider names
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(
      collection(firestore, 'users'),
      where('teamId', '==', user.teamId)
    );
  }, [firestore, user]);

  const { data: teamUsers } = useCollection<UserType>(usersQuery);

  // Generate slots for the current week
  const generatedSlots = React.useMemo(() => {
    if (!windows || !officerAvailability || !user) return [];

    const slots: GeneratedSlot[] = [];
    const weekDates: Date[] = [];

    // Get all 7 days of the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      weekDates.push(date);
    }

    // For each day of the week
    weekDates.forEach(date => {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      // Find windows for this day
      const dayWindows = windows.filter(w => w.dayOfWeek === dayOfWeek);

      dayWindows.forEach(window => {
        // Check if window is valid for this date
        if (window.validFrom && dateStr < window.validFrom) return;
        if (window.validUntil && dateStr > window.validUntil) return;

        // Find officer availability for this window
        const windowAvailability = officerAvailability.filter(
          a => a.appointmentWindowId === window.id
        );

        windowAvailability.forEach(avail => {
          // Generate time slots based on window duration
          const startParts = window.startTime.split(':');
          const endParts = window.endTime.split(':');
          let currentMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
          const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

          while (currentMinutes + window.duration <= endMinutes) {
            const slotStartHour = Math.floor(currentMinutes / 60);
            const slotStartMin = currentMinutes % 60;
            const slotEndMinutes = currentMinutes + window.duration;
            const slotEndHour = Math.floor(slotEndMinutes / 60);
            const slotEndMin = slotEndMinutes % 60;

            const startTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`;
            const endTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;

            // Check if appointment already exists
            const existingAppointment = appointments?.find(
              apt => apt.date === dateStr &&
                     apt.startTime === startTime &&
                     apt.providerId === avail.officerId &&
                     apt.appointmentWindowId === window.id
            );

            slots.push({
              date: dateStr,
              startTime,
              endTime,
              dayOfWeek,
              providerId: avail.officerId,
              providerName: avail.officerName,
              windowId: window.id,
              windowTitle: window.title,
              workspaceId: avail.workspaceId || window.workspaceId,
              availabilityId: avail.id,
              existingAppointment,
            });

            currentMinutes += window.duration;
          }
        });
      });
    });

    return slots;
  }, [windows, officerAvailability, appointments, currentWeekStart, user]);

  // Apply filters
  const filteredSlots = React.useMemo(() => {
    return generatedSlots.filter(slot => {
      if (filterProvider !== 'all' && slot.providerId !== filterProvider) return false;
      return true;
    });
  }, [generatedSlots, filterProvider]);

  // Group slots by provider
  const slotsByProvider = React.useMemo(() => {
    const grouped = new Map<string, GeneratedSlot[]>();
    filteredSlots.forEach(slot => {
      const existing = grouped.get(slot.providerId) || [];
      existing.push(slot);
      grouped.set(slot.providerId, existing);
    });
    // Sort each provider's slots by date and time
    grouped.forEach((slots, providerId) => {
      slots.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
    });
    return grouped;
  }, [filteredSlots]);

  // Get unique providers with their names
  const providers = React.useMemo(() => {
    const uniqueIds = new Set(generatedSlots.map(s => s.providerId));
    return Array.from(uniqueIds).map(id => {
      const slot = generatedSlots.find(s => s.providerId === id);
      return { id, name: slot?.providerName || 'Unknown' };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [generatedSlots]);

  const handlePreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const handleSlotClick = (slot: GeneratedSlot) => {
    if (!user) return;

    // If slot is already booked, show details but don't allow booking
    if (slot.existingAppointment) {
      if (slot.existingAppointment.status === 'available') {
        // Allow booking
        setSelectedSlot(slot);
        setIsBookingDialogOpen(true);
      } else {
        // Just show it's booked
        toast({
          title: "Slot Unavailable",
          description: "This time slot is already booked.",
          variant: "default",
        });
      }
      return;
    }

    // Slot doesn't exist yet, allow booking
    setSelectedSlot(slot);
    setIsBookingDialogOpen(true);
  };

  const findAvailableWorkspace = async (date: string, startTime: string, endTime: string): Promise<string | undefined> => {
    if (!firestore || !user || !workspaces || workspaces.length === 0) return undefined;

    // Get all appointments for this date and time range
    const conflictingAppointments = appointments?.filter(apt =>
      apt.date === date &&
      apt.status === 'booked' &&
      // Check for time overlap
      ((apt.startTime >= startTime && apt.startTime < endTime) ||
       (apt.endTime > startTime && apt.endTime <= endTime) ||
       (apt.startTime <= startTime && apt.endTime >= endTime))
    ) || [];

    // Get workspace IDs that are already booked
    const bookedWorkspaceIds = new Set(
      conflictingAppointments
        .map(apt => apt.workspaceId)
        .filter(id => id !== undefined) as string[]
    );

    // Find first available workspace
    const availableWorkspace = workspaces.find(ws => !bookedWorkspaceIds.has(ws.id));
    return availableWorkspace?.id;
  };

  const handleBookAppointment = async () => {
    if (!firestore || !user || !selectedSlot) return;

    setIsSubmitting(true);
    try {
      // Auto-assign an available workspace
      const assignedWorkspaceId = await findAvailableWorkspace(
        selectedSlot.date,
        selectedSlot.startTime,
        selectedSlot.endTime
      );

      if (!assignedWorkspaceId) {
        toast({
          title: "No Rooms Available",
          description: "All rooms are booked for this time slot. Please try a different time.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (selectedSlot.existingAppointment && selectedSlot.existingAppointment.status === 'available') {
        // Update existing appointment
        const updateData: any = {
          status: 'booked',
          attendeeId: user.id,
          attendeeName: user.name || user.email,
          workspaceId: assignedWorkspaceId,
          bookedAt: new Date().toISOString(),
        };

        // Only add notes field if it has a value
        if (bookingNotes.trim()) {
          updateData.notes = bookingNotes.trim();
        }

        await updateDoc(doc(firestore, 'appointments', selectedSlot.existingAppointment.id), updateData);
      } else {
        // Create new appointment
        const appointmentData: any = {
          teamId: user.teamId,
          appointmentWindowId: selectedSlot.windowId,
          workspaceId: assignedWorkspaceId,
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          type: 'officer', // Could be dynamic based on provider role
          status: 'booked',
          providerId: selectedSlot.providerId,
          providerName: selectedSlot.providerName,
          attendeeId: user.id,
          attendeeName: user.name || user.email,
          createdAt: new Date().toISOString(),
          bookedAt: new Date().toISOString(),
        };

        // Only add notes field if it has a value
        if (bookingNotes.trim()) {
          appointmentData.notes = bookingNotes.trim();
        }

        await addDoc(collection(firestore, 'appointments'), appointmentData);
      }

      // Create notification for provider
      const assignedRoom = workspaces?.find(w => w.id === assignedWorkspaceId);
      const formattedDate = new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      try {
        console.log('[Booking] Creating notification for provider:', selectedSlot.providerId);
        await addDoc(collection(firestore, 'users', selectedSlot.providerId, 'notifications'), {
          type: 'booking',
          title: 'New Appointment Booked',
          message: `${user.name || user.email} booked a session with you on ${formattedDate} at ${formatTime(selectedSlot.startTime)} in ${assignedRoom?.name || 'a room'}`,
          relatedUrl: `/${user.teamId}/dashboard/my-sessions`,
          timestamp: new Date().toISOString(),
          isRead: false,
        });
        console.log('[Booking] Notification created successfully');
      } catch (notifError) {
        console.error('[Booking] Failed to create notification:', notifError);
        // Don't fail the booking if notification fails
      }

      toast({
        title: "Appointment Booked",
        description: `Your appointment with ${selectedSlot.providerName} has been booked in ${assignedRoom?.name || 'a room'}.`,
      });

      setIsBookingDialogOpen(false);
      setBookingNotes("");
      setSelectedSlot(null);
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWorkspaceName = (workspaceId?: string) => {
    if (!workspaceId) return "Any workspace";
    return workspaces?.find(w => w.id === workspaceId)?.name || "Unknown";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const formatTime = (time: string) => {
    const [hour, min] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${min} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Book Appointment</CardTitle>
          <CardDescription>
            Find and book available appointment slots
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Filter by Coach/Varsity Member</Label>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between border-b pb-4">
            <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Week
            </Button>
            <h3 className="font-semibold">
              {formatDate(currentWeekStart.toISOString().split('T')[0])} -{' '}
              {formatDate(weekEnd.toISOString().split('T')[0])}
            </h3>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              Next Week
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Slots Display - Grouped by Provider */}
          {filteredSlots.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No available appointments</p>
              <p className="text-sm text-muted-foreground">
                {generatedSlots.length === 0
                  ? "Coaches and varsity members haven't set their availability yet"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {Array.from(slotsByProvider.entries()).map(([providerId, providerSlots]) => {
                const providerName = providers.find(p => p.id === providerId)?.name || 'Unknown';

                return (
                  <div key={providerId} className="flex flex-col min-w-0 max-w-[200px]">
                    <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b mb-3">
                      <h4 className="font-semibold text-sm flex items-center gap-1.5 truncate">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{providerName}</span>
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {providerSlots.length} slot{providerSlots.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {providerSlots.map((slot, idx) => {
                        const isBooked = slot.existingAppointment && slot.existingAppointment.status !== 'available';
                        const isMyAppointment = slot.existingAppointment?.attendeeId === user?.id;
                        const slotDate = new Date(slot.date + 'T00:00:00');
                        const dayName = DAYS_OF_WEEK[slotDate.getDay()];

                        // Check if this is a new day (different from previous slot)
                        const prevSlot = idx > 0 ? providerSlots[idx - 1] : null;
                        const isNewDay = !prevSlot || prevSlot.date !== slot.date;

                        return (
                          <React.Fragment key={`${slot.date}-${slot.startTime}-${slot.providerId}-${idx}`}>
                            {isNewDay && idx > 0 && (
                              <div className="border-t my-2 pt-1">
                                <p className="text-[10px] font-medium text-muted-foreground px-1">
                                  {dayName} {formatShortDate(slot.date)}
                                </p>
                              </div>
                            )}
                            {isNewDay && idx === 0 && (
                              <p className="text-[10px] font-medium text-muted-foreground px-1 mb-1">
                                {dayName} {formatShortDate(slot.date)}
                              </p>
                            )}
                            <Button
                              variant={isBooked ? "secondary" : "outline"}
                              className="h-auto w-full p-1.5 flex items-center justify-between text-left"
                              onClick={() => !isBooked && handleSlotClick(slot)}
                              disabled={isBooked && !isMyAppointment}
                            >
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span className="text-xs font-medium">
                                  {formatTime(slot.startTime)}
                                </span>
                              </div>
                              {isBooked && (
                                <Badge variant={isMyAppointment ? "default" : "secondary"} className="text-[9px] px-1 py-0 h-4">
                                  {isMyAppointment ? "Yours" : "Booked"}
                                </Badge>
                              )}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              Confirm your appointment details
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{formatDate(selectedSlot.date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time</Label>
                  <p className="font-medium">
                    {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">With</Label>
                  <p className="font-medium">{selectedSlot.providerName}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                A room will be automatically assigned when you book this appointment.
              </p>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="What do you want to work on?"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBookAppointment} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
