"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SuperadminLayoutProps {
  children: React.ReactNode;
}

export default function SuperadminLayout({ children }: SuperadminLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== 'superadmin') {
        // Redirect non-superadmins to their team dashboard
        if (user.teamId) {
          router.push(`/${user.teamId}/dashboard`);
        } else {
          router.push("/login");
        }
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'superadmin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Superadmin Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold font-headline">Superadmin Portal</h1>
              <p className="text-xs text-muted-foreground">System Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/superadmin/dashboard">Dashboard</Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 px-4">
        {children}
      </main>
    </div>
  );
}
