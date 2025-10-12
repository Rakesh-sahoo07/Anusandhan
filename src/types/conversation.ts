export type AIModel = "llama-3-8b" | "llama-3-70b" | "mixtral-8x7b" | "mistral-7b" | "gemma-7b";

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
  messages: Message[];
  parentId: string | null;
  position: { x: number; y: number };
  createdAt: number;
}

export interface ConversationGraph {
  nodes: ConversationNode[];
  activeNodeId: string | null;
}
