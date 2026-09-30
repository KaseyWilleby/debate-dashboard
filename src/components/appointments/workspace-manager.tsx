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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Workspace } from "@/lib/types";

export function WorkspaceManager() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingWorkspace, setEditingWorkspace] = React.useState<Workspace | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [capacity, setCapacity] = React.useState<number | "">(4);
  const [isActive, setIsActive] = React.useState(true);

  // Fetch workspaces
  const workspacesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !user.teamId) return null;
    return query(collection(firestore, 'workspaces'), where('teamId', '==', user.teamId));
  }, [firestore, user]);

  const { data: workspaces, isLoading } = useCollection<Workspace>(workspacesQuery);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCapacity(4);
    setIsActive(true);
    setEditingWorkspace(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setName(workspace.name);
    setDescription(workspace.description || "");
    setCapacity(workspace.capacity || 4);
    setIsActive(workspace.isActive);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!firestore || !user || !name.trim()) {
      toast({
        title: "Error",
        description: "Workspace name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingWorkspace) {
        // Update existing workspace
        await updateDoc(doc(firestore, 'workspaces', editingWorkspace.id), {
          name: name.trim(),
          description: description.trim() || "",
          capacity: typeof capacity === 'number' ? capacity : undefined,
          isActive,
        });

        toast({
          title: "Workspace Updated",
          description: `"${name}" has been updated.`,
        });
      } else {
        // Create new workspace
        await addDoc(collection(firestore, 'workspaces'), {
          teamId: user.teamId,
          name: name.trim(),
          description: description.trim() || "",
          capacity: typeof capacity === 'number' ? capacity : undefined,
          isActive,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        });

        toast({
          title: "Workspace Created",
          description: `"${name}" has been created.`,
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving workspace:", error);
      toast({
        title: "Error",
        description: "Failed to save workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (workspace: Workspace) => {
    if (!firestore) return;

    if (!confirm(`Are you sure you want to delete "${workspace.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'workspaces', workspace.id));

      toast({
        title: "Workspace Deleted",
        description: `"${workspace.name}" has been deleted.`,
      });
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast({
        title: "Error",
        description: "Failed to delete workspace. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (workspace: Workspace) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'workspaces', workspace.id), {
        isActive: !workspace.isActive,
      });

      toast({
        title: workspace.isActive ? "Workspace Deactivated" : "Workspace Activated",
        description: `"${workspace.name}" is now ${!workspace.isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      console.error("Error toggling workspace:", error);
      toast({
        title: "Error",
        description: "Failed to update workspace status.",
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
              <CardTitle>Workspaces</CardTitle>
              <CardDescription>
                Manage physical spaces available for appointments
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Workspace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!workspaces || workspaces.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No workspaces yet</p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create First Workspace
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces.map((workspace) => (
                  <TableRow key={workspace.id}>
                    <TableCell className="font-medium">{workspace.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {workspace.description || "—"}
                    </TableCell>
                    <TableCell>
                      {workspace.capacity ? `${workspace.capacity} people` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={workspace.isActive ? "default" : "secondary"}>
                        {workspace.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={workspace.isActive}
                          onCheckedChange={() => handleToggleActive(workspace)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(workspace)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(workspace)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWorkspace ? "Edit Workspace" : "Create Workspace"}</DialogTitle>
            <DialogDescription>
              {editingWorkspace
                ? "Update the workspace details below."
                : "Add a new workspace for appointments."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Room A, Library, Coach's Office"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the space..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                placeholder="Maximum number of people"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : "")}
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
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingWorkspace ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
