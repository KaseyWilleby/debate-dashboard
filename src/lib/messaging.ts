import {
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  doc,
  Firestore,
} from 'firebase/firestore';
import type { Conversation, ChatMessage, User } from './types';

/**
 * Create or get existing direct message conversation between two users
 */
export async function createOrGetDirectConversation(
  firestore: Firestore,
  teamId: string,
  userId1: string,
  userId2: string,
  user1Data: { name: string; role: string; avatarUrl?: string },
  user2Data: { name: string; role: string; avatarUrl?: string }
): Promise<string> {
  // Check if conversation already exists
  const conversationsRef = collection(firestore, 'conversations');
  const q = query(
    conversationsRef,
    where('teamId', '==', teamId),
    where('type', '==', 'direct'),
    where('participants', 'array-contains', userId1)
  );

  const snapshot = await getDocs(q);

  // Find existing conversation with both users
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.participants.includes(userId2)) {
      return docSnap.id;
    }
  }

  // Create new conversation
  const cleanUser1Data: any = { name: user1Data.name, role: user1Data.role };
  if (user1Data.avatarUrl) cleanUser1Data.avatarUrl = user1Data.avatarUrl;

  const cleanUser2Data: any = { name: user2Data.name, role: user2Data.role };
  if (user2Data.avatarUrl) cleanUser2Data.avatarUrl = user2Data.avatarUrl;

  const newConversation: Omit<Conversation, 'id'> = {
    teamId,
    type: 'direct',
    participants: [userId1, userId2],
    participantDetails: {
      [userId1]: cleanUser1Data,
      [userId2]: cleanUser2Data,
    },
    createdBy: userId1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await addDoc(conversationsRef, newConversation);
  return docRef.id;
}

/**
 * Create a group conversation
 */
export async function createGroupConversation(
  firestore: Firestore,
  teamId: string,
  title: string,
  participantIds: string[],
  participantDetails: { [userId: string]: { name: string; role: string; avatarUrl?: string } },
  createdBy: string
): Promise<string> {
  const conversationsRef = collection(firestore, 'conversations');

  // Filter out undefined values from participant details
  const cleanParticipantDetails: any = {};
  for (const [userId, userData] of Object.entries(participantDetails)) {
    cleanParticipantDetails[userId] = { name: userData.name, role: userData.role };
    if (userData.avatarUrl) {
      cleanParticipantDetails[userId].avatarUrl = userData.avatarUrl;
    }
  }

  const newConversation: Omit<Conversation, 'id'> = {
    teamId,
    type: 'group',
    title,
    participants: participantIds,
    participantDetails: cleanParticipantDetails,
    createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await addDoc(conversationsRef, newConversation);
  return docRef.id;
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  firestore: Firestore,
  conversationId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  content: string,
  type: 'text' | 'image' | 'document' | 'video' = 'text',
  fileUrl?: string,
  fileName?: string,
  fileSize?: number,
  fileMimeType?: string
): Promise<string> {
  const messagesRef = collection(firestore, `conversations/${conversationId}/messages`);

  // Build message object without undefined values
  const newMessage: any = {
    conversationId,
    senderId,
    senderName,
    senderRole: senderRole as any,
    content,
    type,
    timestamp: new Date().toISOString(),
    readBy: [senderId], // Sender has read their own message
    deliveredTo: [],
  };

  // Only add optional fields if they have values
  if (fileUrl) newMessage.fileUrl = fileUrl;
  if (fileName) newMessage.fileName = fileName;
  if (fileSize !== undefined) newMessage.fileSize = fileSize;
  if (fileMimeType) newMessage.fileMimeType = fileMimeType;

  const docRef = await addDoc(messagesRef, newMessage);

  // Update conversation's last message
  const conversationRef = doc(firestore, 'conversations', conversationId);
  await updateDoc(conversationRef, {
    lastMessage: {
      content: type === 'text' ? content : `Sent a ${type}`,
      senderId,
      senderName,
      timestamp: new Date().toISOString(),
      type,
    },
    updatedAt: new Date().toISOString(),
  });

  return docRef.id;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  firestore: Firestore,
  conversationId: string,
  messageIds: string[],
  userId: string
): Promise<void> {
  // Note: In a real implementation, you'd want to use a batch write
  // For now, we'll update them individually
  for (const messageId of messageIds) {
    const messageRef = doc(firestore, `conversations/${conversationId}/messages`, messageId);
    // This would need to properly add userId to the readBy array
    // For now, this is a placeholder - you'd need to use arrayUnion in updateDoc
  }
}
