"use client";

import { useState, useEffect } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Team } from "@/lib/types";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export default function TeamsManagerPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    displayName: "",
    isActive: true,
  });

  const teamsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);
  const { data: teams, isLoading } = useCollection<Team>(teamsQuery);

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      displayName: "",
      isActive: true,
    });
    setEditingTeam(null);
  };

  const handleOpenDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        slug: team.slug,
        displayName: team.displayName,
        isActive: team.isActive,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: editingTeam ? prev.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }));
  };

  const handleSubmit = async () => {
    if (!firestore) return;

    if (!formData.name || !formData.slug || !formData.displayName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingTeam) {
        // Update existing team
        await updateDoc(doc(firestore, 'teams', editingTeam.id), {
          name: formData.name,
          slug: formData.slug,
          displayName: formData.displayName,
          isActive: formData.isActive,
        });
        toast({
          title: "Team Updated",
          description: `${formData.name} has been updated successfully`,
        });
      } else {
        // Create new team
        await addDoc(collection(firestore, 'teams'), {
          name: formData.name,
          slug: formData.slug,
          displayName: formData.displayName,
          isActive: formData.isActive,
          createdAt: new Date().toISOString(),
          settings: {},
        });
        toast({
          title: "Team Created",
          description: `${formData.name} has been created successfully`,
        });
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving team:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save team",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!firestore) return;

    if (!confirm(`Are you sure you want to delete ${team.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'teams', team.id));
      toast({
        title: "Team Deleted",
        description: `${team.name} has been deleted`,
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (team: Team) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'teams', team.id), {
        isActive: !team.isActive,
      });
      toast({
        title: team.isActive ? "Team Deactivated" : "Team Activated",
        description: `${team.name} has been ${team.isActive ? 'deactivated' : 'activated'}`,
      });
    } catch (error) {
      console.error("Error toggling team status:", error);
      toast({
        title: "Error",
        description: "Failed to update team status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Team/School Manager
          </h1>
          <p className="text-muted-foreground">
            Create and manage teams across the platform
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Team
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Teams</CardTitle>
          <CardDescription>
            {teams?.length || 0} total teams • {teams?.filter(t => t.isActive).length || 0} active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !teams || teams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No teams created yet</p>
              <p className="text-sm mt-1">Click "Create New Team" to add your first team</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Slug (Subdomain)</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {team.slug}
                      </code>
                    </TableCell>
                    <TableCell>{team.displayName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={team.isActive ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(team)}
                      >
                        {team.isActive ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(team)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(team)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Create/Edit Team Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? 'Edit Team' : 'Create New Team'}
            </DialogTitle>
            <DialogDescription>
              {editingTeam
                ? 'Update team information and settings'
                : 'Add a new school/team to the platform'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Cypress Woods"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL Identifier) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g., cywoods"
              />
              <p className="text-xs text-muted-foreground">
                This will be used in the URL: /{formData.slug}/dashboard
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Display Name *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="e.g., Cypress Woods High School"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Team is active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                editingTeam ? 'Update Team' : 'Create Team'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
