"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import type { User } from "@/lib/types";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { createOrGetDirectConversation } from "@/lib/messaging";
import { cn, getRoleBasedColor } from "@/lib/utils";

export default function NewMessagePage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;
  const { firestore } = useFirebase();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Get all users in the team
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading) return null;
    return query(
      collection(firestore, 'users'),
      where('teamId', '==', user.teamId)
    );
  }, [firestore, user, isAuthLoading]);

  const { data: allUsers, isLoading: isUsersLoading } = useCollection<User>(usersQuery);

  // Filter users based on search and exclude current user
  const filteredUsers = useMemo(() => {
    if (!allUsers || !user) return [];

    let filtered = allUsers.filter((u) => u.id !== user.id);

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((u) =>
        u.name.toLowerCase().includes(lowerQuery) ||
        u.email.toLowerCase().includes(lowerQuery) ||
        u.role.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered;
  }, [allUsers, user, searchQuery]);

  const handleStartConversation = async (otherUser: User) => {
    if (!user || !firestore || isCreating) return;

    setIsCreating(true);
    try {
      const conversationId = await createOrGetDirectConversation(
        firestore,
        user.teamId,
        user.id,
        otherUser.id,
        {
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        {
          name: otherUser.name,
          role: otherUser.role,
          avatarUrl: otherUser.avatarUrl,
        }
      );

      router.push(`/${teamSlug}/dashboard/messages/${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      setIsCreating(false);
    }
  };

  if (isAuthLoading || isUsersLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${teamSlug}/dashboard/messages`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Message</h1>
          <p className="text-muted-foreground">
            Select a team member to start a conversation
          </p>
        </div>
      </div>

      <Input
        placeholder="Search by name, email, or role..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try a different search term"
                : "There are no other users in your team"}
            </p>
          </Card>
        ) : (
          filteredUsers.map((otherUser) => {
            const initials = otherUser.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <Card
                key={otherUser.id}
                className={cn(
                  "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                  isCreating && "opacity-50 pointer-events-none"
                )}
                onClick={() => handleStartConversation(otherUser)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className={getRoleBasedColor(otherUser.role)}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{otherUser.name}</h3>
                      <Badge variant="outline" className="capitalize">
                        {otherUser.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {otherUser.email}
                    </p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
