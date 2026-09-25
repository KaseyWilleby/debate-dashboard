
"use client";

import UsersPageContent from "@/components/dashboard/users/page";
import { useAuth } from "@/contexts/auth-context";
import { User } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

export default function UsersPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { firestore } = useFirebase();

    const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'superadmin';

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user || isAuthLoading || !isCoachOrAdmin) return null;
        return collection(firestore, 'users');
    }, [firestore, user, isAuthLoading, isCoachOrAdmin]);

    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

    const isLoading = isAuthLoading || (isCoachOrAdmin && areUsersLoading);

    if (!isCoachOrAdmin && !isAuthLoading) {
     return (
       <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
          <h3 className="text-xl font-semibold font-headline">Access Denied</h3>
          <p className="text-muted-foreground mt-2">
            You must be a coach or administrator to access this page.
          </p>
        </div>
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  return <UsersPageContent allUsers={allUsers || []} />;
}
