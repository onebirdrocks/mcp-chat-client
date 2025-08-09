// Basic types for the application
export interface MCPServer {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolCallId?: string;
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

// Legacy interface for backward compatibility
export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'assistant';
}

// Settings-related types
export type LLMProvider = 'openai' | 'deepseek' | 'openrouter';
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh';

export interface ModelInfo {
  id: string;
  name: string;
  supportsToolCalling: boolean;
  maxTokens: number;
}

export interface LLMProviderConfig {
  id: string;
  name: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  models: ModelInfo[];
  enabled: boolean;
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

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderAnnouncements: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  largeText: boolean;
}

export interface UserPreferences {
  theme: Theme;
  language: Language;
  autoScroll: boolean;
  soundEnabled: boolean;
  accessibility?: AccessibilityPreferences;
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
  // Note: apiKey is now handled securely by the backend
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

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
  serverId: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
