/** Shared API types (mirror of the backend contracts — see worklog Tasks 3 & 8). */

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
  auth: string;
  model: string;
  time: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
