import type { Session, User } from "@/lib/types";
import SessionCard from "./session-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User as UserIcon } from "lucide-react";
import { cn, getRoleBasedColor } from "@/lib/utils";
import type { SessionStatus } from "@/lib/types";
import Link from "next/link";
import React from "react";

interface SessionListProps {
  sessions: Session[];
  onSessionUpdated: (session: Session) => void;
  users: User[];
  viewMode?: 'card' | 'list';
}

const statusColors: Record<SessionStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800",
  booked: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800",
  completed: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  cancelled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
};

export default function SessionList({ sessions, onSessionUpdated, users, viewMode = 'card' }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center h-96">
        <h3 className="text-xl font-semibold font-headline">No Sessions Found</h3>
        <p className="text-muted-foreground mt-2">
          Try adjusting your filters or create a new session.
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {sessions.map((session) => {
          const host = users.find((u) => u.id === session.hostId);
          const client = users.find((u) => u.id === session.clientId);

          return (
            <Card key={session.id} className={cn(
              "hover:bg-accent/50 transition-colors",
              session.status === 'booked' && 'bg-purple-50 dark:bg-purple-900/30',
              session.status === 'cancelled' && 'bg-red-50 dark:bg-red-900/30'
            )}>
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline text-base font-semibold truncate">{session.title}</h3>
                    <Badge className={cn("capitalize flex-shrink-0 text-xs", statusColors[session.status])}>{session.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.time}
                    </span>
                    {session.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.room}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {host ? (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className={cn(getRoleBasedColor(host.role), "text-[8px]")}>
                            {host.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{host.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Host unassigned</span>
                    )}
                    {client && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className={cn(getRoleBasedColor(client.role), "text-[8px]")}>
                              {client.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{client.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="ml-4 flex-shrink-0">
                  <Link href={`/dashboard/sessions/${session.id}`}>View</Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onSessionUpdated={onSessionUpdated} users={users} />
      ))}
    </div>
  );
}
