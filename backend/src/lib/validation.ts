import { ValidationError } from './errors';
import { ChatRequest, RunToolRequest, LLMProvider } from '@/types';

export function validateChatRequest(data: any): ChatRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  const { 
    messages, 
    sessionId, 
    provider, 
    model, 
    apiKey, 
    baseUrl, 
    systemPrompt, 
    temperature, 
    maxTokens, 
    availableTools 
  } = data;

  if (!Array.isArray(messages)) {
    throw new ValidationError('Messages must be an array');
  }

  if (messages.length === 0) {
    throw new ValidationError('Messages array cannot be empty');
  }

  // Validate each message
  messages.forEach((message: any, index: number) => {
    if (!message.id || typeof message.id !== 'string' || message.id.trim().length === 0) {
      throw new ValidationError(`Message at index ${index} must have a valid non-empty id`);
    }
    
    // Validate message ID format (prevent injection)
    if (!/^[a-zA-Z0-9_-]+$/.test(message.id)) {
      throw new ValidationError(`Message at index ${index} has invalid ID format`);
    }
    
    if (!message.role || !['user', 'assistant', 'tool', 'system'].includes(message.role)) {
      throw new ValidationError(`Message at index ${index} must have a valid role`);
    }
    
    if (typeof message.content !== 'string') {
      throw new ValidationError(`Message at index ${index} must have string content`);
    }

    // Validate content length
    validateStringLength(message.content, `Message ${index} content`, 50000);

    // Sanitize message content to prevent XSS
    message.content = sanitizeInput(message.content);
    
    // Validate timestamp if present
    if (message.timestamp && !(message.timestamp instanceof Date) && isNaN(Date.parse(message.timestamp))) {
      throw new ValidationError(`Message at index ${index} has invalid timestamp`);
    }
    
    // Validate tool calls if present
    if (message.toolCalls && Array.isArray(message.toolCalls)) {
      message.toolCalls.forEach((toolCall: any, toolIndex: number) => {
        validateToolCall(toolCall, `Message ${index}, tool call ${toolIndex}`);
      });
    }
  });

  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID must be a valid string');
  }
  
  // Validate session ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    throw new ValidationError('Session ID contains invalid characters');
  }
  
  validateStringLength(sessionId, 'Session ID', 100);

  if (!provider || !['openai', 'deepseek', 'openrouter'].includes(provider)) {
    throw new ValidationError('Provider must be one of: openai, deepseek, openrouter');
  }

  if (!model || typeof model !== 'string') {
    throw new ValidationError('Model must be a valid string');
  }

  // Validate optional parameters
  if (apiKey !== undefined && typeof apiKey !== 'string') {
    throw new ValidationError('API key must be a string');
  }

  if (baseUrl !== undefined && typeof baseUrl !== 'string') {
    throw new ValidationError('Base URL must be a string');
  }

  if (systemPrompt !== undefined && typeof systemPrompt !== 'string') {
    throw new ValidationError('System prompt must be a string');
  }

  if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
    throw new ValidationError('Temperature must be a number between 0 and 2');
  }

  if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens <= 0)) {
    throw new ValidationError('Max tokens must be a positive number');
  }

  if (availableTools !== undefined && !Array.isArray(availableTools)) {
    throw new ValidationError('Available tools must be an array');
  }

  return {
    messages: messages.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    })),
    sessionId,
    provider: provider as LLMProvider,
    model,
    apiKey,
    baseUrl,
    systemPrompt,
    temperature,
    maxTokens,
    availableTools,
  };
}

export function validateRunToolRequest(data: any): RunToolRequest {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  const { toolCall, sessionId, messages } = data;

  validateToolCall(toolCall, 'Tool call');

  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID must be a valid string');
  }

  if (!Array.isArray(messages)) {
    throw new ValidationError('Messages must be an array');
  }

  return {
    toolCall,
    sessionId,
    messages: messages.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    })),
  };
}

export function validateSettings(data: any) {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Settings must be a valid JSON object');
  }

  // Validate LLM providers if present
  if (data.llmProviders) {
    if (!Array.isArray(data.llmProviders)) {
      throw new ValidationError('LLM providers must be an array');
    }

    data.llmProviders.forEach((provider: any, index: number) => {
      if (!provider || typeof provider !== 'object') {
        throw new ValidationError(`LLM provider at index ${index} must be a valid object`);
      }

      if (!provider.id || typeof provider.id !== 'string') {
        throw new ValidationError(`LLM provider at index ${index} must have a valid id`);
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(provider.id)) {
        throw new ValidationError(`LLM provider at index ${index} has invalid ID format`);
      }

      if (!provider.name || !['openai', 'deepseek', 'openrouter'].includes(provider.name)) {
        throw new ValidationError(`LLM provider at index ${index} must have a valid name`);
      }

      // Only validate API key if it's provided, not empty, and not masked
      if (provider.apiKey && 
          typeof provider.apiKey === 'string' && 
          provider.apiKey.trim() !== '' && 
          !provider.apiKey.includes('*') && 
          !provider.apiKey.includes('•')) {
        validateApiKey(provider.apiKey, provider.name);
      }

      if (provider.baseUrl && typeof provider.baseUrl === 'string') {
        if (!validateUrl(provider.baseUrl)) {
          throw new ValidationError(`LLM provider at index ${index} has invalid base URL`);
        }
      }
    });
  }

  // Validate MCP servers if present
  if (data.mcpServers) {
    if (!Array.isArray(data.mcpServers)) {
      throw new ValidationError('MCP servers must be an array');
    }

    data.mcpServers.forEach((server: any, index: number) => {
      try {
        validateMCPServerConfig(server);
      } catch (error) {
        throw new ValidationError(`MCP server at index ${index}: ${error.message}`);
      }
    });
  }

  // Validate preferences if present
  if (data.preferences) {
    try {
      validateUserPreferences(data.preferences);
    } catch (error) {
      throw new ValidationError(`User preferences: ${error.message}`);
    }
  }

  return data;
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Enhanced XSS prevention
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/style\s*=\s*["'][^"']*expression\s*\(/gi, '')
    .trim();
}

