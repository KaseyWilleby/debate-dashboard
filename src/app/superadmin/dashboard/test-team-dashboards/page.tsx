"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ExternalLink, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Team, User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export default function TestTeamDashboardsPage() {
  const { firestore } = useFirebase();

  // Fetch all teams
  const teamsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);
  const { data: teams, isLoading: teamsLoading } = useCollection<Team>(teamsQuery);

  // Fetch all users to show user counts per team
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: users } = useCollection<User>(usersQuery);

  const getUserCountForTeam = (teamId: string) => {
    return users?.filter(u => u.teamId === teamId && !u.deleted).length || 0;
  };

  const getCoachCountForTeam = (teamId: string) => {
    return users?.filter(u => u.teamId === teamId && u.role === 'coach' && !u.deleted).length || 0;
  };

  const activeTeams = teams?.filter(t => t.isActive && !t.deleted) || [];
  const inactiveTeams = teams?.filter(t => (!t.isActive || t.deleted)) || [];

  if (teamsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Test Team Dashboards</h1>
        <p className="text-muted-foreground">
          Access any team's dashboard to test coach tools and functionality
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 text-lg">
            Testing Mode
          </CardTitle>
          <CardDescription className="text-blue-800 dark:text-blue-200">
            As a superadmin, you can access any team's dashboard to test coach functionality.
            This includes tournament management, results import, analytics, and all other coach tools.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Active Teams */}
      {activeTeams.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold font-headline">Active Teams</h2>
            <p className="text-sm text-muted-foreground">
              {activeTeams.length} active team{activeTeams.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeTeams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {team.displayName || team.name}
                        </CardTitle>
                        <CardDescription className="truncate">
                          /{team.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{getUserCountForTeam(team.id)} users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{getCoachCountForTeam(team.id)} coaches</span>
                      </div>
                    </div>

                    <Button asChild className="w-full">
                      <Link href={`/${team.slug}/dashboard`}>
                        Access Dashboard
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Teams */}
      {inactiveTeams.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold font-headline">Inactive Teams</h2>
            <p className="text-sm text-muted-foreground">
              {inactiveTeams.length} inactive team{inactiveTeams.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inactiveTeams.map((team) => (
              <Card key={team.id} className="opacity-60 hover:opacity-100 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {team.displayName || team.name}
                        </CardTitle>
                        <CardDescription className="truncate">
                          /{team.slug}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{getUserCountForTeam(team.id)} users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{getCoachCountForTeam(team.id)} coaches</span>
                      </div>
                    </div>

                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/${team.slug}/dashboard`}>
                        Access Dashboard
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {teams?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No teams found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
