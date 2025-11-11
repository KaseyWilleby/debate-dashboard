
"use client";

import type { Session, Message, User } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn, getRoleBasedColor } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

export function SessionMessaging({ session, users, onMessageSent }: { session: Session, users: User[], onMessageSent: (message: Message) => void }) {
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [session.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      content: newMessage,
      timestamp: new Date().toISOString(),
    };
    
    onMessageSent(message);
    setNewMessage("");
  };
  
  return (
    <div className="flex flex-col h-[500px]">
      <ScrollArea className="flex-grow p-4 pr-6" ref={scrollAreaRef}>
        <div className="space-y-6">
          {session.messages.map((msg) => {
            const sender = users.find((u) => u.id === msg.senderId);
            const isCurrentUser = user?.id === sender?.id;
            if (!sender) return null;
            const initials = sender.name.split(" ").map(n => n[0]).join("");

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  isCurrentUser ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={cn(getRoleBasedColor(sender.role))}>{initials}</AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                  <div className={`max-w-xs rounded-lg px-3 py-2 shadow-sm ${
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                   <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="border-t p-4 bg-background/80">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send Message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
