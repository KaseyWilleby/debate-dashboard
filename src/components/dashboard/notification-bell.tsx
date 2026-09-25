
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageSquare, XCircle, Loader2, UserCheck } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Notification, User as AppUser } from "@/lib/types";
import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";


export function NotificationBell() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;
  const { user } = useAuth();
  const { firestore } = useFirebase();

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.id, 'notifications');
  }, [firestore, user]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  // Fetch pending user approvals for coaches
  const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'superadmin';
  const pendingUsersQuery = useMemoFirebase(() => {
    if (!firestore || !user || !isCoachOrAdmin) return null;
    return query(
      collection(firestore, 'users'),
      where('teamId', '==', user.teamId),
      where('approved', '==', false)
    );
  }, [firestore, user, isCoachOrAdmin]);

  const { data: allPendingUsers } = useCollection<AppUser>(pendingUsersQuery);
  // Filter out deleted/archived users in JavaScript to handle users without deleted field
  const pendingUsers = allPendingUsers?.filter(u => u.deleted !== true) || [];
  const pendingCount = pendingUsers?.length || 0;

  // Debug logging
  React.useEffect(() => {
    console.log('[NotificationBell] Debug:', {
      isCoachOrAdmin,
      allPendingUsersCount: allPendingUsers?.length,
      pendingUsersCount: pendingUsers?.length,
      pendingCount,
      userRole: user?.role,
      userTeamId: user?.teamId,
      pendingUsers: pendingUsers?.map(u => ({ name: u.name, deleted: u.deleted, approved: u.approved }))
    });
  }, [isCoachOrAdmin, allPendingUsers, pendingUsers, pendingCount, user]);
  
  const handleNotificationClick = async (notification: Notification) => {
    if (user && firestore) {
      const notifDocRef = doc(firestore, 'users', user.id, 'notifications', notification.id);
      try {
        await deleteDoc(notifDocRef);
      } catch (e) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: notifDocRef.path, operation: 'delete'
        }));
      }
    }
    if (notification.relatedUrl) {
      router.push(notification.relatedUrl);
    }
  };

  const handlePendingApprovalsClick = () => {
    router.push(`/${teamSlug}/dashboard/users`);
  };

  const unreadCount = (notifications?.length || 0) + pendingCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          {isLoading ? <Loader2 className="animate-spin" /> : <Bell />}
          {!isLoading && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 ? (
              <Badge variant="secondary">{unreadCount} new</Badge>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Pending Approvals Section */}
        {isCoachOrAdmin && pendingCount > 0 && (
          <>
            <DropdownMenuItem
              onClick={handlePendingApprovalsClick}
              className="flex items-start gap-3 p-2 cursor-pointer bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500"
            >
              <div className="mt-1 text-yellow-600">
                <UserCheck size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug text-yellow-900 dark:text-yellow-100">
                  Pending User Approvals
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {pendingCount} user{pendingCount !== 1 ? 's' : ''} waiting for approval
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Regular Notifications */}
        {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notif) => (
            <DropdownMenuItem
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className="flex items-start gap-3 p-2 cursor-pointer"
            >
              <div className={cn("mt-1", notif.type === 'cancellation' ? 'text-destructive' : 'text-primary')}>
                {notif.type === "cancellation" ? (
                  <XCircle size={16} />
                ) : (
                  <MessageSquare size={16} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug">
                  {notif.title}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notif.message}
                </p>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          !isCoachOrAdmin || pendingCount === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : null
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
