
"use client";

import { useRouter, usePathname, useParams } from "next/navigation";
import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BookOpenCheck, Calendar, Gavel, BookOpen, Briefcase, BookCopy, ClipboardList, Trophy, Users, Mic, Flag, Drama, BrainCircuit, LayoutDashboard, Globe, FileText, Video, BarChart3, Download, TestTube2, X, Settings } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Team } from "@/lib/types";

type Hub = 'scheduler' | 'practice' | 'learning';

const SchedulerNav = ({ pathname, isCoach, teamSlug }: { pathname: string; isCoach: boolean; teamSlug: string }) => {
    return (
        <>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/${teamSlug}/dashboard`} tooltip="Team Hub">
                  <Link href={`/${teamSlug}/dashboard`}><LayoutDashboard /><span>Team Hub</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/my-sessions`)} tooltip="My Sessions">
                  <Link href={`/${teamSlug}/dashboard/my-sessions`}><Briefcase /><span>My Sessions</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/session-manager`)} tooltip="Session Manager">
                <Link href={`/${teamSlug}/dashboard/session-manager`}><BookCopy /><span>Session Manager</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isCoach && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/tournament-scheduler`)} tooltip="Tournament Manager">
                  <Link href={`/${teamSlug}/dashboard/tournament-scheduler`}><Calendar /><span>Tournament Manager</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/tournament-history`)} tooltip="Tournament History">
                <Link href={`/${teamSlug}/dashboard/tournament-history`}><Trophy /><span>Tournament History</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {!isCoach && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/my-results`)} tooltip="My Results">
                  <Link href={`/${teamSlug}/dashboard/my-results`}><Trophy /><span>My Results</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {isCoach && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/tournament-results-import`)} tooltip="Import Results">
                    <Link href={`/${teamSlug}/dashboard/tournament-results-import`}><Download /><span>Import Results</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/users`)} tooltip="User Management">
                    <Link href={`/${teamSlug}/dashboard/users`}><Users /><span>User Management</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/team-options`)} tooltip="Team Options">
                    <Link href={`/${teamSlug}/dashboard/team-options`}><Settings /><span>Team Options</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
        </>
    );
};

const PracticeNav = ({ pathname, isCoach, teamSlug }: { pathname: string; isCoach: boolean; teamSlug: string }) => (
  <>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/practice-dashboard`)} tooltip="Practice Hub">
        <Link href={`/${teamSlug}/dashboard/practice-dashboard`}><LayoutDashboard /><span>Practice Hub</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/analytics`)} tooltip="Analytics">
        <Link href={`/${teamSlug}/dashboard/analytics`}><BarChart3 /><span>Analytics</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/extemp-practice`)} tooltip="Speech Events">
        <Link href={`/${teamSlug}/dashboard/extemp-practice`}><Mic /><span>Speech Events</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/student-congress`)} tooltip="Student Congress">
        <Link href={`/${teamSlug}/dashboard/student-congress`}><Flag /><span>Student Congress</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/performance-events`)} tooltip="Performance Events">
        <Link href={`/${teamSlug}/dashboard/performance-events`}><Drama /><span>Performance Events</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/debate-events`)} tooltip="Debate Events">
        <Link href={`/${teamSlug}/dashboard/debate-events`}><Gavel /><span>Debate Events</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
    {isCoach && (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/video-dashboard`)} tooltip="Video Dashboard">
          <Link href={`/${teamSlug}/dashboard/video-dashboard`}><Video /><span>Video Dashboard</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )}
  </>
);

