
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Gavel, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

type Hub = 'scheduler' | 'practice' | 'learning';

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleHubSelection = (hub: Hub) => {
    localStorage.setItem('activeHub', hub);
    router.push('/dashboard');
    // A full refresh is needed to ensure layout re-renders with new local storage value
    setTimeout(() => window.location.reload(), 50);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome, {user?.name}!</h1>
        <p className="text-muted-foreground">
          Select a hub to get started.
        </p>
      </div>

       <div className="grid gap-6 md:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors">
                <div className="mb-4 text-primary">
                    <Calendar size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Scheduler</CardTitle>
                <CardDescription className="mb-4">Manage work sessions and tournaments.</CardDescription>
                <Button onClick={() => handleHubSelection('scheduler')}>Go to Scheduler</Button>
            </Card>
             <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors">
                <div className="mb-4 text-primary">
                    <Gavel size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Practice Hub</CardTitle>
                <CardDescription className="mb-4">Hone your skills for various events.</CardDescription>
                <Button onClick={() => handleHubSelection('practice')}>Go to Practice Hub</Button>
            </Card>
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 transition-colors">
                <div className="mb-4 text-primary">
                    <BookOpen size={48} />
                </div>
                <CardTitle className="font-headline text-2xl mb-2">Learning Hub</CardTitle>
                <CardDescription className="mb-4">Browse resources and improve your skills.</CardDescription>
                <Button onClick={() => handleHubSelection('learning')}>Go to Learning Hub</Button>
            </Card>
      </div>
    </div>
  );
}
