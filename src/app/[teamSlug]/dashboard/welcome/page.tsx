
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Gavel, BookOpen, Award } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

type Hub = 'team' | 'tournament' | 'practice' | 'learning';

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const { user } = useAuth();

  const handleHubSelection = (hub: Hub) => {
    localStorage.setItem('activeHub', hub);

    // Navigate to the appropriate hub's first page
    if (hub === 'team') {
      router.push(`/${teamSlug}/dashboard`);
    } else if (hub === 'tournament') {
      router.push(`/${teamSlug}/dashboard/tournament-history`);
    } else if (hub === 'practice') {
      router.push(`/${teamSlug}/dashboard/practice-dashboard`);
    } else if (hub === 'learning') {
      router.push(`/${teamSlug}/dashboard/learning-hub`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome, {user?.name}!</h1>
        <p className="text-muted-foreground">
          Choose a hub below to explore different features of your debate dashboard.
        </p>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleHubSelection('team')}>
                <div className="mb-4 text-primary">
                    <Users size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Team Hub</CardTitle>
                <CardDescription className="mb-4">
                  {user?.role === 'coach' || user?.role === 'superadmin'
                    ? 'Manage your team\'s sessions, assignments, and appointments. Access user administration, team options, and video dashboard for coaching.'
                    : 'Book one-on-one coaching sessions, view assignments, and schedule appointments with coaches and officers.'}
                </CardDescription>
                <Button onClick={() => handleHubSelection('team')}>Go to Team Hub</Button>
            </Card>
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleHubSelection('tournament')}>
                <div className="mb-4 text-primary">
                    <Award size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Tournament Hub</CardTitle>
                <CardDescription className="mb-4">
                  {user?.role === 'coach' || user?.role === 'superadmin'
                    ? 'Create and manage tournaments, track student registrations, import tournament results, and view competition history for your entire team.'
                    : 'Register for upcoming tournaments, view your competition history, and track your tournament results and placements.'}
                </CardDescription>
                <Button onClick={() => handleHubSelection('tournament')}>Go to Tournament Hub</Button>
            </Card>
             <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleHubSelection('practice')}>
                <div className="mb-4 text-primary">
                    <Gavel size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Practice Hub</CardTitle>
                <CardDescription className="mb-4">
                  Practice speeches and debate rounds with AI-powered tools. Record yourself for extemp, impromptu, oratory,
                  and other events. Review your recordings, track your progress with analytics, and participate in debate practice rounds.
                </CardDescription>
                <Button onClick={() => handleHubSelection('practice')}>Go to Practice Hub</Button>
            </Card>
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleHubSelection('learning')}>
                <div className="mb-4 text-primary">
                    <BookOpen size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Learning Hub</CardTitle>
                <CardDescription className="mb-4">
                  Access curated tutorials, rules, and resources for all debate and speech events. Learn about Lincoln-Douglas,
                  Public Forum, Policy, interpretation events, and more. Watch expert videos and read comprehensive guides.
                </CardDescription>
                <Button onClick={() => handleHubSelection('learning')}>Go to Learning Hub</Button>
            </Card>
      </div>
    </div>
  );
}
