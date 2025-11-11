
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
import { Bell, MessageSquare, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";


export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const { firestore } = useFirebase();

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.id, 'notifications');
  }, [firestore, user]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);
  
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

  const unreadCount = notifications?.length || 0;

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
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
