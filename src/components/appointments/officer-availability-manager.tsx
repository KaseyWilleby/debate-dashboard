"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { OfficerAvailability, AppointmentWindow } from "@/lib/types";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface WindowSlot {
  date: string; // YYYY-MM-DD
  window: AppointmentWindow;
  availability?: OfficerAvailability;
}

export function OfficerAvailabilityManager() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = React.useState<Set<string>>(new Set());
  const [currentWeekStart, setCurrentWeekStart] = React.useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });

  // Check if user can set availability (coaches and varsity members)
  const canSetAvailability = user?.role === 'coach' || user?.role === 'varsity' || user?.role === 'officer';

  // Fetch member's availability records
  const availabilityQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId || !canSetAvailability) return null;
    return query(
      collection(firestore, 'officerAvailability'),
      where('officerId', '==', user.id),
      where('teamId', '==', user.teamId)
    );
  }, [firestore, user, canSetAvailability]);

  const { data: availabilityRecords, isLoading: isLoadingAvailability } = useCollection<OfficerAvailability>(availabilityQuery);

  // Fetch appointment windows
  const windowsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(
      collection(firestore, 'appointmentWindows'),
      where('teamId', '==', user.teamId),
      where('isActive', '==', true)
    );
  }, [firestore, user]);

  const { data: windows, isLoading: isLoadingWindows } = useCollection<AppointmentWindow>(windowsQuery);

  // Generate window slots for the current 4 weeks
  const windowSlots = React.useMemo(() => {
    if (!windows || !user) return [];

    const slots: WindowSlot[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate dates for next 28 days (4 weeks)
    for (let i = 0; i < 28; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      // Find windows for this day
      const dayWindows = windows.filter(w => w.dayOfWeek === dayOfWeek);

      dayWindows.forEach(window => {
        // Check if window is valid for this date
        if (window.validFrom && dateStr < window.validFrom) return;
        if (window.validUntil && dateStr > window.validUntil) return;

        // Find existing availability
        const availability = availabilityRecords?.find(
          a => a.appointmentWindowId === window.id
        );

        slots.push({
          date: dateStr,
          window,
          availability,
        });
      });
    }

    return slots;
  }, [windows, availabilityRecords, user]);

  // Group slots by date
  const slotsByDate = React.useMemo(() => {
    const grouped = new Map<string, WindowSlot[]>();
    windowSlots.forEach(slot => {
      const existing = grouped.get(slot.date) || [];
      existing.push(slot);
      grouped.set(slot.date, existing);
    });
    return grouped;
  }, [windowSlots]);

  const handleToggleAvailability = async (slot: WindowSlot) => {
    if (!firestore || !user) return;

    const slotKey = `${slot.date}-${slot.window.id}`;
    if (isProcessing.has(slotKey)) return;

    setIsProcessing(prev => new Set(prev).add(slotKey));

    try {
      if (slot.availability) {
        // Remove availability
        await deleteDoc(doc(firestore, 'officerAvailability', slot.availability.id));
        toast({
          title: "Availability Removed",
          description: `You are no longer available for ${slot.window.title}`,
        });
      } else {
        // Add availability
        await addDoc(collection(firestore, 'officerAvailability'), {
          teamId: user.teamId,
          officerId: user.id,
          officerName: user.name || user.email,
          appointmentWindowId: slot.window.id,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast({
          title: "Availability Added",
          description: `You are now available for ${slot.window.title}`,
        });
      }
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast({
        title: "Error",
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(slotKey);
        return newSet;
      });
    }
  };

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hour, min] = time.split(':');
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${min} ${ampm}`;
  };

  if (isLoadingAvailability || isLoadingWindows) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Availability</CardTitle>
        <CardDescription>
          Check off the appointment windows when you're available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!windows || windows.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No appointment windows available</p>
            <p className="text-sm text-muted-foreground">Ask your coach to create appointment windows first</p>
          </div>
        ) : windowSlots.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-lg">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No upcoming appointment windows</p>
            <p className="text-sm text-muted-foreground">Check back later or contact your coach</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Available Sessions</p>
                <p className="text-2xl font-bold">
                  {windowSlots.filter(s => s.availability).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Windows</p>
                <p className="text-2xl font-bold">{windowSlots.length}</p>
              </div>
            </div>

            {/* Calendar View */}
            <div className="space-y-6">
              {Array.from(slotsByDate.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, daySlots]) => (
                  <div key={date} className="space-y-3">
                    <h3 className="font-semibold text-lg sticky top-0 bg-background py-2">
                      {formatDate(date)}
                    </h3>
                    <div className="space-y-2">
                      {daySlots
                        .sort((a, b) => a.window.startTime.localeCompare(b.window.startTime))
                        .map((slot) => {
                          const slotKey = `${slot.date}-${slot.window.id}`;
                          const isChecked = !!slot.availability;
                          const isProcessingSlot = isProcessing.has(slotKey);

                          return (
                            <div
                              key={slotKey}
                              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => handleToggleAvailability(slot)}
                                disabled={isProcessingSlot}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{slot.window.title}</p>
                                  {isProcessingSlot && (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {formatTime(slot.window.startTime)} - {formatTime(slot.window.endTime)} ({slot.window.duration} min)
                                </p>
                                {slot.window.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {slot.window.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
