"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Loader2, Image as ImageIcon, Paperclip } from "lucide-react";
import type { Conversation, ChatMessage } from "@/lib/types";
import { useFirebase, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { sendMessage } from "@/lib/messaging";
import { formatDistanceToNow } from "date-fns";
import { cn, getRoleBasedColor } from "@/lib/utils";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;
  const conversationId = params.conversationId as string;
  const { firestore } = useFirebase();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get conversation details
  const conversationDoc = useMemoFirebase(() => {
    if (!firestore || !conversationId) return null;
    return doc(firestore, 'conversations', conversationId);
  }, [firestore, conversationId]);

  const { data: conversation, isLoading: isConversationLoading } = useDoc<Conversation>(conversationDoc);

  // Get messages for this conversation
  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !conversationId) return null;
    return query(
      collection(firestore, `conversations/${conversationId}/messages`),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [firestore, conversationId]);

  const { data: messages, isLoading: isMessagesLoading } = useCollection<ChatMessage>(messagesQuery);

  // Reverse messages to show oldest first
  const orderedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].reverse();
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && orderedMessages.length > 0) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        setTimeout(() => {
          viewport.scrollTop = viewport.scrollHeight;
        }, 100);
      }
    }
  }, [orderedMessages]);

  // Get conversation title
  const conversationTitle = useMemo(() => {
    if (!conversation || !user) return 'Conversation';

    if (conversation.title) return conversation.title;

    // For direct messages, show the other participant's name
    if (conversation.type === 'direct') {
      const otherParticipantId = conversation.participants.find((id) => id !== user.id);
      if (otherParticipantId && conversation.participantDetails[otherParticipantId]) {
        return conversation.participantDetails[otherParticipantId].name;
      }
    }

    return 'Conversation';
  }, [conversation, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !firestore || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(
        firestore,
        conversationId,
        user.id,
        user.name,
        user.role,
        newMessage.trim()
      );
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (isAuthLoading || isConversationLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <h3 className="font-semibold text-lg mb-2">Conversation not found</h3>
          <p className="text-muted-foreground mb-4">
            This conversation may have been deleted or you don't have access to it.
          </p>
          <Button onClick={() => router.push(`/${teamSlug}/dashboard/messages`)}>
            Back to Messages
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="border-b p-4 flex items-center gap-4 bg-background shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${teamSlug}/dashboard/messages`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">{conversationTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {isMessagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orderedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Start the conversation by sending a message below
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orderedMessages.map((message) => {
              const isCurrentUser = user?.id === message.senderId;
              const sender = conversation.participantDetails[message.senderId];
              const initials = sender?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3",
                    isCurrentUser && "flex-row-reverse"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={sender ? getRoleBasedColor(sender.role as any) : ''}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "flex flex-col max-w-[70%]",
                    isCurrentUser ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "rounded-lg px-4 py-2 shadow-sm",
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      {!isCurrentUser && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {message.senderName}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 bg-background shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            title="Image upload coming soon"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            title="File upload coming soon"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
          />
          <Button type="submit" disabled={!newMessage.trim() || isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
