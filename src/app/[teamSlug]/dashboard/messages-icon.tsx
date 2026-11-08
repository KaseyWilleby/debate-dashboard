"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Conversation } from "@/lib/types";
import { useRouter, useParams } from "next/navigation";

export function MessagesIcon() {
  const { user, isLoading } = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const teamSlug = params?.teamSlug as string;

  // Query conversations where user is a participant
  const conversationsQuery = useMemoFirebase(() => {
    if (!firestore || !user || isLoading) return null;
    return query(
      collection(firestore, 'conversations'),
      where('teamId', '==', user.teamId),
      where('participants', 'array-contains', user.id)
    );
  }, [firestore, user, isLoading]);

  const { data: conversations } = useCollection<Conversation>(conversationsQuery);

  // TODO: Calculate actual unread count from messages
  // For now, just show if there are conversations
  const unreadCount = 0;

  const handleClick = () => {
    router.push(`/${teamSlug}/dashboard/messages`);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9"
      onClick={handleClick}
    >
      {isLoading ? <Loader2 className="animate-spin" /> : <MessageSquare />}
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount}
        </Badge>
      )}
    </Button>
  );
}
