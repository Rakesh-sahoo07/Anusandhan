import { AIModel } from "@/types/conversation";

export interface ModelInfo {
  id: AIModel;
  name: string;
  color: string;
  description: string;
  provider: "groq" | "openai";
}

export const AI_MODELS: ModelInfo[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    color: "model-llama",
    description: "Most capable Llama model",
    provider: "groq"
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    color: "model-llama",
    description: "Fast and efficient",
    provider: "groq"
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    color: "model-mixtral",
    description: "Expert mixture model",
    provider: "groq"
  },
  {
    id: "gemma-7b-it",
    name: "Gemma 7B",
    color: "model-gemma",
    description: "Lightweight and efficient",
    provider: "groq"
  },
  {
    id: "openai/gpt-oss-120b",
    name: "openai/gpt-oss-120b",
    color: "model-openai",
    description: "OpenAI large model",
    provider: "openai"
  },
  {
    id: "openai/gpt-oss-20b",
    name: "openai/gpt-oss-20b",
    color: "model-openai",
    description: "OpenAI compact model",
    provider: "openai"
  }
];

export const getModelInfo = (modelId: AIModel): ModelInfo => {
  return AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
};
