"use client";

import { useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Conversation, User } from "@/lib/types";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const router = useRouter();
  const params = useParams();
  const teamSlug = params.teamSlug as string;
  const { firestore } = useFirebase();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Query conversations where user is a participant
  const conversationsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isAuthLoading) return null;
    return query(
      collection(firestore, 'conversations'),
      where('teamId', '==', user.teamId),
      where('participants', 'array-contains', user.id),
      orderBy('updatedAt', 'desc')
    );
  }, [firestore, user, isAuthLoading]);

  const { data: conversations, isLoading: isConversationsLoading } = useCollection<Conversation>(conversationsQuery);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!searchQuery) return conversations;

    const lowerQuery = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      // Search by participant names or conversation title
      if (conv.title?.toLowerCase().includes(lowerQuery)) return true;

      return Object.values(conv.participantDetails || {}).some((participant) =>
        participant.name.toLowerCase().includes(lowerQuery)
      );
    });
  }, [conversations, searchQuery]);

  // Get conversation title for display
  const getConversationTitle = (conversation: Conversation): string => {
    if (conversation.title) return conversation.title;

    // For direct messages, show the other participant's name
    if (conversation.type === 'direct' && user) {
      const otherParticipantId = conversation.participants.find((id) => id !== user.id);
      if (otherParticipantId && conversation.participantDetails[otherParticipantId]) {
        return conversation.participantDetails[otherParticipantId].name;
      }
    }

    return 'Conversation';
  };

  // Get unread count for a conversation
  const getUnreadCount = (conversation: Conversation): number => {
    // TODO: Implement proper unread count by querying messages
    return 0;
  };

  if (isAuthLoading || isConversationsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Chat with your team members
          </p>
        </div>
        <Button onClick={() => router.push(`/${teamSlug}/dashboard/messages/new`)}>
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      <Input
        placeholder="Search conversations..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      <div className="space-y-2">
        {filteredConversations.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquarePlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a new conversation to connect with your team
            </p>
            <Button onClick={() => router.push(`/${teamSlug}/dashboard/messages/new`)}>
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </Card>
        ) : (
          filteredConversations.map((conversation) => {
            const title = getConversationTitle(conversation);
            const unreadCount = getUnreadCount(conversation);
            const initials = title.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

            return (
              <Card
                key={conversation.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/${teamSlug}/dashboard/messages/${conversation.id}`)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{title}</h3>
                      {conversation.type === 'group' && (
                        <Badge variant="secondary" className="text-xs">
                          Group
                        </Badge>
                      )}
                      {conversation.type === 'announcement' && (
                        <Badge variant="default" className="text-xs">
                          Announcement
                        </Badge>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.senderName}: {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), { addSuffix: true })}
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
                        {unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