export function validateStringLength(input: string, fieldName: string, maxLength: number = 1000): void {
  if (input.length > maxLength) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function validateToolCall(toolCall: any, context: string = 'Tool call'): void {
  if (!toolCall || typeof toolCall !== 'object') {
    throw new ValidationError(`${context} must be a valid object`);
  }

  if (!toolCall.id || typeof toolCall.id !== 'string') {
    throw new ValidationError(`${context} must have a valid id`);
  }

  // Validate tool call ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(toolCall.id)) {
    throw new ValidationError(`${context} has invalid ID format`);
  }

  if (toolCall.type !== 'function') {
    throw new ValidationError(`${context} type must be "function"`);
  }

  if (!toolCall.function || typeof toolCall.function !== 'object') {
    throw new ValidationError(`${context} must have a valid function object`);
  }

  if (!toolCall.function.name || typeof toolCall.function.name !== 'string') {
    throw new ValidationError(`${context} function must have a valid name`);
  }

  // Validate function name format (prevent injection)
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(toolCall.function.name)) {
    throw new ValidationError(`${context} function name has invalid format`);
  }

  validateStringLength(toolCall.function.name, `${context} function name`, 100);

  if (typeof toolCall.function.arguments !== 'string') {
    throw new ValidationError(`${context} function arguments must be a string`);
  }

  // Validate arguments as JSON
  try {
    JSON.parse(toolCall.function.arguments);
  } catch {
    throw new ValidationError(`${context} function arguments must be valid JSON`);
  }

  validateStringLength(toolCall.function.arguments, `${context} function arguments`, 10000);
}

export function validateApiKey(apiKey: string, provider: string): void {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ValidationError('API key must be a valid string');
  }

  // Basic length validation
  if (apiKey.length < 10) {
    throw new ValidationError('API key is too short');
  }

  if (apiKey.length > 200) {
    throw new ValidationError('API key is too long');
  }

  // Provider-specific validation
  switch (provider) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        throw new ValidationError('OpenAI API key must start with "sk-"');
      }
      break;
    case 'deepseek':
      if (!apiKey.startsWith('sk-')) {
        throw new ValidationError('DeepSeek API key must start with "sk-"');
      }
      break;
    case 'openrouter':
      if (!apiKey.startsWith('sk-or-')) {
        throw new ValidationError('OpenRouter API key must start with "sk-or-"');
      }
      break;
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\s/,  // No whitespace allowed
    /[<>]/,  // No angle brackets
    /javascript:/i,  // No javascript protocol
    /data:/i,  // No data URLs
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(apiKey)) {
      throw new ValidationError('API key contains invalid characters');
    }
  }
}

export function validateMCPServerConfig(config: any): void {
  if (!config || typeof config !== 'object') {
    throw new ValidationError('MCP server config must be a valid object');
  }

  if (!config.id || typeof config.id !== 'string') {
    throw new ValidationError('MCP server config must have a valid id');
  }

  // Validate ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(config.id)) {
    throw new ValidationError('MCP server config ID has invalid format');
  }

  if (!config.name || typeof config.name !== 'string') {
    throw new ValidationError('MCP server config must have a valid name');
  }

  validateStringLength(config.name, 'MCP server name', 100);

  if (!config.command || typeof config.command !== 'string') {
    throw new ValidationError('MCP server config must have a valid command');
  }

  // Validate command (prevent command injection)
  if (!/^[a-zA-Z0-9_./\-]+$/.test(config.command)) {
    throw new ValidationError('MCP server command contains invalid characters');
  }

  if (!Array.isArray(config.args)) {
    throw new ValidationError('MCP server args must be an array');
  }

  // Validate each argument
  config.args.forEach((arg: any, index: number) => {
    if (typeof arg !== 'string') {
      throw new ValidationError(`MCP server arg at index ${index} must be a string`);
    }
    validateStringLength(arg, `MCP server arg ${index}`, 500);
  });

  // Validate environment variables if present
  if (config.env && typeof config.env === 'object') {
    Object.entries(config.env).forEach(([key, value]) => {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new ValidationError('MCP server environment variables must be strings');
      }
      
      // Validate environment variable names
      if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
        throw new ValidationError(`Invalid environment variable name: ${key}`);
      }
      
      validateStringLength(key, 'Environment variable name', 100);
      validateStringLength(value as string, 'Environment variable value', 1000);
    });
  }
}

export function validateUserPreferences(preferences: any): void {
  if (!preferences || typeof preferences !== 'object') {
    throw new ValidationError('User preferences must be a valid object');
  }

  if (preferences.theme && !['light', 'dark', 'system'].includes(preferences.theme)) {
    throw new ValidationError('Theme must be one of: light, dark, system');
  }

  if (preferences.language && !['en', 'zh'].includes(preferences.language)) {
    throw new ValidationError('Language must be one of: en, zh');
  }

  if (preferences.autoScroll !== undefined && typeof preferences.autoScroll !== 'boolean') {
    throw new ValidationError('autoScroll must be a boolean');
  }

  if (preferences.soundEnabled !== undefined && typeof preferences.soundEnabled !== 'boolean') {
    throw new ValidationError('soundEnabled must be a boolean');
  }
}