import { AIModel } from "@/types/conversation";

export interface ModelInfo {
  id: AIModel;
  name: string;
  color: string;
  description: string;
}

export const AI_MODELS: ModelInfo[] = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    color: "model-llama",
    description: "Most capable Llama model"
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B",
    color: "model-llama",
    description: "Fast and efficient"
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    color: "model-mixtral",
    description: "Expert mixture model"
  },
  {
    id: "gemma-7b-it",
    name: "Gemma 7B",
    color: "model-gemma",
    description: "Lightweight and efficient"
  }
];

export const getModelInfo = (modelId: AIModel): ModelInfo => {
  return AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
};
