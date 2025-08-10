// Export all services from the unified Next.js architecture

export {
  MCPClientManager,
  getMCPClientManager,
  initializeMCPClientManager,
  shutdownMCPClientManager,
  type MCPConnection,
  type MCPClientManagerOptions,
  type ToolExecutionResult,
  type ServerHealthStatus,
} from './MCPClientManager';

export {
  LLMService,
  getLLMService,
  initializeLLMService,
  type LLMChatRequest,
  type LLMChatResponse,
  type LLMStreamChunk,
  type LLMProviderCapabilities,
  type CostEstimate,
  type LLMProvider,
} from './LLMService';

export {
  SessionManager,
  getSessionManager,
  initializeSessionManager,
  shutdownSessionManager,
  type SessionStorage,
  type SessionManagerOptions,
} from './SessionManager';

export {
  ToolExecutionManager,
  toolExecutionManager,
  type ToolExecutionManagerConfig,
  type ToolExecutionContext,
} from './ToolExecutionManager';