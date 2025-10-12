import { AIModel } from "@/types/conversation";

export interface ModelInfo {
  id: AIModel;
  name: string;
  color: string;
  description: string;
}

export const AI_MODELS: ModelInfo[] = [
  {
    id: "llama-3-8b",
    name: "Llama 3 8B",
    color: "model-llama",
    description: "Fast and efficient general-purpose model"
  },
  {
    id: "llama-3-70b",
    name: "Llama 3 70B",
    color: "model-llama",
    description: "Powerful reasoning and comprehension"
  },
  {
    id: "mixtral-8x7b",
    name: "Mixtral 8x7B",
    color: "model-mixtral",
    description: "Expert mixture model for diverse tasks"
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B",
    color: "model-mistral",
    description: "Balanced performance and speed"
  },
  {
    id: "gemma-7b",
    name: "Gemma 7B",
    color: "model-gemma",
    description: "Lightweight and efficient"
  }
];

export const getModelInfo = (modelId: AIModel): ModelInfo => {
  return AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
};
