// Core data types for the MCP Chat UI backend

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  provider: LLMProvider;
  model: string;
  mcpServers: string[];
}

export type LLMProvider = 'openai' | 'deepseek' | 'openrouter';

export interface LLMProviderConfig {
  id: string;
  name: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  supportsToolCalling: boolean;
  maxTokens: number;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
  serverId: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
  autoScroll: boolean;
  soundEnabled: boolean;
}

export interface Settings {
  llmProviders: LLMProviderConfig[];
  mcpServers: MCPServerConfig[];
  preferences: UserPreferences;
}

// API Request/Response types
export interface ChatRequest {
  messages: Message[];
  sessionId: string;
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  availableTools?: MCPTool[];
}

export interface ChatResponse {
  reply?: string;
  toolCalls?: ToolCall[];
  sessionId: string;
  error?: string;
}

export interface RunToolRequest {
  toolCall: ToolCall;
  sessionId: string;
  messages: Message[];
}

export interface RunToolResponse {
  result: string;
  reply: string;
  error?: string;
}

export interface ChatHistoryResponse {
  sessions: ChatSessionSummary[];
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  provider: string;
  model: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}