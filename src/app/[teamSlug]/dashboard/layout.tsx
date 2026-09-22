
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
import { BookOpenCheck, Calendar, Gavel, BookOpen, Briefcase, BookCopy, ClipboardList, Trophy, Users, Mic, Flag, Drama, BrainCircuit, LayoutDashboard, Globe, FileText, Video, BarChart3, Download } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/contexts/auth-context";
import { useEffect } from "react";

type Hub = 'scheduler' | 'practice' | 'learning';

const SchedulerNav = ({ pathname, isCoach, teamSlug }: { pathname: string; isCoach: boolean; teamSlug: string }) => {
    return (
        <>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/${teamSlug}/dashboard`} tooltip="Dashboard">
                  <Link href={`/${teamSlug}/dashboard`}><LayoutDashboard /><span>Dashboard</span></Link>
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
              </>
            )}
        </>
    );
};

const PracticeNav = ({ pathname, isCoach, teamSlug }: { pathname: string; isCoach: boolean; teamSlug: string }) => (
  <>
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pathname.startsWith(`/${teamSlug}/dashboard/practice-dashboard`)} tooltip="Dashboard">
        <Link href={`/${teamSlug}/dashboard/practice-dashboard`}><LayoutDashboard /><span>Dashboard</span></Link>
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
  const [activeHub, setActiveHub] = React.useState<Hub>('scheduler');
  const [isMounted, setIsMounted] = React.useState(false);

  // Redirect superadmins to their own portal
  useEffect(() => {
    if (!isLoading && user?.role === 'superadmin') {
      router.push('/superadmin/dashboard');
    }
  }, [user, isLoading, router]);

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
             <Button variant="ghost" className="w-full justify-start p-2 h-auto text-left">
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
                    {activeHub === 'scheduler' ? 'Schedule Hub' : `${activeHub} Hub`}
                </div>
                <ToggleGroup type="single" value={activeHub} onValueChange={handleHubChange} className="w-full grid grid-cols-3">
                    <ToggleGroupItem value="scheduler" aria-label="Scheduler Hub" className="flex-1">
                        <Calendar className="h-4 w-4" />
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
              {activeHub === 'scheduler' && <SchedulerNav pathname={pathname} isCoach={user?.role === 'coach'} teamSlug={teamSlug} />}
              {activeHub === 'practice' && <PracticeNav pathname={pathname} isCoach={user?.role === 'coach'} teamSlug={teamSlug} />}
              {activeHub === 'learning' && <LearningNav pathname={pathname} teamSlug={teamSlug} />}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
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
