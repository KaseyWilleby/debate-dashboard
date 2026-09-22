"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Team } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface TeamLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    teamSlug: string;
  }>;
}

export default function TeamLayout({ children, params }: TeamLayoutProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Unwrap params promise
  const { teamSlug } = use(params);

  useEffect(() => {
    async function validateTeamAccess() {
      if (authLoading || !firestore) return;

      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Check if this is the migration route - allow access for superadmins even if team doesn't exist
        const isMigrationRoute = window.location.pathname.includes('/migrate-to-multi-tenant');
        const isSuperAdmin = user.role === 'superadmin' || user.email === 'kaseywilleby@gmail.com';

        if (isMigrationRoute && isSuperAdmin) {
          // Allow superadmins to access migration page even if team doesn't exist yet
          setTeam(null);
          setAccessDenied(false);
          setTeamLoading(false);
          return;
        }

        // First, try to find the team by slug
        // For now, we'll use a simple approach - we'll need to add a teams collection
        // For the MVP, we'll just check if the teamSlug matches the user's teamId

        // Fetch team document
        const teamDoc = await getDoc(doc(firestore, "teams", teamSlug));

        if (!teamDoc.exists()) {
          // Team doesn't exist
          setAccessDenied(true);
          setTeamLoading(false);
          return;
        }

        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;

        // Check if user has access to this team
        // Superadmins can access any team
        // Other users can only access their own team
        if (user.role === 'superadmin' || user.teamId === teamData.id) {
          setTeam(teamData);
          setAccessDenied(false);
        } else {
          setAccessDenied(true);
        }
      } catch (error) {
        console.error("Error validating team access:", error);
        setAccessDenied(true);
      } finally {
        setTeamLoading(false);
      }
    }

    validateTeamAccess();
  }, [user, authLoading, teamSlug, router, firestore]);

  if (authLoading || teamLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-600">You don't have permission to access this team.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
