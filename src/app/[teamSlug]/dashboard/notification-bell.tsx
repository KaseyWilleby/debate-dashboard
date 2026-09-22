
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
import { Bell, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";


export function NotificationBell() {
  const { user, isLoading } = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();

  // Only query for pending users if the current user is an admin
  const pendingUsersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isLoading || user.role !== 'admin') return null;
    return query(
      collection(firestore, 'users'),
      where('approved', '==', false)
    );
  }, [firestore, user, isLoading]);

  const { data: pendingUsers, isLoading: isPendingUsersLoading } = useCollection<User>(pendingUsersQuery);

  const pendingCount = pendingUsers?.length || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          {isLoading ? <Loader2 className="animate-spin" /> : <Bell />}
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Notifications</span>
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount}</Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pendingCount > 0 ? (
          <>
            {pendingUsers?.map((pendingUser) => (
              <DropdownMenuItem
                key={pendingUser.id}
                onClick={() => router.push('/dashboard/users')}
                className="cursor-pointer"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{pendingUser.name || 'New User'}</span>
                  <span className="text-xs text-muted-foreground">
                    Pending approval - {pendingUser.role}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/dashboard/users')}
              className="cursor-pointer justify-center text-primary"
            >
              View all pending approvals
            </DropdownMenuItem>
          </>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

