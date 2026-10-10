
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
import { Bell, Loader2, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, deleteDoc } from "firebase/firestore";
import type { User, Notification } from "@/lib/types";
import { useRouter, useParams } from "next/navigation";
import { Calendar, XCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";


export function NotificationBell() {
  const { user, isLoading } = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;

  // Query for notifications
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isLoading) return null;
    return collection(firestore, 'users', user.id, 'notifications');
  }, [firestore, user, isLoading]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);

  // Query for pending users if the current user is a coach or superadmin
  const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'superadmin';
  const pendingUsersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isLoading || !isCoachOrAdmin) return null;
    return query(
      collection(firestore, 'users'),
      where('teamId', '==', user.teamId),
      where('approved', '==', false)
    );
  }, [firestore, user, isLoading, isCoachOrAdmin]);

  const { data: allPendingUsers, isLoading: isPendingUsersLoading } = useCollection<User>(pendingUsersQuery);

  // Filter out deleted/archived users in JavaScript to handle users without deleted field
  const pendingUsers = allPendingUsers?.filter(u => u.deleted !== true) || [];
  const pendingCount = pendingUsers?.length || 0;

  const handleNotificationClick = async (notification: Notification) => {
    if (user && firestore) {
      const notifDocRef = doc(firestore, 'users', user.id, 'notifications', notification.id);
      try {
        await deleteDoc(notifDocRef);
      } catch (e) {
        console.error('Error deleting notification:', e);
      }
    }
    if (notification.relatedUrl) {
      router.push(notification.relatedUrl);
    }
  };

  const unreadCount = (notifications?.length || 0) + pendingCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          {isLoading ? <Loader2 className="animate-spin" /> : <Bell />}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
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
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Pending Approvals Section */}
        {isCoachOrAdmin && pendingCount > 0 && (
          <>
            <DropdownMenuItem
              onClick={() => router.push(`/${teamSlug}/dashboard/users`)}
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
        {notifications && notifications.length > 0 ? (
          notifications.map((notif) => (
            <DropdownMenuItem
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className="flex items-start gap-3 p-2 cursor-pointer"
            >
              <div className={cn("mt-1",
                notif.type === 'cancellation' ? 'text-destructive' :
                notif.type === 'booking' ? 'text-green-600' :
                'text-primary')}
              >
                {notif.type === "cancellation" ? (
                  <XCircle size={16} />
                ) : notif.type === "booking" ? (
                  <Calendar size={16} />
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
        ) : null}

        {/* Empty state */}
        {(!notifications || notifications.length === 0) && (!isCoachOrAdmin || pendingCount === 0) && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

