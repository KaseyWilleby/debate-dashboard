"use client";

import * as React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Loader2, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { OfficerAvailability, AppointmentWindow, Workspace } from "@/lib/types";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function OfficerAvailabilityManager() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingAvailability, setEditingAvailability] = React.useState<OfficerAvailability | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [appointmentWindowId, setAppointmentWindowId] = React.useState<string>("");
  const [workspaceId, setWorkspaceId] = React.useState<string>("none");
  const [maxAppointmentsPerDay, setMaxAppointmentsPerDay] = React.useState<number | "">(4);
  const [notes, setNotes] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  // Fetch officer's availability records
  const availabilityQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(
      collection(firestore, 'officerAvailability'),
      where('officerId', '==', user.id),
      where('teamId', '==', user.teamId)
    );
  }, [firestore, user]);

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

  const resetForm = () => {
    setAppointmentWindowId("");
    setWorkspaceId("none");
    setMaxAppointmentsPerDay(4);
    setNotes("");
    setIsActive(true);
    setEditingAvailability(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (availability: OfficerAvailability) => {
    setEditingAvailability(availability);
    setAppointmentWindowId(availability.appointmentWindowId);
    setWorkspaceId(availability.workspaceId || "none");
    setMaxAppointmentsPerDay(availability.maxAppointmentsPerDay || 4);
    setNotes(availability.notes || "");
    setIsActive(availability.isActive);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!firestore || !user || !appointmentWindowId) {
      toast({
        title: "Error",
        description: "Please select an appointment window",
        variant: "destructive",
      });
      return;
    }

    // Check if already have availability for this window (when creating)
    if (!editingAvailability && availabilityRecords?.some(a => a.appointmentWindowId === appointmentWindowId)) {
      toast({
        title: "Error",
        description: "You already have availability set for this window",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const availabilityData: Partial<OfficerAvailability> = {
        appointmentWindowId,
        workspaceId: workspaceId === "none" ? undefined : workspaceId,
        maxAppointmentsPerDay: typeof maxAppointmentsPerDay === 'number' ? maxAppointmentsPerDay : undefined,
        notes: notes.trim() || undefined,
        isActive,
        updatedAt: new Date().toISOString(),
      };

      if (editingAvailability) {
        // Update existing availability
        await updateDoc(doc(firestore, 'officerAvailability', editingAvailability.id), availabilityData);

        toast({
          title: "Availability Updated",
          description: "Your availability has been updated.",
        });
      } else {
        // Create new availability
        await addDoc(collection(firestore, 'officerAvailability'), {
          ...availabilityData,
          teamId: user.teamId,
          officerId: user.id,
          officerName: user.name || user.email,
          createdAt: new Date().toISOString(),
        });

        toast({
          title: "Availability Added",
          description: "Your availability has been added.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving officer availability:", error);
      toast({
        title: "Error",
        description: "Failed to save availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (availability: OfficerAvailability) => {
    if (!firestore) return;

    const window = windows?.find(w => w.id === availability.appointmentWindowId);
    if (!confirm(`Are you sure you want to remove your availability for "${window?.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'officerAvailability', availability.id));

      toast({
        title: "Availability Removed",
        description: "Your availability has been removed.",
      });
    } catch (error) {
      console.error("Error deleting availability:", error);
      toast({
        title: "Error",
        description: "Failed to remove availability. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (availability: OfficerAvailability) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'officerAvailability', availability.id), {
        isActive: !availability.isActive,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: availability.isActive ? "Availability Deactivated" : "Availability Activated",
        description: `Your availability is now ${!availability.isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast({
        title: "Error",
        description: "Failed to update availability status.",
        variant: "destructive",
      });
    }
  };

  const getWindowInfo = (windowId: string) => {
    return windows?.find(w => w.id === windowId);
  };

  const getWorkspaceInfo = (workspaceId?: string) => {
    if (!workspaceId) return null;
    return workspaces?.find(w => w.id === workspaceId);
  };

  // Get available windows (excluding those already set)
  const availableWindows = React.useMemo(() => {
    if (!windows) return [];
    if (editingAvailability) return windows; // When editing, show current window
    const usedWindowIds = new Set(availabilityRecords?.map(a => a.appointmentWindowId) || []);
    return windows.filter(w => !usedWindowIds.has(w.id));
  }, [windows, availabilityRecords, editingAvailability]);

  if (isLoadingAvailability || isLoadingWindows) {
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Availability</CardTitle>
              <CardDescription>
                Set your availability for appointment windows
              </CardDescription>
            </div>
            <Button onClick={handleCreate} disabled={availableWindows.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Availability
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!windows || windows.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg">
              <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No appointment windows available</p>
              <p className="text-sm text-muted-foreground">Ask your coach to create appointment windows first</p>
            </div>
          ) : !availabilityRecords || availabilityRecords.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg">
              <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No availability set yet</p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Set First Availability
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Window</TableHead>
                  <TableHead>Day & Time</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Max/Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availabilityRecords.map((availability) => {
                  const window = getWindowInfo(availability.appointmentWindowId);
                  const workspace = getWorkspaceInfo(availability.workspaceId);

                  return (
                    <TableRow key={availability.id}>
                      <TableCell className="font-medium">
                        {window?.title || "Unknown Window"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {window && (
                          <>
                            {DAYS_OF_WEEK.find(d => d.value === window.dayOfWeek)?.label}
                            <br />
                            <span className="text-muted-foreground">
                              {window.startTime} - {window.endTime}
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {workspace?.name || "Any"}
                      </TableCell>
                      <TableCell>
                        {availability.maxAppointmentsPerDay || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={availability.isActive ? "default" : "secondary"}>
                          {availability.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={availability.isActive}
                            onCheckedChange={() => handleToggleActive(availability)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(availability)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(availability)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAvailability ? "Edit Availability" : "Add Availability"}
            </DialogTitle>
            <DialogDescription>
              {editingAvailability
                ? "Update your availability details below."
                : "Set your availability for an appointment window."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="window">Appointment Window *</Label>
              <Select
                value={appointmentWindowId}
                onValueChange={setAppointmentWindowId}
                disabled={!!editingAvailability}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a window" />
                </SelectTrigger>
                <SelectContent>
                  {(editingAvailability ? windows : availableWindows)?.map((window) => (
                    <SelectItem key={window.id} value={window.id}>
                      {window.title} - {DAYS_OF_WEEK.find(d => d.value === window.dayOfWeek)?.label} {window.startTime}-{window.endTime}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingAvailability && (
                <p className="text-xs text-muted-foreground">
                  Window cannot be changed when editing
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace">Preferred Workspace (optional)</Label>
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Any workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any workspace</SelectItem>
                  {workspaces?.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAppointments">Max Appointments Per Day (optional)</Label>
              <Input
                id="maxAppointments"
                type="number"
                min="1"
                max="20"
                placeholder="e.g., 4"
                value={maxAppointmentsPerDay}
                onChange={(e) => setMaxAppointmentsPerDay(e.target.value ? parseInt(e.target.value) : "")}
              />
              <p className="text-xs text-muted-foreground">
                Limit how many appointments you can have in one day
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Can help with policy debate preparation, LD cases..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="active">Active (available for booking)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !appointmentWindowId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAvailability ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
