/**
 * Shared API serialization for PlayBeat AI routes.
 *
 * Lives in a private `_lib` folder (underscore-prefixed folders are excluded
 * from routing) so every endpoint returns the exact same JSON shapes:
 * dates as ISO strings, roles narrowed to 'user' | 'assistant'.
 */
import type { Conversation, Message } from '@prisma/client';

/** Conversation JSON contract shared with the frontend. */
export interface ConversationJSON {
  id: string;
  uid: string;
  title: string;
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Message JSON contract shared with the frontend. */
export interface MessageJSON {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  createdAt: string;
}

export function serializeConversation(
  conversation: Conversation
): ConversationJSON {
  return {
    id: conversation.id,
    uid: conversation.uid,
    title: conversation.title,
    model: conversation.model,
    messageCount: conversation.messageCount,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function serializeMessage(message: Message): MessageJSON {
  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
    model: message.model,
    createdAt: message.createdAt.toISOString(),
  };
}
