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
import { User, Team, UserRole } from "@/lib/types";
import { Search, Filter, Edit, Trash2, CheckCircle, XCircle, Loader2, Users as UsersIcon, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";

type SortField = 'name' | 'email' | 'role' | 'createdAt' | 'teamId';
type SortDirection = 'asc' | 'desc';

export default function UsersManagerPage() {
  const { firestore } = useFirebase();
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
  }, [users, searchTerm, filterTeam, filterRole, filterApproval, sortField, sortDirection, teams]);

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

  const handleDelete = async (user: User) => {
    if (!firestore) return;

    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'users', user.id));
      toast({
        title: "User Deleted",
        description: `${user.name} has been deleted`,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
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
      <div>
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <UsersIcon className="h-8 w-8" />
          User Manager
        </h1>
        <p className="text-muted-foreground">
          View and manage all users across the platform
        </p>
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
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
                            onClick={() => handleDelete(user)}
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

      {/* Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user role and approval status
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
    </div>
  );
}
