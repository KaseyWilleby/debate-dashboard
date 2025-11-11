
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Session, User } from "@/lib/types";
import SessionList from "@/components/dashboard/session-list";
import { SessionFilters } from "@/components/dashboard/session-filters";
import CreateSessionDialog from "@/components/dashboard/create-session-dialog";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useAuth } from "@/contexts/auth-context";


export default function SessionManagerPage() {
  const { firestore } = useFirebase();
  const { user, isLoading: isAuthLoading } = useAuth();

  // View mode state
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    if (typeof window === 'undefined') return 'card';
    return (localStorage.getItem('session-manager-view-mode') as 'card' | 'list') || 'card';
  });

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('session-manager-view-mode', mode);
  };

  const sessionsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading) return null;
    return collection(firestore, 'sessions');
  }, [firestore, user, isAuthLoading]);

  const { data: allSessions, isLoading: isSessionsLoading } = useCollection<Session>(sessionsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading) return null;
    return collection(firestore, 'users');
  }, [firestore, user, isAuthLoading]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<User>(usersQuery);

  const [filters, setFilters] = useState<{
    status: string;
    hostId: string;
    clientId: string;
    date: Date | undefined;
    showCancelled: boolean;
  }>({
    status: "all",
    hostId: "all",
    clientId: "all",
    date: undefined,
    showCancelled: false,
  });

  const filteredSessions = useMemo(() => {
    if (!allSessions) return [];
    return allSessions.filter((session) => {
      // Hide cancelled sessions unless the checkbox is checked
      if (session.status === 'cancelled' && !filters.showCancelled) {
        return false;
      }

      const statusMatch =
        filters.status === "all" || session.status === filters.status;
      const hostMatch =
        filters.hostId === "all" || session.hostId === filters.hostId;
      const clientMatch =
        filters.clientId === "all" || session.clientId === filters.clientId;
      const dateMatch =
        !filters.date ||
        new Date(session.date).toDateString() === filters.date.toDateString();
      return statusMatch && hostMatch && clientMatch && dateMatch;
    });
  }, [allSessions, filters]);
  
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Session Manager</h1>
          <p className="text-muted-foreground">
            View, manage, and book your work sessions.
          </p>
        </div>
        <div className="flex gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && handleViewModeChange(value as 'card' | 'list')}>
            <ToggleGroupItem value="card" aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <CreateSessionDialog onSessionCreated={(session) => {
            // Session created callback - the real-time listener will pick it up automatically
          }}>
            <Button>
              <PlusCircle className="mr-2" />
              Create Session
            </Button>
          </CreateSessionDialog>
        </div>
      </div>

      <SessionFilters
        onFilterChange={setFilters}
        users={allUsers || []}
      />

      <SessionList sessions={filteredSessions} onSessionUpdated={handleSessionUpdated} users={allUsers || []} viewMode={viewMode} />
    </div>
  );
}
