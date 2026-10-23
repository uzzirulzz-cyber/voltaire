/** Shared API types (mirror of the backend contract — see worklog Task 3). */

export interface Conversation {
  id: string;
  uid: string;
  title: string;
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  createdAt: string;
}

export interface HealthStatus {
  ok: boolean;
  project: string;
  database: string;
  ai: string;
  model: string;
  time: string;
}
