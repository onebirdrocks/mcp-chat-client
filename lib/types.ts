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
  status?: ToolExecutionStatus;
  progress?: ToolExecutionProgress;
  executionHistory?: ToolExecutionHistoryEntry[];
}

export interface ToolExecutionStatus {
  stage: 'pending' | 'validating' | 'connecting' | 'executing' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  message?: string;
  timestamp: Date;
  progress?: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
}

export interface ToolExecutionProgress {
  stage: 'validating' | 'connecting' | 'executing' | 'processing' | 'completed';
  message?: string;
  progress?: number; // 0-100
  timestamp: Date;
  details?: Record<string, any>;
}

export interface ToolExecutionHistoryEntry {
  id: string;
  toolCallId: string;
  sessionId: string;
  toolName: string;
  serverId: string;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
  parameters: Record<string, any>;
  result?: string;
  error?: string;
  progress?: ToolExecutionProgress[];
  metadata?: {
    retryCount?: number;
    timeoutDuration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
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
  timeout?: number; // milliseconds
  enableRealTimeUpdates?: boolean;
}

export interface RunToolResponse {
  result: string;
  reply?: string;
  error?: string;
  executionTime: number;
  messageId?: string;
  usage?: TokenUsage;
  status?: ToolExecutionStatus;
  historyEntry?: ToolExecutionHistoryEntry;
}

export interface ToolExecutionUpdate {
  type: 'status' | 'progress' | 'error' | 'timeout' | 'completed';
  toolCallId: string;
  sessionId: string;
  status?: ToolExecutionStatus;
  progress?: ToolExecutionProgress;
  error?: string;
  result?: string;
  timestamp: Date;
}

export interface ToolExecutionTimeoutConfig {
  default: number; // Default timeout in milliseconds
  perTool: Record<string, number>; // Tool-specific timeouts
  maxTimeout: number; // Maximum allowed timeout
  warningThreshold: number; // Show warning after this duration
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

// Additional types for API responses
export interface ChatHistoryResponse {
  sessions: ChatSessionSummary[];
  total: number;
  hasMore: boolean;
}

export interface Settings {
  llmProviders: LLMProviderConfig[];
  mcpServers: MCPServerConfig[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: Theme;
  language: Language;
  autoScroll: boolean;
  soundEnabled: boolean;
  accessibility: AccessibilitySettings;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderAnnouncements: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  largeText: boolean;
}

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh';

export interface ApiError {
  error?: string;
  message?: string;
  statusCode?: number;
}