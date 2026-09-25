"use client";

import { useState, useEffect } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Team } from "@/lib/types";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Loader2, Building2, AlertTriangle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TeamsManagerPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteActionDialogOpen, setDeleteActionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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

  const openDeleteActionDialog = (team: Team) => {
    setTeamToDelete(team);
    setDeleteConfirmText("");
    setDeleteActionDialogOpen(true);
  };

  const openArchiveDialog = () => {
    setDeleteActionDialogOpen(false);
    setDeleteDialogOpen(true);
  };

  const openPermanentDeleteDialog = () => {
    setDeleteActionDialogOpen(false);
    setHardDeleteDialogOpen(true);
  };

  const handleSoftDelete = async () => {
    if (!firestore || !teamToDelete || !user) return;

    if (deleteConfirmText !== "Confirm Archive") {
      toast({
        title: "Confirmation Failed",
        description: 'Please type "Confirm Archive" exactly to confirm',
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDoc(doc(firestore, 'teams', teamToDelete.id), {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
        isActive: false,
      });
      toast({
        title: "Team Archived",
        description: `${teamToDelete.name} has been archived. You can recover it from the Archived Teams tab.`,
      });
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      console.error("Error archiving team:", error);
      toast({
        title: "Error",
        description: "Failed to archive team",
        variant: "destructive",
      });
    }
  };

  const openHardDeleteDialog = (team: Team) => {
    setTeamToDelete(team);
    setDeleteConfirmText("");
    setHardDeleteDialogOpen(true);
  };

  const handleHardDelete = async () => {
    if (!firestore || !teamToDelete) return;

    if (deleteConfirmText !== "I confirm I am deleting this team") {
      toast({
        title: "Confirmation Failed",
        description: 'Please type "I confirm I am deleting this team" exactly to confirm',
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Get the current user's auth token
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Not authenticated");
      }

      // Call the API route to delete team and all associated users
      const response = await fetch('/api/admin/delete-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: teamToDelete.id,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete team');
      }

      toast({
        title: "Team Permanently Deleted",
        description: `${teamToDelete.name} and ${data.deletedUsersCount} associated user(s) have been permanently deleted from the database`,
      });
      setHardDeleteDialogOpen(false);
      setTeamToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      console.error("Error permanently deleting team:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to permanently delete team",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecoverTeam = async (team: Team) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'teams', team.id), {
        deleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      toast({
        title: "Team Recovered",
        description: `${team.name} has been successfully recovered`,
      });
    } catch (error) {
      console.error("Error recovering team:", error);
      toast({
        title: "Error",
        description: "Failed to recover team",
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

  const activeTeams = teams?.filter(t => !t.deleted) || [];
  const deletedTeams = teams?.filter(t => t.deleted) || [];

  const renderTeamsTable = (teamsList: Team[], showRecovery: boolean = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team Name</TableHead>
          <TableHead>Slug (Subdomain)</TableHead>
          <TableHead>Display Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          {showRecovery && <TableHead>Archived</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teamsList.map((team) => (
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
                className={!showRecovery ? "cursor-pointer" : ""}
                onClick={!showRecovery ? () => handleToggleActive(team) : undefined}
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
            {showRecovery && team.deletedAt && (
              <TableCell className="text-sm text-muted-foreground">
                {new Date(team.deletedAt).toLocaleDateString()}
              </TableCell>
            )}
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                {!showRecovery ? (
                  <>
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
                      onClick={() => openDeleteActionDialog(team)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRecoverTeam(team)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Recover
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openHardDeleteDialog(team)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Forever
                    </Button>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

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
          <CardTitle>Teams</CardTitle>
          <CardDescription>
            {activeTeams.length} active teams • {deletedTeams.length} archived teams
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
            <Tabs defaultValue="active" className="w-full">
              <TabsList>
                <TabsTrigger value="active">
                  Active Teams ({activeTeams.length})
                </TabsTrigger>
                <TabsTrigger value="deleted">
                  Archived Teams ({deletedTeams.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {activeTeams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No active teams</p>
                  </div>
                ) : (
                  renderTeamsTable(activeTeams, false)
                )}
              </TabsContent>

              <TabsContent value="deleted">
                {deletedTeams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No archived teams</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-900 dark:text-yellow-100">
                        Archived teams are stored in the database and can be recovered. You can also permanently delete them to free up storage space.
                      </p>
                    </div>
                    {renderTeamsTable(deletedTeams, true)}
                  </>
                )}
              </TabsContent>
            </Tabs>
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

      {/* Delete Action Chooser Dialog */}
      <AlertDialog open={deleteActionDialogOpen} onOpenChange={setDeleteActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Team: {teamToDelete?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to delete this team:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold">Archive Team</h4>
              <p className="text-sm text-muted-foreground">
                Deactivate the team and mark it as archived. The team data will be preserved and can be recovered later.
              </p>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={openArchiveDialog}
              >
                Archive Team
              </Button>
            </div>
            <div className="border border-destructive/50 rounded-lg p-4 space-y-2 bg-destructive/5">
              <h4 className="font-semibold text-destructive">Delete Forever</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete this team and ALL associated users from the database. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                className="w-full mt-2"
                onClick={openPermanentDeleteDialog}
              >
                Delete Forever
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteActionDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soft Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Archive Team
            </AlertDialogTitle>
            <AlertDialogDescription>
              The team data will be preserved and can be recovered later from the Archived Teams tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-4">
            <div className="bg-muted rounded-lg p-4 border-2 border-primary">
              <p className="text-sm text-muted-foreground mb-1">Team to archive:</p>
              <p className="text-lg font-semibold">{teamToDelete?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">Slug: {teamToDelete?.slug}</p>
            </div>
            <div>
              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                Type <strong>Confirm Archive</strong> to confirm:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Confirm Archive"
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleSoftDelete}
              disabled={deleteConfirmText !== "Confirm Archive"}
            >
              Archive Team
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Confirmation Dialog */}
      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Team
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="text-destructive font-semibold">
                  ⚠️ WARNING: This action CANNOT be undone! All team data and user accounts will be lost forever.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-4">
            <div className="bg-destructive/10 rounded-lg p-4 border-2 border-destructive">
              <p className="text-sm text-muted-foreground mb-1">Team to delete:</p>
              <p className="text-lg font-semibold text-destructive">{teamToDelete?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">Slug: {teamToDelete?.slug}</p>
              <p className="text-sm font-semibold text-destructive mt-2">
                This will also permanently delete ALL ASSOCIATED USERS
              </p>
            </div>
            <div>
              <Label htmlFor="hard-delete-confirm" className="text-sm font-medium">
                Type <strong className="font-mono">I confirm I am deleting this team</strong> to confirm permanent deletion:
              </Label>
              <Input
                id="hard-delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="I confirm I am deleting this team"
                className="mt-2"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleHardDelete}
              disabled={deleteConfirmText !== "I confirm I am deleting this team" || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Forever'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