const LearningNav = ({ pathname, teamSlug }: { pathname: string; teamSlug: string }) => (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname === `/${teamSlug}/dashboard/learning-hub`} tooltip="Learning Hub">
          <Link href={`/${teamSlug}/dashboard/learning-hub`}><BrainCircuit /><span>Learning Hub</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/learning-hub/platforms`)} tooltip="Platform Guides">
          <Link href={`/${teamSlug}/dashboard/learning-hub/platforms`}><Globe /><span>Platform Guides</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/learning-hub/standing-rules`)} tooltip="Standing Rules">
          <Link href={`/${teamSlug}/dashboard/learning-hub/standing-rules`}><FileText /><span>Standing Rules</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/learning-hub/debate`)} tooltip="Debate Events">
          <Link href={`/${teamSlug}/dashboard/learning-hub/debate`}><Gavel /><span>Debate</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/learning-hub/speech`)} tooltip="Speech Events">
          <Link href={`/${teamSlug}/dashboard/learning-hub/speech`}><Mic /><span>Speech</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/learning-hub/interp`)} tooltip="Interpretation Events">
          <Link href={`/${teamSlug}/dashboard/learning-hub/interp`}><Drama /><span>Interp</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/learning-hub/congress`)} tooltip="Student Congress">
          <Link href={`/${teamSlug}/dashboard/learning-hub/congress`}><Flag /><span>Congress</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const { user, isLoading } = useAuth();
  const { firestore } = useFirebase();
  const [activeHub, setActiveHub] = React.useState<Hub>('scheduler');
  const [isMounted, setIsMounted] = React.useState(false);
  const [teamData, setTeamData] = useState<Team | null>(null);

  // Note: Superadmins are allowed to access team dashboards for testing purposes
  // Previously redirected superadmins to their portal, but this prevented testing functionality

  // Fetch team data for the testing banner
  useEffect(() => {
    async function fetchTeamData() {
      if (!firestore || !teamSlug || !user?.role) return;

      try {
        const teamDoc = await getDoc(doc(firestore, "teams", teamSlug));
        if (teamDoc.exists()) {
          setTeamData({ id: teamDoc.id, ...teamDoc.data() } as Team);
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
      }
    }

    fetchTeamData();
  }, [firestore, teamSlug, user?.role]);

  // Check if user needs approval
  useEffect(() => {
    if (!isLoading && user && !user.approved && pathname !== `/${teamSlug}/dashboard/pending-approval`) {
      router.push(`/${teamSlug}/dashboard/pending-approval`);
    }
  }, [user, isLoading, pathname, router, teamSlug]);

  React.useEffect(() => {
    setIsMounted(true);
    const storedHub = localStorage.getItem('activeHub') as Hub;
    if (storedHub) {
        setActiveHub(storedHub);
    }
  }, []);

  const handleHubChange = (hub: Hub) => {
    if (hub) {
        setActiveHub(hub);
        localStorage.setItem('activeHub', hub);

        // Navigate to the first page of the selected hub
        if (hub === 'scheduler') {
          router.push(`/${teamSlug}/dashboard`);
        } else if (hub === 'practice') {
          router.push(`/${teamSlug}/dashboard/practice-dashboard`);
        } else if (hub === 'learning') {
          router.push(`/${teamSlug}/dashboard/learning-hub`);
        }
    }
  }

  if (!isMounted) {
    return null;
  }

  return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
             <Button variant="ghost" className="w-full justify-start p-2 h-auto text-left" onClick={() => router.push(`/${teamSlug}/dashboard/welcome`)}>
              <div className="flex items-center gap-2 text-primary">
                <Gavel />
                <div className="flex flex-col">
                    <span className="text-lg font-headline font-semibold text-foreground leading-none">
                        Debate Dashboard
                    </span>
                </div>
              </div>
            </Button>
             <div className="p-2">
                <div className="text-center text-sm font-medium text-muted-foreground mb-2 capitalize">
                    {activeHub === 'scheduler' ? 'Team Hub' : activeHub === 'practice' ? 'Practice Hub' : 'Learning Hub'}
                </div>
                <ToggleGroup type="single" value={activeHub} onValueChange={handleHubChange} className="w-full grid grid-cols-3">
                    <ToggleGroupItem value="scheduler" aria-label="Team Hub" className="flex-1">
                        <Users className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="practice" aria-label="Practice Hub" className="flex-1">
                        <Gavel className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="learning" aria-label="Learning Hub" className="flex-1">
                        <BookOpen className="h-4 w-4" />
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {activeHub === 'scheduler' && <SchedulerNav pathname={pathname} isCoach={user?.role === 'coach' || user?.role === 'superadmin'} teamSlug={teamSlug} />}
              {activeHub === 'practice' && <PracticeNav pathname={pathname} isCoach={user?.role === 'coach' || user?.role === 'superadmin'} teamSlug={teamSlug} />}
              {activeHub === 'learning' && <LearningNav pathname={pathname} teamSlug={teamSlug} />}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          {/* Superadmin Testing Mode Banner */}
          {user?.role === 'superadmin' && (
            <div className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 border-b-2 border-orange-700 shadow-lg">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                  <TestTube2 className="h-5 w-5 animate-pulse" />
                  <div>
                    <p className="font-semibold text-sm">
                      Testing Mode - {teamData ? (teamData.displayName || teamData.name) : teamSlug}
                    </p>
                    <p className="text-xs text-orange-100">
                      You are viewing this team's dashboard as a superadmin
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/superadmin/dashboard')}
                  className="bg-white text-orange-600 hover:bg-orange-50 border-orange-300 font-semibold"
                >
                  Exit Testing Mode
                </Button>
              </div>
            </div>
          )}

          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="ml-auto flex items-center gap-4">
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 p-4 sm:px-6 sm:py-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
  );
}
