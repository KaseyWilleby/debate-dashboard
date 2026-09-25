
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Gavel, BookOpen } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

type Hub = 'scheduler' | 'practice' | 'learning';

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const { user } = useAuth();

  const handleHubSelection = (hub: Hub) => {
    localStorage.setItem('activeHub', hub);

    // Navigate to the appropriate hub's first page
    if (hub === 'scheduler') {
      router.push(`/${teamSlug}/dashboard`);
    } else if (hub === 'practice') {
      router.push(`/${teamSlug}/dashboard/extemp-practice`);
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

       <div className="grid gap-6 md:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleHubSelection('scheduler')}>
                <div className="mb-4 text-primary">
                    <Users size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Team Hub</CardTitle>
                <CardDescription className="mb-4">
                  {user?.role === 'coach' || user?.role === 'superadmin'
                    ? 'Manage your team\'s tournaments, sessions, and schedule. Create and organize tournaments, track student registrations, book coaching sessions, and access user administration tools.'
                    : 'View your team\'s tournaments and register for upcoming events. Book one-on-one coaching sessions, track your tournament registrations, and view your competition history.'}
                </CardDescription>
                <Button onClick={() => handleHubSelection('scheduler')}>Go to Team Hub</Button>
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
