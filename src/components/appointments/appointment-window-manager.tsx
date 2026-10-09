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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AppointmentWindow, Workspace } from "@/lib/types";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DURATIONS = [15, 30, 45, 60];

export function AppointmentWindowManager() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingWindow, setEditingWindow] = React.useState<AppointmentWindow | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [selectedDays, setSelectedDays] = React.useState<number[]>([1]); // Changed to array for multi-select
  const [startTime, setStartTime] = React.useState("15:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [duration, setDuration] = React.useState(30);
  const [workspaceId, setWorkspaceId] = React.useState<string>("none");
  const [isActive, setIsActive] = React.useState(true);
  const [validFrom, setValidFrom] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");

  // Fetch appointment windows
  const windowsQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(collection(firestore, 'appointmentWindows'), where('teamId', '==', user.teamId));
  }, [firestore, user]);

  const { data: windows, isLoading } = useCollection<AppointmentWindow>(windowsQuery);

  // Fetch workspaces for dropdown
  const workspacesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(collection(firestore, 'workspaces'), where('teamId', '==', user.teamId));
  }, [firestore, user]);

  const { data: workspaces } = useCollection<Workspace>(workspacesQuery);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedDays([1]);
    setStartTime("15:00");
    setEndTime("17:00");
    setDuration(30);
    setWorkspaceId("none");
    setIsActive(true);
    setValidFrom("");
    setValidUntil("");
    setEditingWindow(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (window: AppointmentWindow) => {
    setEditingWindow(window);
    setTitle(window.title);
    setDescription(window.description || "");
    setSelectedDays([window.dayOfWeek]); // Single day when editing
    setStartTime(window.startTime);
    setEndTime(window.endTime);
    setDuration(window.duration);
    setWorkspaceId(window.workspaceId || "none");
    setIsActive(window.isActive);
    setValidFrom(window.validFrom || "");
    setValidUntil(window.validUntil || "");
    setIsDialogOpen(true);
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const handleSubmit = async () => {
    if (!firestore || !user || !title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one day",
        variant: "destructive",
      });
      return;
    }

    // Validate time range
    if (startTime >= endTime) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingWindow) {
        // Update existing window (single day only when editing)
        const windowData: any = {
          title: title.trim(),
          dayOfWeek: selectedDays[0],
          startTime,
          endTime,
          duration,
          isActive,
        };

        // Only add optional fields if they have values
        if (description.trim()) windowData.description = description.trim();
        if (workspaceId !== "none") windowData.workspaceId = workspaceId;
        if (validFrom) windowData.validFrom = validFrom;
        if (validUntil) windowData.validUntil = validUntil;

        await updateDoc(doc(firestore, 'appointmentWindows', editingWindow.id), windowData);

        toast({
          title: "Window Updated",
          description: `"${title}" has been updated.`,
        });
      } else {
        // Create new windows (one for each selected day)
        const promises = selectedDays.map(day => {
          const windowData: any = {
            title: title.trim(),
            dayOfWeek: day,
            startTime,
            endTime,
            duration,
            isActive,
            teamId: user.teamId,
            createdBy: user.id,
            createdAt: new Date().toISOString(),
          };

          // Only add optional fields if they have values
          if (description.trim()) windowData.description = description.trim();
          if (workspaceId !== "none") windowData.workspaceId = workspaceId;
          if (validFrom) windowData.validFrom = validFrom;
          if (validUntil) windowData.validUntil = validUntil;

          return addDoc(collection(firestore, 'appointmentWindows'), windowData);
        });

        await Promise.all(promises);

        const dayNames = selectedDays
          .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
          .join(', ');

        toast({
          title: "Windows Created",
          description: `"${title}" has been created for ${dayNames}.`,
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving appointment window:", error);
      toast({
        title: "Error",
        description: "Failed to save appointment window. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (window: AppointmentWindow) => {
    if (!firestore) return;

    if (!confirm(`Are you sure you want to delete "${window.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'appointmentWindows', window.id));

      toast({
        title: "Window Deleted",
        description: `"${window.title}" has been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting window:", error);
      toast({
        title: "Error",
        description: "Failed to delete appointment window. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (window: AppointmentWindow) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'appointmentWindows', window.id), {
        isActive: !window.isActive,
      });

      toast({
        title: window.isActive ? "Window Deactivated" : "Window Activated",
        description: `"${window.title}" is now ${!window.isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      console.error("Error toggling window:", error);
      toast({
        title: "Error",
        description: "Failed to update window status.",
        variant: "destructive",
      });
    }
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Appointment Windows</CardTitle>
              <CardDescription>
                Define recurring time slots when appointments can be scheduled
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Window
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!windows || windows.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No appointment windows yet</p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Window
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {windows.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((window) => (
                  <TableRow key={window.id}>
                    <TableCell className="font-medium">{window.title}</TableCell>
                    <TableCell>
                      {DAYS_OF_WEEK.find(d => d.value === window.dayOfWeek)?.label}
                    </TableCell>
                    <TableCell className="text-sm">
                      {window.startTime} - {window.endTime}
                    </TableCell>
                    <TableCell>{window.duration} min</TableCell>
                    <TableCell>
                      <Badge variant={window.isActive ? "default" : "secondary"}>
                        {window.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={window.isActive}
                          onCheckedChange={() => handleToggleActive(window)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(window)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(window)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWindow ? "Edit Appointment Window" : "Create Appointment Window"}
            </DialogTitle>
            <DialogDescription>
              {editingWindow
                ? "Update the appointment window details below."
                : "Define when appointments can be scheduled."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Monday Office Hours"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Days of Week *</Label>
              {editingWindow ? (
                <p className="text-sm text-muted-foreground">
                  {DAYS_OF_WEEK.find(d => d.value === selectedDays[0])?.label} (Change day by creating a new window)
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <Label
                        htmlFor={`day-${day.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Slot Duration *</Label>
                <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={d.toString()}>
                        {d} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace (optional)</Label>
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Any workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any workspace</SelectItem>
                  {workspaces?.filter(w => w.isActive).map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From (optional)</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until (optional)</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
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
            <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingWindow ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
