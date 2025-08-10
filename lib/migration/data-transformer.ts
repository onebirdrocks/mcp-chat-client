// Data transformation utilities for migrating between formats

import { 
  LegacyChatSession, 
  LegacySettings, 
  LegacyMessage,
  LegacyLLMProviderConfig,
  LegacyMCPServerConfig,
  ValidationResult 
} from './types';
import { 
  ChatSession, 
  Settings, 
  Message,
  LLMProviderConfig,
  MCPServerConfig,
  UserPreferences,
  MessageMetadata,
  ToolCall
} from '../types';

/**
 * Transforms legacy chat session to new format
 */
export function transformChatSession(legacySession: LegacyChatSession): ChatSession {
  const transformedMessages: Message[] = legacySession.messages.map(transformMessage);

  return {
    id: legacySession.id,
    title: legacySession.title,
    messages: transformedMessages,
    createdAt: new Date(legacySession.createdAt),
    updatedAt: new Date(legacySession.updatedAt),
    provider: legacySession.provider,
    model: legacySession.model,
    mcpServers: legacySession.mcpServers || [],
    totalTokens: legacySession.totalTokens,
    estimatedCost: legacySession.estimatedCost,
  };
}

/**
 * Transforms legacy message to new format
 */
export function transformMessage(legacyMessage: LegacyMessage): Message {
  const message: Message = {
    id: legacyMessage.id,
    role: legacyMessage.role,
    content: legacyMessage.content,
    timestamp: new Date(legacyMessage.timestamp),
  };

  // Transform tool calls if present
  if (legacyMessage.toolCalls && legacyMessage.toolCalls.length > 0) {
    message.toolCalls = legacyMessage.toolCalls.map(transformToolCall);
  }

  if (legacyMessage.toolCallId) {
    message.toolCallId = legacyMessage.toolCallId;
  }

  // Add default metadata for new format
  message.metadata = {
    tokenCount: undefined, // Will be calculated if needed
    processingTime: undefined,
    model: undefined,
    temperature: undefined,
  };

  return message;
}

/**
 * Transforms legacy tool call to new format
 */
export function transformToolCall(legacyToolCall: any): ToolCall {
  return {
    id: legacyToolCall.id,
    type: 'function',
    function: {
      name: legacyToolCall.function.name,
      arguments: legacyToolCall.function.arguments,
    },
    serverId: legacyToolCall.serverId || 'unknown',
    approved: legacyToolCall.approved,
    executionTime: legacyToolCall.executionTime,
    result: legacyToolCall.result,
    error: legacyToolCall.error,
    // Add new fields with defaults
    status: legacyToolCall.error ? {
      stage: 'failed' as const,
      message: legacyToolCall.error,
      timestamp: new Date(),
    } : legacyToolCall.result ? {
      stage: 'completed' as const,
      timestamp: new Date(),
    } : {
      stage: 'pending' as const,
      timestamp: new Date(),
    },
  };
}

/**
 * Transforms legacy settings to new format
 */
export function transformSettings(legacySettings: LegacySettings): Settings {
  return {
    llmProviders: legacySettings.llmProviders.map(transformLLMProvider),
    mcpServers: legacySettings.mcpServers.map(transformMCPServer),
    preferences: transformUserPreferences(legacySettings.preferences),
  };
}

/**
 * Transforms legacy LLM provider config to new format
 */
export function transformLLMProvider(legacyProvider: LegacyLLMProviderConfig): LLMProviderConfig {
  return {
    id: legacyProvider.id,
    name: legacyProvider.name,
    apiKey: legacyProvider.apiKey, // Keep encrypted
    baseUrl: legacyProvider.baseUrl,
    models: legacyProvider.models.map(model => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName || model.name,
      supportsToolCalling: model.supportsToolCalling,
      maxTokens: model.maxTokens,
      costPer1kTokens: model.costPer1kTokens,
    })),
    enabled: legacyProvider.enabled,
  };
}

/**
 * Transforms legacy MCP server config to new format
 */
export function transformMCPServer(legacyServer: LegacyMCPServerConfig): MCPServerConfig {
  return {
    id: legacyServer.id,
    name: legacyServer.name,
    command: legacyServer.command,
    args: legacyServer.args,
    env: legacyServer.env,
    enabled: legacyServer.enabled,
    status: legacyServer.status,
    tools: legacyServer.tools?.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      serverId: legacyServer.id,
      category: tool.category,
      dangerous: tool.dangerous,
      requiresConfirmation: tool.requiresConfirmation ?? true,
    })),
    timeout: legacyServer.timeout,
    maxConcurrency: legacyServer.maxConcurrency,
  };
}

