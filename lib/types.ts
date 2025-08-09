// Core types for the unified Next.js architecture

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  tokenCount?: number;
  processingTime?: number;
  model?: string;
  temperature?: number;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
  serverId: string;
  approved?: boolean;
  executionTime?: number;
  result?: string;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  provider: string;
  model: string;
  mcpServers?: string[];
  totalTokens?: number;
  estimatedCost?: number;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status?: 'connected' | 'disconnected' | 'error' | 'connecting';
  tools?: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
  serverId: string;
  category?: string;
  dangerous?: boolean;
  requiresConfirmation: boolean;
}

export interface LLMProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: ModelInfo[];
  enabled: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  supportsToolCalling: boolean;
  maxTokens?: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

// API Request/Response types
export interface ChatRequest {
  messages: Message[];
  sessionId: string;
  provider: string;
  model: string;
  mcpServers?: string[];
  stream?: boolean;
  temperature?: number;
}

export interface ChatResponse {
  reply?: string;
  toolCalls?: ToolCall[];
  sessionId: string;
  usage?: TokenUsage;
  error?: string;
  messageId?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RunToolRequest {
  toolCall: ToolCall;
  sessionId: string;
  messages: Message[];
  approved: boolean;
}

export interface RunToolResponse {
  result: string;
  reply?: string;
  error?: string;
  executionTime: number;
  messageId?: string;
  usage?: TokenUsage;
}

export interface CancelToolRequest {
  toolCallId: string;
  sessionId: string;
  reason?: string;
}

export interface CancelToolResponse {
  success: boolean;
  message: string;
}