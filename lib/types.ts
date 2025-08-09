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
  timeout?: number;
  maxConcurrency?: number;
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

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface LLMProviderCapabilities {
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
  maxTokens: number;
  supportedModels: string[];
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

// Session Management types
export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  provider: string;
  model: string;
  tags?: string[];
  archived?: boolean;
}

export interface SessionSearchOptions {
  query?: string;
  provider?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  archived?: boolean;
  tags?: string[];
}

export interface SessionSearchResult {
  sessions: ChatSessionSummary[];
  total: number;
  hasMore: boolean;
}

export interface SessionExport {
  version: string;
  exportDate: string;
  sessions: ChatSession[];
  metadata: {
    totalSessions: number;
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
}

export interface SessionImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface SessionStatistics {
  totalSessions: number;
  lastCleanup: string;
  providerBreakdown: Record<string, number>;
  averageMessagesPerSession: number;
  totalMessages: number;
  oldestSession: string | null;
  newestSession: string | null;
  averageSessionAge: number;
  sessionsWithSensitiveData: number;
}

export interface SessionCleanupResult {
  deletedSessions: number;
  clearedData: boolean;
}