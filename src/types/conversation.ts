export type AIModel = 
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "mixtral-8x7b-32768"
  | "gemma-7b-it"
  | "openai/gpt-oss-120b"
  | "openai/gpt-oss-20b";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface ConversationNode {
  id: string;
  model: AIModel;
  title: string;
  messages: Message[];
  parentId: string | null;
  position: { x: number; y: number };
  createdAt: number;
}

export interface ConversationGraph {
  nodes: ConversationNode[];
  activeNodeId: string | null;
}
