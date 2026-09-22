"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, ArrowRight, BarChart3, Database } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Team, User } from "@/lib/types";

export default function SuperadminDashboardPage() {
  const { user } = useAuth();
  const { firestore } = useFirebase();

  // Fetch stats
  const teamsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teams');
  }, [firestore]);
  const { data: teams } = useCollection<Team>(teamsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  const { data: users } = useCollection<User>(usersQuery);

  const pendingApprovals = users?.filter(u => !u.approved).length || 0;
  const activeTeams = teams?.filter(t => t.isActive).length || 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Superadmin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage all teams and users across the platform
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeTeams} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all teams
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Users awaiting approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2" asChild>
          <Link href="/superadmin/dashboard/teams">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">Team/School Manager</CardTitle>
                  <CardDescription className="mt-1">
                    Approve new schools, create subdomains, and manage team settings
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="text-muted-foreground">{teams?.length || 0} teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-600" />
                  <span className="text-muted-foreground">{activeTeams} active</span>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2" asChild>
          <Link href="/superadmin/dashboard/users">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">User Manager</CardTitle>
                  <CardDescription className="mt-1">
                    View and manage all users with advanced filtering and sorting
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-600" />
                  <span className="text-muted-foreground">{users?.length || 0} users</span>
                </div>
                {pendingApprovals > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-600" />
                    <span className="text-muted-foreground">{pendingApprovals} pending</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Quick Actions */}
      {pendingApprovals > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="text-yellow-900 dark:text-yellow-100">
              Action Required
            </CardTitle>
            <CardDescription className="text-yellow-800 dark:text-yellow-200">
              {pendingApprovals} user{pendingApprovals !== 1 ? 's' : ''} awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/superadmin/dashboard/users?filter=pending">
                Review Pending Users
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
