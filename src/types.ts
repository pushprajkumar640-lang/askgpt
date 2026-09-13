export interface Attachment {
  name: string;
  type: string;
  data: string; // base64 string
  mimeType: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  attachment?: Attachment;
  rating?: "like" | "dislike" | null;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  apiUrl: string; // Optional custom API URL, or empty for default same-domain /api routes
  theme: "dark" | "light" | "system";
  autoSpeak: boolean;
  voiceName: string;
  speechRate: number;
}
