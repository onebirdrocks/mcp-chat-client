import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolExecutionManager } from '../ToolExecutionManager';
import type { ToolCall, MCPServerConfig } from '../../types';

describe('ToolExecutionManager', () => {
  let manager: ToolExecutionManager;
  let mockToolCall: ToolCall;
  let mockServerConfig: MCPServerConfig;

  beforeEach(() => {
    manager = new ToolExecutionManager({
      timeouts: {
        default: 5000,
        perTool: {
          'test-tool': 3000,
        },
        maxTimeout: 10000,
        warningThreshold: 2000,
      },
      maxConcurrentExecutions: 2,
      enableProgressTracking: true,
      enableHistoryLogging: true,
      retryAttempts: 1,
      retryDelay: 500,
    });

    mockToolCall = {
      id: 'test-tool-call-1',
      type: 'function',
      function: {
        name: 'test-tool',
        arguments: JSON.stringify({ param1: 'value1' }),
      },
      serverId: 'test-server',
    };

    mockServerConfig = {
      id: 'test-server',
      name: 'Test Server',
      command: 'test-command',
      args: [],
      enabled: true,
      status: 'connected',
    };
  });

  describe('basic functionality', () => {
    it('should create manager with default config', () => {
      const defaultManager = new ToolExecutionManager();
      expect(defaultManager).toBeDefined();
      expect(defaultManager.getActiveExecutions()).toHaveLength(0);
      expect(defaultManager.getExecutionHistory()).toHaveLength(0);
    });

    it('should execute tool successfully', async () => {
      const progressCallback = vi.fn();
      const statusCallback = vi.fn();

      const result = await manager.executeToolWithFeedback(
        mockToolCall,
        'test-session',
        mockServerConfig,
        progressCallback,
        statusCallback
      );

      expect(result.result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.historyEntry).toBeDefined();
      expect(result.historyEntry.status).toBe('success');
      expect(progressCallback).toHaveBeenCalled();
    }, 10000);

    it('should handle invalid tool arguments', async () => {
      const invalidToolCall = {
        ...mockToolCall,
        function: {
          ...mockToolCall.function,
          arguments: 'invalid-json',
        },
      };

      try {
        const result = await manager.executeToolWithFeedback(
          invalidToolCall,
          'test-session',
          mockServerConfig
        );

        expect(result.error).toContain('Invalid tool arguments JSON');
        expect(result.historyEntry.status).toBe('error');
      } catch (error) {
        // The error is thrown during validation, which is expected behavior
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid tool arguments JSON');
      }
    });

    it('should return false for cancelling non-existent execution', () => {
      const cancelled = manager.cancelExecution('non-existent-id');
      expect(cancelled).toBe(false);
    });

    it('should track execution history', async () => {
      await manager.executeToolWithFeedback(
        mockToolCall,
        'test-session',
        mockServerConfig
      );

      const history = manager.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].toolCallId).toBe(mockToolCall.id);
      expect(history[0].sessionId).toBe('test-session');
    }, 10000);

    it('should filter history by session', async () => {
      // Execute tool for session 1
      await manager.executeToolWithFeedback(
        mockToolCall,
        'test-session-1',
        mockServerConfig
      );

      // Execute tool for session 2
      const mockToolCall2 = { ...mockToolCall, id: 'test-tool-call-2' };
      await manager.executeToolWithFeedback(
        mockToolCall2,
        'test-session-2',
        mockServerConfig
      );

      const allHistory = manager.getExecutionHistory();
      expect(allHistory).toHaveLength(2);

      const session1History = manager.getExecutionHistory('test-session-1');
      expect(session1History).toHaveLength(1);
      expect(session1History[0].sessionId).toBe('test-session-1');
    }, 15000);

    it('should provide execution statistics', async () => {
      // Execute successful tool
      await manager.executeToolWithFeedback(
        mockToolCall,
        'test-session',
        mockServerConfig
      );

      const stats = manager.getExecutionStats();
      expect(stats.total).toBe(1);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.toolBreakdown['test-tool']).toBe(1);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
    }, 10000);

    it('should clear execution history', async () => {
      await manager.executeToolWithFeedback(
        mockToolCall,
        'test-session',
        mockServerConfig
      );

      expect(manager.getExecutionHistory()).toHaveLength(1);

      manager.clearHistory();
      expect(manager.getExecutionHistory()).toHaveLength(0);
    }, 10000);
  });
});