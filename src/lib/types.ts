// 客户端类型定义（不包含服务器端依赖）

export interface Conversation {
  id: string;
  title: string;
  providerId: string;
  modelId: string;
  modelName: string;
  providerName: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  reasoningSteps?: string;
  timestamp: string;
}

// 默认的模型参数（客户端定义）
export const DEFAULT_MODEL_PARAMS = {
  systemPrompt: "You are a helpful AI assistant. Please provide clear, accurate, and helpful responses.",
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0
} as const;
