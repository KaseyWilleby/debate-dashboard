"use client";

import { useState, useEffect, useMemo } from "react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Team, UserRole } from "@/lib/types";
import { Search, Filter, Edit, Trash2, CheckCircle, XCircle, Loader2, Users as UsersIcon, ArrowUpDown, AlertTriangle, RotateCcw, UserPlus } from "lucide-react";
import CreateUserDialog from "@/components/dashboard/create-user-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SortField = 'name' | 'email' | 'role' | 'createdAt' | 'teamId';
type SortDirection = 'asc' | 'desc';

export default function UsersManagerPage() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterApproval, setFilterApproval] = useState<string>(searchParams?.get('filter') === 'pending' ? 'pending' : 'all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Delete confirmation dialogs
  const [showDeleteActionDialog, setShowDeleteActionDialog] = useState(false);
  const [showSoftDeleteDialog, setShowSoftDeleteDialog] = useState(false);
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const teamsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);

  // Get team name by ID
  const getTeamName = (teamId: string) => {
    const team = teams?.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = [...users];

    // Filter by deleted status based on active tab
    if (activeTab === 'active') {
      filtered = filtered.filter(u => !u.deleted);
    } else {
      filtered = filtered.filter(u => u.deleted);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term)
      );
    }

    // Team filter
    if (filterTeam !== 'all') {
      filtered = filtered.filter(u => u.teamId === filterTeam);
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Approval filter
    if (filterApproval === 'pending') {
      filtered = filtered.filter(u => !u.approved);
    } else if (filterApproval === 'approved') {
      filtered = filtered.filter(u => u.approved);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle team name sorting
      if (sortField === 'teamId') {
        aVal = getTeamName(a.teamId);
        bVal = getTeamName(b.teamId);
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, filterTeam, filterRole, filterApproval, sortField, sortDirection, teams, activeTab]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleApprove = async (user: User) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        approved: true,
      });
      toast({
        title: "User Approved",
        description: `${user.name} has been approved`,
      });
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!firestore || !editingUser) return;

    setIsSubmitting(true);

    try {
      await updateDoc(doc(firestore, 'users', editingUser.id), {
        approved: editingUser.approved,
        role: editingUser.role,
        teamId: editingUser.teamId,
      });
      toast({
        title: "User Updated",
        description: `${editingUser.name} has been updated`,
      });
      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActionClick = (userItem: User) => {
    setUserToDelete(userItem);
    setDeleteConfirmText("");
    setShowDeleteActionDialog(true);
  };

  const openArchiveDialog = () => {
    setShowDeleteActionDialog(false);
    setShowSoftDeleteDialog(true);
  };

  const openPermanentDeleteDialog = () => {
    setShowDeleteActionDialog(false);
    setShowHardDeleteDialog(true);
  };

  const handleHardDeleteClick = (userItem: User) => {
    setUserToDelete(userItem);
    setDeleteConfirmText("");
    setShowHardDeleteDialog(true);
  };

  const handleSoftDelete = async () => {
    if (!firestore || !userToDelete || !user) return;

    if (deleteConfirmText !== "Confirm Archive") {
      toast({
        title: "Confirmation Failed",
        description: 'Please type "Confirm Archive" exactly to confirm',
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDoc(doc(firestore, 'users', userToDelete.id), {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
      });

      toast({
        title: "User Archived",
        description: `${userToDelete.name} has been archived`
      });

      setShowSoftDeleteDialog(false);
      setUserToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      console.error("Error archiving user:", error);
      toast({
        title: "Error",
        description: "Failed to archive user",
        variant: "destructive",
      });
    }
  };

  const handleHardDelete = async () => {
    if (!firestore || !userToDelete) return;

    if (deleteConfirmText !== "I confirm I am deleting this user") {
      toast({
        title: "Confirmation Failed",
        description: 'Please type "I confirm I am deleting this user" exactly to confirm',
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'users', userToDelete.id));

      toast({
        title: "User Permanently Deleted",
        description: `${userToDelete.name} has been permanently removed from the database`,
      });

      setShowHardDeleteDialog(false);
      setUserToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleRecover = async (userItem: User) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'users', userItem.id), {
        deleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      toast({
        title: "User Recovered",
        description: `${userItem.name} has been restored`,
      });
    } catch (error) {
      console.error("Error recovering user:", error);
      toast({
        title: "Error",
        description: "Failed to recover user",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'coach': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'varsity': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'novice': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Manager
          </h1>
          <p className="text-muted-foreground">
            View and manage all users across the platform
          </p>
        </div>
        <CreateUserDialog>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Create New User
          </Button>
        </CreateUserDialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Name, email, username..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Team/School</Label>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams?.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role/Level</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="varsity">Varsity</SelectItem>
                  <SelectItem value="novice">Novice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Approval Status</Label>
              <Select value={filterApproval} onValueChange={setFilterApproval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortField} onValueChange={(val) => setSortField(val as SortField)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="teamId">Team</SelectItem>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users?.length || 0} users
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table with Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'active' | 'archived')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">
            Active Users ({users?.filter(u => !u.deleted).length || 0})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived Users ({users?.filter(u => u.deleted).length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and approvals
              </CardDescription>
            </CardHeader>
            <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No users found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                      Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                      Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('teamId')}>
                      Team {sortField === 'teamId' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('role')}>
                      Role {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">{getTeamName(user.teamId)}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.approved ? (
                          <Badge variant="default">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!user.approved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(user)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteActionClick(user)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <Card>
            <CardHeader>
              <CardTitle>Archived Users</CardTitle>
              <CardDescription>
                Recover archived users or permanently remove them from the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UsersIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No archived users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Archived</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell className="text-sm">{getTeamName(user.teamId)}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.deletedAt ? new Date(user.deletedAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRecover(user)}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                Recover
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleHardDeleteClick(user)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user team, role, and approval status
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <div className="text-sm">
                  <p className="font-medium">{editingUser.name}</p>
                  <p className="text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select
                  value={editingUser.teamId}
                  onValueChange={(val) => setEditingUser({ ...editingUser, teamId: val })}
                >
                  <SelectTrigger id="team">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(val) => setEditingUser({ ...editingUser, role: val as UserRole })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="varsity">Varsity</SelectItem>
                    <SelectItem value="novice">Novice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="approved"
                  checked={editingUser.approved}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, approved: checked })}
                />
                <Label htmlFor="approved">User is approved</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Action Chooser Dialog */}
      <AlertDialog open={showDeleteActionDialog} onOpenChange={setShowDeleteActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete User: {userToDelete?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to delete this user:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold">Archive User</h4>
              <p className="text-sm text-muted-foreground">
                Mark the user as archived. The user data will be preserved and can be recovered later from the Archived Users tab.
              </p>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={openArchiveDialog}
              >
                Archive User
              </Button>
            </div>
            <div className="border border-destructive/50 rounded-lg p-4 space-y-2 bg-destructive/5">
              <h4 className="font-semibold text-destructive">Delete Forever</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete this user from the database. All of their data will be lost forever and cannot be recovered.
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
            <AlertDialogCancel onClick={() => setShowDeleteActionDialog(false)}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soft Delete Confirmation Dialog */}
      <AlertDialog open={showSoftDeleteDialog} onOpenChange={setShowSoftDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Archive User
            </AlertDialogTitle>
            <AlertDialogDescription>
              The user will no longer appear in the active users list, but their data will be preserved. You can recover this user later from the "Archived Users" tab if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-4">
            <div className="bg-muted rounded-lg p-4 border-2 border-primary">
              <p className="text-sm text-muted-foreground mb-1">User to archive:</p>
              <p className="text-lg font-semibold">{userToDelete?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{userToDelete?.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="soft-delete-confirm">
                Type <span className="font-mono font-semibold">Confirm Archive</span> to confirm:
              </Label>
              <Input
                id="soft-delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Confirm Archive"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowSoftDeleteDialog(false);
              setDeleteConfirmText("");
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSoftDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmText !== "Confirm Archive"}
            >
              Archive User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Confirmation Dialog */}
      <AlertDialog open={showHardDeleteDialog} onOpenChange={setShowHardDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete User
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="font-semibold text-destructive">
                  ⚠️ WARNING: This action CANNOT be undone! All user data will be lost forever.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-4">
            <div className="bg-destructive/10 rounded-lg p-4 border-2 border-destructive">
              <p className="text-sm text-muted-foreground mb-1">User to delete:</p>
              <p className="text-lg font-semibold text-destructive">{userToDelete?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{userToDelete?.email}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hard-delete-confirm">
                Type <span className="font-mono font-semibold">I confirm I am deleting this user</span> to confirm:
              </Label>
              <Input
                id="hard-delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="I confirm I am deleting this user"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowHardDeleteDialog(false);
              setDeleteConfirmText("");
              setUserToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHardDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmText !== "I confirm I am deleting this user"}
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
