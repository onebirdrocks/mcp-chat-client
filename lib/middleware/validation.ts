import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// XSS protection and input sanitization
export class InputValidator {
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
    });
  }

  // Sanitize plain text input
  static sanitizeText(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate and sanitize JSON input
  static sanitizeJson(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeText(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJson(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeJson(value);
      }
      return sanitized;
    }
    
    return input;
  }

  // Validate file paths to prevent directory traversal
  static validateFilePath(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, '/');
    
    // Check for directory traversal attempts
    if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
      return false;
    }
    
    // Check for absolute paths (should be relative)
    if (normalizedPath.startsWith('/') || /^[a-zA-Z]:/.test(normalizedPath)) {
      return false;
    }
    
    // Check for null bytes
    if (normalizedPath.includes('\0')) {
      return false;
    }
    
    return true;
  }

  // Validate API key format
  static validateApiKey(apiKey: string): boolean {
    // Basic API key validation - should be alphanumeric with some special chars
    const apiKeyRegex = /^[a-zA-Z0-9\-_\.]+$/;
    return apiKeyRegex.test(apiKey) && apiKey.length >= 10 && apiKey.length <= 200;
  }

  // Validate URL format
  static validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  // Validate session ID format
  static validateSessionId(sessionId: string): boolean {
    const sessionIdRegex = /^[a-zA-Z0-9\-_]+$/;
    return sessionIdRegex.test(sessionId) && sessionId.length >= 8 && sessionId.length <= 64;
  }
}

// Common validation schemas
export const ValidationSchemas = {
  // Chat message validation
  chatMessage: z.object({
    content: z.string().min(1).max(10000).transform(InputValidator.sanitizeText),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    sessionId: z.string().refine(InputValidator.validateSessionId, 'Invalid session ID'),
  }),

  // Settings validation
  llmProvider: z.object({
    id: z.string().min(1).max(50).transform(InputValidator.sanitizeText),
    name: z.enum(['openai', 'deepseek', 'openrouter']),
    apiKey: z.string().refine(InputValidator.validateApiKey, 'Invalid API key format'),
    baseUrl: z.string().optional().refine(
      (url) => !url || InputValidator.validateUrl(url),
      'Invalid URL format'
    ),
    enabled: z.boolean(),
  }),

  // MCP server configuration validation
  mcpServer: z.object({
    id: z.string().min(1).max(50).transform(InputValidator.sanitizeText),
    name: z.string().min(1).max(100).transform(InputValidator.sanitizeText),
    command: z.string().min(1).max(200).transform(InputValidator.sanitizeText),
    args: z.array(z.string().max(500).transform(InputValidator.sanitizeText)),
    env: z.record(z.string().max(1000).transform(InputValidator.sanitizeText)).optional(),
    enabled: z.boolean(),
  }),

  // Tool call validation
  toolCall: z.object({
    id: z.string().min(1).max(100).transform(InputValidator.sanitizeText),
    type: z.literal('function'),
    function: z.object({
      name: z.string().min(1).max(200).transform(InputValidator.sanitizeText),
      arguments: z.string().max(50000), // JSON string, will be parsed separately
    }),
  }),

  // Session validation
  session: z.object({
    id: z.string().refine(InputValidator.validateSessionId, 'Invalid session ID'),
    title: z.string().min(1).max(200).transform(InputValidator.sanitizeText),
    provider: z.string().min(1).max(50).transform(InputValidator.sanitizeText),
    model: z.string().min(1).max(100).transform(InputValidator.sanitizeText),
  }),

  // User preferences validation
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.enum(['en', 'zh']),
    autoScroll: z.boolean(),
    confirmToolCalls: z.boolean(),
    maxHistoryLength: z.number().min(10).max(10000),
  }),

  // Export request validation
  exportRequest: z.object({
    sessionIds: z.array(z.string().refine(InputValidator.validateSessionId)).optional(),
    format: z.enum(['json', 'markdown']),
    includeSensitiveData: z.boolean(),
  }),

  // File path validation
  filePath: z.string().refine(InputValidator.validateFilePath, 'Invalid file path'),
};

// Request body size limits by endpoint
export const BODY_SIZE_LIMITS = {
  '/api/chat': 100 * 1024, // 100KB
  '/api/run-tool': 50 * 1024, // 50KB
  '/api/settings': 10 * 1024, // 10KB
  '/api/sessions': 20 * 1024, // 20KB
  '/api/export': 5 * 1024, // 5KB
  default: 1024 * 1024, // 1MB
};

// Get body size limit for endpoint
export function getBodySizeLimit(pathname: string): number {
  for (const [path, limit] of Object.entries(BODY_SIZE_LIMITS)) {
    if (pathname.startsWith(path)) {
      return limit;
    }
  }
  return BODY_SIZE_LIMITS.default;
}

// Validate request body size
export function validateBodySize(body: string, pathname: string): boolean {
  const limit = getBodySizeLimit(pathname);
  return Buffer.byteLength(body, 'utf8') <= limit;
}