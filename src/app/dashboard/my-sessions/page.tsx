
"use client";

import { useMemo, useState } from "react";
import type { Session, User } from "@/lib/types";
import SessionList from "@/components/dashboard/session-list";
import { Loader2, LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, or, where, updateDoc, doc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useAuth } from "@/contexts/auth-context";

export default function MySessionsPage() {
  const { firestore } = useFirebase();
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;

  // View mode state
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    if (typeof window === 'undefined') return 'card';
    return (localStorage.getItem('my-sessions-view-mode') as 'card' | 'list') || 'card';
  });

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('my-sessions-view-mode', mode);
  };

  const mySessionsQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, 'sessions'),
      or(
        where('hostId', '==', userId),
        where('clientId', '==', userId)
      )
    );
  }, [firestore, userId]);

  const { data: mySessions, isLoading: isSessionsLoading } = useCollection<Session>(mySessionsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading) return null;
    return collection(firestore, 'users');
  }, [firestore, user, isAuthLoading]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  const handleSessionUpdated = (updatedSession: Session) => {
    if (!firestore) return;
    const sessionDocRef = doc(firestore, 'sessions', updatedSession.id);
    updateDoc(sessionDocRef, { ...updatedSession }).catch(error => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: sessionDocRef.path,
        operation: 'update',
        requestResourceData: updatedSession
      }))
    })
  };
  
  const isLoading = isSessionsLoading || isAuthLoading || areUsersLoading;

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">My Sessions</h1>
          <p className="text-muted-foreground">
            A list of your upcoming and recent sessions.
          </p>
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && handleViewModeChange(value as 'card' | 'list')}>
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <SessionList sessions={mySessions || []} onSessionUpdated={handleSessionUpdated} users={allUsers || []} viewMode={viewMode} />
    </div>
  );
}
