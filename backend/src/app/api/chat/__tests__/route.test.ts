import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the dependencies
vi.mock('@/services/LLMService');
vi.mock('@/services/SessionManager');
vi.mock('@/services/ChatProcessor');
vi.mock('@/lib/initialization');

describe('/api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 405 for non-POST requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'GET',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(405);
    expect(data.error).toBe('Method not allowed');
  });

  it('should validate request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should require API key', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            id: 'msg1',
            role: 'user',
            content: 'Hello',
            timestamp: new Date().toISOString(),
          },
        ],
        sessionId: 'session1',
        provider: 'openai',
        model: 'gpt-4',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message || data.error).toContain('API key is required');
  });

  it('should process valid chat request', async () => {
    // Mock the initialization
    const { ensureInitialized } = await import('@/lib/initialization');
    vi.mocked(ensureInitialized).mockResolvedValue();

    // Mock the LLM service
    const { createLLMService, getDefaultProviderConfig } = await import('@/services/LLMService');
    const mockLLMService = {
      generateCompletion: vi.fn().mockResolvedValue({
        content: 'Hello! How can I help you?',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 },
        finishReason: 'stop',
      }),
    };
    vi.mocked(createLLMService).mockReturnValue(mockLLMService as any);
    vi.mocked(getDefaultProviderConfig).mockReturnValue({
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
    });

    // Mock the session manager
    const { getSessionManager } = await import('@/services/SessionManager');
    const mockSessionManager = {
      getSession: vi.fn(),
      createSession: vi.fn(),
      addMessage: vi.fn(),
    };
    vi.mocked(getSessionManager).mockReturnValue(mockSessionManager as any);

    // Mock the chat processor
    const { createChatProcessor } = await import('@/services/ChatProcessor');
    const mockChatProcessor = {
      processQuery: vi.fn().mockResolvedValue({
        sessionId: 'session1',
        reply: 'Hello! How can I help you?',
        usage: { promptTokens: 10, completionTokens: 15, totalTokens: 25 },
        finishReason: 'stop',
      }),
    };
    vi.mocked(createChatProcessor).mockReturnValue(mockChatProcessor as any);

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          {
            id: 'msg1',
            role: 'user',
            content: 'Hello',
            timestamp: new Date().toISOString(),
          },
        ],
        sessionId: 'session1',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-test-key',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reply).toBe('Hello! How can I help you?');
    expect(data.sessionId).toBe('session1');
    expect(mockChatProcessor.processQuery).toHaveBeenCalledWith({
      messages: expect.arrayContaining([
        expect.objectContaining({
          id: 'msg1',
          role: 'user',
          content: 'Hello',
        }),
      ]),
      sessionId: 'session1',
      provider: 'openai',
      model: 'gpt-4',
      availableTools: [],
      systemPrompt: undefined,
      temperature: undefined,
      maxTokens: undefined,
    });
  });
});