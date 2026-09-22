"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, UserRole, Team } from "@/lib/types";
import { Loader2, Plus, Users, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TeamManagementPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // New team form
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSlug, setNewTeamSlug] = useState("");
  const [newTeamDisplayName, setNewTeamDisplayName] = useState("");

  const isSuperAdmin = user?.role === 'superadmin';
  const isCoach = user?.role === 'coach';

  useEffect(() => {
    if (firestore && user) {
      loadData();
    }
  }, [firestore, user]);

  const loadData = async () => {
    if (!firestore || !user) return;

    try {
      setIsLoading(true);

      // Load users
      let usersQuery;
      if (isSuperAdmin) {
        // Superadmins can see all users
        usersQuery = collection(firestore, "users");
      } else if (isCoach) {
        // Coaches can only see users from their team
        usersQuery = query(collection(firestore, "users"), where("teamId", "==", user.teamId));
      } else {
        // Regular users shouldn't access this page
        return;
      }

      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersData);

      // Load teams (only for superadmins)
      if (isSuperAdmin) {
        const teamsSnapshot = await getDocs(collection(firestore, "teams"));
        const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setTeams(teamsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!firestore) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(firestore, "users", userId), {
        role: newRole,
        approved: newRole === 'superadmin' || newRole === 'coach' ? true : undefined
      });
      await loadData();
    } catch (error) {
      console.error("Error updating user role:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const updateUserApproval = async (userId: string, approved: boolean) => {
    if (!firestore) return;

    setIsUpdating(true);
    try {
      await updateDoc(doc(firestore, "users", userId), {
        approved
      });
      await loadData();
    } catch (error) {
      console.error("Error updating user approval:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const createNewTeam = async () => {
    if (!firestore || !isSuperAdmin) return;

    setIsUpdating(true);
    try {
      const newTeam: Omit<Team, 'id'> = {
        name: newTeamName,
        slug: newTeamSlug,
        displayName: newTeamDisplayName,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      await addDoc(collection(firestore, "teams"), {
        ...newTeam,
        id: newTeamSlug
      });

      // Reset form
      setNewTeamName("");
      setNewTeamSlug("");
      setNewTeamDisplayName("");
      setShowNewTeamForm(false);

      await loadData();
    } catch (error) {
      console.error("Error creating team:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isSuperAdmin && !isCoach) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only coaches and superadmins can access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-600';
      case 'coach': return 'bg-blue-600';
      case 'varsity': return 'bg-green-600';
      case 'novice': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600">Manage team members and settings</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="teams">
              <Settings className="h-4 w-4 mr-2" />
              Teams
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {isSuperAdmin ? "Manage users across all teams" : "Manage users in your team"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {isSuperAdmin && <TableHead>Team</TableHead>}
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((teamUser) => (
                    <TableRow key={teamUser.id}>
                      <TableCell className="font-medium">{teamUser.name}</TableCell>
                      <TableCell>{teamUser.email}</TableCell>
                      {isSuperAdmin && <TableCell>{teamUser.teamId}</TableCell>}
                      <TableCell>
                        {(isSuperAdmin || (isCoach && teamUser.role !== 'superadmin')) ? (
                          <Select
                            value={teamUser.role}
                            onValueChange={(value) => updateUserRole(teamUser.id, value as UserRole)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {isSuperAdmin && <SelectItem value="superadmin">Superadmin</SelectItem>}
                              <SelectItem value="coach">Coach</SelectItem>
                              <SelectItem value="varsity">Varsity</SelectItem>
                              <SelectItem value="novice">Novice</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getRoleBadgeColor(teamUser.role)}>
                            {teamUser.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {teamUser.approved ? (
                          <Badge className="bg-green-600">Approved</Badge>
                        ) : (
                          <Badge className="bg-yellow-600">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!teamUser.approved && (
                          <Button
                            size="sm"
                            onClick={() => updateUserApproval(teamUser.id, true)}
                            disabled={isUpdating}
                          >
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Teams</CardTitle>
                    <CardDescription>Manage all teams in the system</CardDescription>
                  </div>
                  <Button onClick={() => setShowNewTeamForm(!showNewTeamForm)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Team
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewTeamForm && (
                  <Card className="bg-gray-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Create New Team</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="team-name">Team Name</Label>
                        <Input
                          id="team-name"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="e.g., Cypress Woods"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team-slug">Team Slug (URL)</Label>
                        <Input
                          id="team-slug"
                          value={newTeamSlug}
                          onChange={(e) => setNewTeamSlug(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                          placeholder="e.g., cywoods"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team-display">Display Name</Label>
                        <Input
                          id="team-display"
                          value={newTeamDisplayName}
                          onChange={(e) => setNewTeamDisplayName(e.target.value)}
                          placeholder="e.g., Cypress Woods High School"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={createNewTeam} disabled={isUpdating || !newTeamName || !newTeamSlug || !newTeamDisplayName}>
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Create Team
                        </Button>
                        <Button variant="outline" onClick={() => setShowNewTeamForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{team.slug}</TableCell>
                        <TableCell>{team.displayName}</TableCell>
                        <TableCell>
                          <Badge className={team.isActive ? "bg-green-600" : "bg-gray-600"}>
                            {team.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(team.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
