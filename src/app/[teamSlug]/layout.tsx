"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Team } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface TeamLayoutProps {
  children: React.ReactNode;
}

export default function TeamLayout({ children }: TeamLayoutProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const [team, setTeam] = useState<Team | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    async function validateTeamAccess() {
      if (authLoading || !firestore) return;

      if (!user) {
        router.push("/login");
        return;
      }

      console.log('[Team Access] Validating access for:', {
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        approved: user.approved,
        targetTeamSlug: teamSlug
      });

      try {
        // Check if this is the pending approval route - allow unapproved users
        const isPendingApprovalRoute = window.location.pathname.includes('/pending-approval');

        // Check if this is the migration route - allow access for superadmins even if team doesn't exist
        const isMigrationRoute = window.location.pathname.includes('/migrate-to-multi-tenant');
        const isSuperAdmin = user.role === 'superadmin' || user.email === 'kaseywilleby@gmail.com';

        console.log('[Team Access] Is superadmin?', isSuperAdmin, '(role:', user.role, 'email:', user.email, ')');

        // If user is not approved and not on pending-approval page, redirect them
        if (!user.approved && !isPendingApprovalRoute && !isSuperAdmin) {
          console.log('[Team Access] User not approved - redirecting to pending-approval');
          router.push(`/${teamSlug}/dashboard/pending-approval`);
          return;
        }

        // Allow unapproved users to access the pending-approval page
        if (isPendingApprovalRoute && !user.approved) {
          console.log('[Team Access] Allowing access to pending-approval page');
          setTeam(null);
          setAccessDenied(false);
          setTeamLoading(false);
          return;
        }

        if (isMigrationRoute && isSuperAdmin) {
          // Allow superadmins to access migration page even if team doesn't exist yet
          console.log('[Team Access] Migration route - allowing superadmin access');
          setTeam(null);
          setAccessDenied(false);
          setTeamLoading(false);
          return;
        }

        // Fetch team document
        const teamDoc = await getDoc(doc(firestore, "teams", teamSlug));

        if (!teamDoc.exists()) {
          // Team doesn't exist
          console.log('[Team Access] Team not found:', teamSlug);

          // Allow superadmins to access even non-existent teams (for testing/setup)
          if (isSuperAdmin) {
            console.log('[Team Access] Superadmin accessing non-existent team - allowing access');
            setTeam(null);
            setAccessDenied(false);
            setTeamLoading(false);
            return;
          }

          setAccessDenied(true);
          setTeamLoading(false);
          return;
        }

        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
        console.log('[Team Access] Team found:', teamData.id, teamData.name);

        // Check if user has access to this team
        // Superadmins can access any team
        // Other users can only access their own team
        const hasTeamAccess = isSuperAdmin || user.teamId === teamData.id;

        console.log('[Team Access] Access check:', {
          isSuperAdmin,
          userTeamId: user.teamId,
          teamDataId: teamData.id,
          hasAccess: hasTeamAccess
        });

        if (hasTeamAccess) {
          setTeam(teamData);
          setAccessDenied(false);
        } else {
          console.log('[Team Access] ACCESS DENIED');
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
