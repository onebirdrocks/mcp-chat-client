/**
 * Test utilities and helpers for integration and e2e tests
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { ClientProviders } from '@/app/components/ClientProviders';

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ClientProviders>{children}</ClientProviders>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock data generators
export const createMockMessage = (overrides = {}) => ({
  id: `msg-${Date.now()}`,
  role: 'user' as const,
  content: 'Test message',
  timestamp: new Date(),
  ...overrides
});

export const createMockSession = (overrides = {}) => ({
  id: `session-${Date.now()}`,
  title: 'Test Session',
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  provider: 'openai',
  model: 'gpt-4',
  mcpServers: [],
  tags: [],
  archived: false,
  totalTokens: 0,
  estimatedCost: 0,
  ...overrides
});

export const createMockToolCall = (overrides = {}) => ({
  id: `tool-call-${Date.now()}`,
  type: 'function' as const,
  function: {
    name: 'test.tool',
    arguments: JSON.stringify({ param: 'value' })
  },
  serverId: 'test',
  approved: false,
  ...overrides
});

export const createMockProvider = (overrides = {}) => ({
  id: `provider-${Date.now()}`,
  name: 'openai',
  displayName: 'OpenAI',
  apiKey: 'sk-****1234',
  baseUrl: 'https://api.openai.com/v1',
  models: [
    {
      id: 'gpt-4',
      name: 'gpt-4',
      displayName: 'GPT-4',
      supportsToolCalling: true,
      maxTokens: 8192,
      costPer1kTokens: { input: 0.03, output: 0.06 }
    }
  ],
  enabled: true,
  rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 },
  ...overrides
});

export const createMockMCPServer = (overrides = {}) => ({
  id: `server-${Date.now()}`,
  name: 'test-server',
  displayName: 'Test Server',
  command: 'node',
  args: ['test.js'],
  env: {},
  enabled: true,
  status: 'connected' as const,
  tools: [
    {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: { param: { type: 'string' } },
        required: ['param']
      },
      serverId: 'test-server',
      requiresConfirmation: true
    }
  ],
  ...overrides
});

// Performance measurement utilities
export const measurePerformance = async (operation: () => Promise<void>) => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

// Wait utilities
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
) => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Stream utilities
export const createMockStream = (chunks: string[], chunkDelay = 10) => {
  let chunkIndex = 0;
  
  return new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        if (chunkIndex < chunks.length) {
          controller.enqueue(chunks[chunkIndex]);
          chunkIndex++;
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, chunkDelay);
    }
  });
};

// Error simulation utilities
export const createNetworkError = (message = 'Network error') => {
  const error = new Error(message);
  error.name = 'NetworkError';
  return error;
};

export const createTimeoutError = (message = 'Request timeout') => {
  const error = new Error(message);
  error.name = 'TimeoutError';
  return error;
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };