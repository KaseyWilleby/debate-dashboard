
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

    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !user || isAuthLoading || user?.role !== 'admin') return null;
        return collection(firestore, 'users');
    }, [firestore, user, isAuthLoading]);

    const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

    const isLoading = isAuthLoading || (user?.role === 'admin' && areUsersLoading);

    if (user?.role !== 'admin' && !isAuthLoading) {
     return (
       <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
          <h3 className="text-xl font-semibold font-headline">Access Denied</h3>
          <p className="text-muted-foreground mt-2">
            You must be an administrator to access this page.
          </p>
        </div>
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  return <UsersPageContent allUsers={allUsers || []} />;
}