/**
 * Transforms legacy user preferences to new format
 */
export function transformUserPreferences(legacyPrefs: any): UserPreferences {
  return {
    theme: legacyPrefs.theme || 'system',
    language: legacyPrefs.language || 'en',
    autoScroll: legacyPrefs.autoScroll ?? true,
    soundEnabled: legacyPrefs.soundEnabled ?? false,
    accessibility: {
      highContrast: legacyPrefs.accessibility?.highContrast ?? false,
      reducedMotion: legacyPrefs.accessibility?.reducedMotion ?? false,
      screenReaderAnnouncements: legacyPrefs.accessibility?.screenReaderAnnouncements ?? true,
      keyboardNavigation: legacyPrefs.accessibility?.keyboardNavigation ?? true,
      focusVisible: legacyPrefs.accessibility?.focusVisible ?? true,
      largeText: legacyPrefs.accessibility?.largeText ?? false,
    },
  };
}

/**
 * Batch transforms multiple chat sessions
 */
export function transformChatSessions(
  legacySessions: Record<string, LegacyChatSession>
): { sessions: ChatSession[]; errors: string[] } {
  const sessions: ChatSession[] = [];
  const errors: string[] = [];

  for (const [sessionId, legacySession] of Object.entries(legacySessions)) {
    try {
      const transformedSession = transformChatSession(legacySession);
      sessions.push(transformedSession);
    } catch (error) {
      errors.push(`Failed to transform session ${sessionId}: ${error}`);
    }
  }

  return { sessions, errors };
}

/**
 * Validates transformed data against new schema
 */
export function validateTransformedData(data: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Basic structure validation
  if (!data) {
    result.valid = false;
    result.errors.push('Transformed data is null or undefined');
    return result;
  }

  // Validate sessions if present
  if (data.sessions) {
    if (!Array.isArray(data.sessions)) {
      result.valid = false;
      result.errors.push('Sessions must be an array in new format');
    } else {
      data.sessions.forEach((session: any, index: number) => {
        if (!session.id || typeof session.id !== 'string') {
          result.errors.push(`Session at index ${index} missing or invalid id`);
          result.valid = false;
        }
        if (!session.messages || !Array.isArray(session.messages)) {
          result.errors.push(`Session ${session.id} missing or invalid messages array`);
          result.valid = false;
        }
        if (!session.createdAt || !(session.createdAt instanceof Date)) {
          result.errors.push(`Session ${session.id} missing or invalid createdAt date`);
          result.valid = false;
        }
      });
    }
  }

  // Validate settings if present
  if (data.settings) {
    if (!data.settings.llmProviders || !Array.isArray(data.settings.llmProviders)) {
      result.errors.push('Settings missing or invalid llmProviders array');
      result.valid = false;
    }
    if (!data.settings.mcpServers || !Array.isArray(data.settings.mcpServers)) {
      result.errors.push('Settings missing or invalid mcpServers array');
      result.valid = false;
    }
    if (!data.settings.preferences) {
      result.errors.push('Settings missing preferences object');
      result.valid = false;
    }
  }

  return result;
}

/**
 * Normalizes data by fixing common issues
 */
export function normalizeTransformedData(data: any): any {
  if (!data) return data;

  const normalized = JSON.parse(JSON.stringify(data));

  // Normalize sessions
  if (normalized.sessions && Array.isArray(normalized.sessions)) {
    normalized.sessions.forEach((session: any) => {
      // Ensure dates are Date objects
      if (session.createdAt && typeof session.createdAt === 'string') {
        session.createdAt = new Date(session.createdAt);
      }
      if (session.updatedAt && typeof session.updatedAt === 'string') {
        session.updatedAt = new Date(session.updatedAt);
      }

      // Ensure mcpServers is an array
      if (!session.mcpServers) {
        session.mcpServers = [];
      }

      // Normalize messages
      if (session.messages && Array.isArray(session.messages)) {
        session.messages.forEach((message: any) => {
          if (message.timestamp && typeof message.timestamp === 'string') {
            message.timestamp = new Date(message.timestamp);
          }
          
          // Ensure metadata exists
          if (!message.metadata) {
            message.metadata = {};
          }
        });
      }
    });
  }

  // Normalize settings
  if (normalized.settings) {
    // Ensure accessibility settings exist
    if (normalized.settings.preferences && !normalized.settings.preferences.accessibility) {
      normalized.settings.preferences.accessibility = {
        highContrast: false,
        reducedMotion: false,
        screenReaderAnnouncements: true,
        keyboardNavigation: true,
        focusVisible: true,
        largeText: false,
      };
    }
  }

  return normalized;
}