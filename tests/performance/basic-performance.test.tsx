/**
 * Basic Performance Tests
 * Tests system performance under various conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock components to avoid complex dependencies
vi.mock('@/src/components/MessageList', () => ({
  MessageList: ({ messages }: { messages: any[] }) => (
    <div data-testid="message-list">
      {messages.map((msg, index) => (
        <div key={index} data-testid={`message-${index}`}>
          {msg.content}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/app/components/ClientProviders', () => ({
  ClientProviders: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="client-providers">{children}</div>
  ),
}));

// Performance measurement utilities
const measurePerformance = async (operation: () => Promise<void>) => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

const createLargeMessageHistory = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: (i % 2 === 0 ? 'user' : 'assistant') as const,
    content: `This is message ${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
    timestamp: new Date(Date.now() - (count - i) * 60000),
    metadata: {
      tokenCount: 50,
      processingTime: 1000 + Math.random() * 2000,
      model: 'gpt-4'
    }
  }));
};

const createMockStream = (chunks: string[], chunkDelay = 10) => {
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

describe('Basic Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering Performance', () => {
    it('should render small message list quickly', async () => {
      const { MessageList } = await import('@/src/components/MessageList');
      const messages = createLargeMessageHistory(10);

      const renderTime = await measurePerformance(async () => {
        render(<MessageList messages={messages} />);
        
        await waitFor(() => {
          expect(screen.getByTestId('message-list')).toBeInTheDocument();
        });
      });

      // Small list should render very quickly (< 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should render medium message list efficiently', async () => {
      const { MessageList } = await import('@/src/components/MessageList');
      const messages = createLargeMessageHistory(100);

      const renderTime = await measurePerformance(async () => {
        render(<MessageList messages={messages} />);
        
        await waitFor(() => {
          expect(screen.getByTestId('message-list')).toBeInTheDocument();
        });
      });

      // Medium list should render reasonably quickly (< 500ms)
      expect(renderTime).toBeLessThan(500);
    });

    it('should render large message list within acceptable time', async () => {
      const { MessageList } = await import('@/src/components/MessageList');
      const messages = createLargeMessageHistory(500);

      const renderTime = await measurePerformance(async () => {
        render(<MessageList messages={messages} />);
        
        await waitFor(() => {
          expect(screen.getByTestId('message-list')).toBeInTheDocument();
        });
      });

      // Large list should render within acceptable time (< 2000ms)
      expect(renderTime).toBeLessThan(2000);
    });
  });

  describe('Streaming Performance', () => {
    it('should handle fast streaming efficiently', async () => {
      const chunks = Array.from({ length: 50 }, (_, i) => `Chunk ${i + 1} `);
      const stream = createMockStream(chunks, 5); // Very fast streaming

      const processingTime = await measurePerformance(async () => {
        const reader = stream.getReader();
        const results: string[] = [];
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            results.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        expect(results).toHaveLength(50);
      });

      // Fast streaming should be processed quickly
      expect(processingTime).toBeLessThan(1000);
    });

    it('should handle large streaming content', async () => {
      const largeChunks = Array.from({ length: 200 }, (_, i) => 
        `Large chunk ${i + 1} with more content to simulate real streaming data. `.repeat(5)
      );
      const stream = createMockStream(largeChunks, 2);

      const processingTime = await measurePerformance(async () => {
        const reader = stream.getReader();
        const results: string[] = [];
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            results.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        expect(results).toHaveLength(200);
      });

      // Large streaming should complete within reasonable time
      expect(processingTime).toBeLessThan(3000);
    });
  });

  describe('Memory Performance', () => {
    it('should not accumulate excessive objects during operations', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Perform multiple operations that could potentially leak memory
      for (let i = 0; i < 10; i++) {
        const messages = createLargeMessageHistory(100);
        const { MessageList } = await import('@/src/components/MessageList');
        
        const { unmount } = render(<MessageList messages={messages} />);
        
        await waitFor(() => {
          expect(screen.getByTestId('message-list')).toBeInTheDocument();
        });
        
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 10MB)
      // Note: This is a basic check and may not be reliable in all environments
      if (performance.memory) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
      }
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle multiple concurrent renders', async () => {
      const { MessageList } = await import('@/src/components/MessageList');
      
      const concurrentTime = await measurePerformance(async () => {
        const renderPromises = Array.from({ length: 5 }, (_, i) => {
          const messages = createLargeMessageHistory(50);
          return new Promise<void>((resolve) => {
            const { unmount } = render(<MessageList messages={messages} />);
            
            waitFor(() => {
              expect(screen.getByTestId('message-list')).toBeInTheDocument();
            }).then(() => {
              unmount();
              resolve();
            });
          });
        });

        await Promise.all(renderPromises);
      });

      // Concurrent operations should complete within reasonable time
      expect(concurrentTime).toBeLessThan(2000);
    });

    it('should handle concurrent streaming operations', async () => {
      const concurrentTime = await measurePerformance(async () => {
        const streamPromises = Array.from({ length: 3 }, () => {
          const chunks = Array.from({ length: 30 }, (_, i) => `Stream chunk ${i + 1} `);
          const stream = createMockStream(chunks, 10);
          
          return new Promise<void>(async (resolve) => {
            const reader = stream.getReader();
            const results: string[] = [];
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                results.push(value);
              }
            } finally {
              reader.releaseLock();
            }

            expect(results).toHaveLength(30);
            resolve();
          });
        });

        await Promise.all(streamPromises);
      });

      // Concurrent streaming should complete efficiently
      expect(concurrentTime).toBeLessThan(1500);
    });
  });

  describe('User Interaction Performance', () => {
    it('should handle rapid user interactions', async () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <div>
            <button onClick={() => setCount(c => c + 1)}>
              Count: {count}
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      const button = screen.getByRole('button');

      const interactionTime = await measurePerformance(async () => {
        const user = userEvent.setup();
        
        // Simulate rapid clicking
        for (let i = 0; i < 20; i++) {
          await user.click(button);
        }

        await waitFor(() => {
          expect(button).toHaveTextContent('Count: 20');
        });
      });

      // Rapid interactions should be handled quickly
      expect(interactionTime).toBeLessThan(1000);
    });

    it('should handle form input performance', async () => {
      const TestForm = () => {
        const [value, setValue] = React.useState('');
        return (
          <div>
            <input 
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Type here..."
            />
            <div data-testid="output">{value}</div>
          </div>
        );
      };

      render(<TestForm />);
      const input = screen.getByPlaceholderText('Type here...');

      const typingTime = await measurePerformance(async () => {
        const user = userEvent.setup();
        
        // Type a long string
        const longText = 'This is a long text input to test typing performance. '.repeat(10);
        await user.type(input, longText);

        await waitFor(() => {
          expect(screen.getByTestId('output')).toHaveTextContent(longText);
        });
      });

      // Typing should be responsive
      expect(typingTime).toBeLessThan(3000);
    });
  });

  describe('Data Processing Performance', () => {
    it('should process large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        content: `Content for item ${i}`.repeat(10),
        timestamp: new Date(Date.now() - i * 1000),
        tags: [`tag-${i % 10}`, `category-${i % 5}`]
      }));

      const processingTime = await measurePerformance(async () => {
        // Simulate data processing operations
        const filtered = largeDataset.filter(item => item.id % 2 === 0);
        const sorted = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const mapped = sorted.map(item => ({
          ...item,
          summary: item.content.substring(0, 50) + '...'
        }));

        expect(mapped).toHaveLength(500);
        expect(mapped[0].summary).toBeDefined();
      });

      // Data processing should be efficient
      expect(processingTime).toBeLessThan(100);
    });

    it('should handle JSON parsing performance', async () => {
      const largeObject = {
        sessions: Array.from({ length: 100 }, (_, i) => ({
          id: `session-${i}`,
          messages: Array.from({ length: 50 }, (_, j) => ({
            id: `msg-${i}-${j}`,
            content: `Message ${j} in session ${i}`.repeat(5),
            timestamp: new Date().toISOString(),
            metadata: {
              tokens: Math.floor(Math.random() * 100),
              model: 'gpt-4',
              cost: Math.random() * 0.01
            }
          }))
        }))
      };

      const jsonString = JSON.stringify(largeObject);

      const parsingTime = await measurePerformance(async () => {
        const parsed = JSON.parse(jsonString);
        
        expect(parsed.sessions).toHaveLength(100);
        expect(parsed.sessions[0].messages).toHaveLength(50);
      });

      // JSON parsing should be fast
      expect(parsingTime).toBeLessThan(200);
    });
  });
});