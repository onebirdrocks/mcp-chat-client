import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolExecutionManager } from '../ToolExecutionManager';
import { getMCPClientManager } from '../MCPClientManager';

// Mock the MCP client manager
vi.mock('../MCPClientManager', () => ({
  getMCPClientManager: vi.fn(),
}));

describe('ToolExecutionManager Integration Tests', () => {
  let manager: ToolExecutionManager;
  let mockMCPManager: any;

  beforeEach(() => {
    manager = new ToolExecutionManager();
    
    mockMCPManager = {
      executeTool: vi.fn(),
      getAllTools: vi.fn(),
      getServerTools: vi.fn(),
    };
    
    vi.mocked(getMCPClientManager).mockReturnValue(mockMCPManager);
  });

  afterEach(() => {
    manager.removeAllListeners();
  });

  describe('tool execution workflow', () => {
    it('should execute tool and emit events', async () => {
      const toolCall = {
        id: 'test-tool-1',
        type: 'function' as const,
        function: {
          name: 'filesystem.read_file',
          arguments: '{"path": "/test/file.txt"}',
        },
        serverId: 'filesystem',
      };

      mockMCPManager.executeTool.mockResolvedValue({
        success: true,
        result: 'File content here',
        executionTime: 150,
        serverId: 'filesystem',
        toolName: 'read_file',
      });

      const startSpy = vi.fn();
      const completeSpy = vi.fn();
      
      manager.on('executionStarted', startSpy);
      manager.on('executionCompleted', completeSpy);

      const result = await manager.executeToolCall(toolCall, 'session-1');

      expect(result.success).toBe(true);
      expect(result.result).toBe('File content here');
      expect(startSpy).toHaveBeenCalledWith({
        toolCallId: 'test-tool-1',
        sessionId: 'session-1',
        toolName: 'filesystem.read_file',
        status: 'running',
      });
      expect(completeSpy).toHaveBeenCalledWith({
        toolCallId: 'test-tool-1',
        sessionId: 'session-1',
        success: true,
        result: 'File content here',
        executionTime: 150,
      });
    });

    it('should handle tool execution failures', async () => {
      const toolCall = {
        id: 'test-tool-2',
        type: 'function' as const,
        function: {
          name: 'filesystem.write_file',
          arguments: '{"path": "/readonly/file.txt", "content": "test"}',
        },
        serverId: 'filesystem',
      };

      mockMCPManager.executeTool.mockResolvedValue({
        success: false,
        error: 'Permission denied',
        executionTime: 50,
        serverId: 'filesystem',
        toolName: 'write_file',
      });

      const errorSpy = vi.fn();
      manager.on('executionFailed', errorSpy);

      const result = await manager.executeToolCall(toolCall, 'session-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
      expect(errorSpy).toHaveBeenCalledWith({
        toolCallId: 'test-tool-2',
        sessionId: 'session-1',
        error: 'Permission denied',
        executionTime: 50,
      });
    });

    it('should handle concurrent tool executions', async () => {
      const toolCall1 = {
        id: 'concurrent-1',
        type: 'function' as const,
        function: {
          name: 'filesystem.read_file',
          arguments: '{"path": "/file1.txt"}',
        },
        serverId: 'filesystem',
      };

      const toolCall2 = {
        id: 'concurrent-2',
        type: 'function' as const,
        function: {
          name: 'filesystem.read_file',
          arguments: '{"path": "/file2.txt"}',
        },
        serverId: 'filesystem',
      };

      mockMCPManager.executeTool
        .mockResolvedValueOnce({
          success: true,
          result: 'Content 1',
          executionTime: 100,
          serverId: 'filesystem',
          toolName: 'read_file',
        })
        .mockResolvedValueOnce({
          success: true,
          result: 'Content 2',
          executionTime: 150,
          serverId: 'filesystem',
          toolName: 'read_file',
        });

      const [result1, result2] = await Promise.all([
        manager.executeToolCall(toolCall1, 'session-1'),
        manager.executeToolCall(toolCall2, 'session-1'),
      ]);

      expect(result1.success).toBe(true);
      expect(result1.result).toBe('Content 1');
      expect(result2.success).toBe(true);
      expect(result2.result).toBe('Content 2');
    });
  });

  describe('execution tracking', () => {
    it('should track active executions', async () => {
      const toolCall = {
        id: 'tracking-test',
        type: 'function' as const,
        function: {
          name: 'slow.operation',
          arguments: '{}',
        },
        serverId: 'slow',
      };

      // Mock a slow operation
      mockMCPManager.executeTool.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            result: 'Done',
            executionTime: 1000,
            serverId: 'slow',
            toolName: 'operation',
          }), 100)
        )
      );

      const executionPromise = manager.executeToolCall(toolCall, 'session-1');

      // Check that execution is tracked as active
      const activeExecutions = manager.getActiveExecutions();
      expect(activeExecutions).toHaveLength(1);
      expect(activeExecutions[0].toolCallId).toBe('tracking-test');
      expect(activeExecutions[0].status).toBe('running');

      await executionPromise;

      // Check that execution is no longer active
      const activeAfter = manager.getActiveExecutions();
      expect(activeAfter).toHaveLength(0);
    });

    it('should provide execution history', async () => {
      const toolCall = {
        id: 'history-test',
        type: 'function' as const,
        function: {
          name: 'test.tool',
          arguments: '{"param": "value"}',
        },
        serverId: 'test',
      };

      mockMCPManager.executeTool.mockResolvedValue({
        success: true,
        result: 'Test result',
        executionTime: 75,
        serverId: 'test',
        toolName: 'tool',
      });

      await manager.executeToolCall(toolCall, 'session-1');

      const history = manager.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].toolCallId).toBe('history-test');
      expect(history[0].sessionId).toBe('session-1');
      expect(history[0].success).toBe(true);
      expect(history[0].result).toBe('Test result');
    });

    it('should filter history by session', async () => {
      const toolCall1 = {
        id: 'session1-tool',
        type: 'function' as const,
        function: { name: 'test.tool1', arguments: '{}' },
        serverId: 'test',
      };

      const toolCall2 = {
        id: 'session2-tool',
        type: 'function' as const,
        function: { name: 'test.tool2', arguments: '{}' },
        serverId: 'test',
      };

      mockMCPManager.executeTool.mockResolvedValue({
        success: true,
        result: 'Result',
        executionTime: 50,
        serverId: 'test',
        toolName: 'tool',
      });

      await manager.executeToolCall(toolCall1, 'session-1');
      await manager.executeToolCall(toolCall2, 'session-2');

      const session1History = manager.getExecutionHistory('session-1');
      const session2History = manager.getExecutionHistory('session-2');

      expect(session1History).toHaveLength(1);
      expect(session1History[0].toolCallId).toBe('session1-tool');
      expect(session2History).toHaveLength(1);
      expect(session2History[0].toolCallId).toBe('session2-tool');
    });
  });

  describe('execution cancellation', () => {
    it('should cancel running executions', async () => {
      const toolCall = {
        id: 'cancel-test',
        type: 'function' as const,
        function: {
          name: 'long.running',
          arguments: '{}',
        },
        serverId: 'long',
      };

      // Mock a long-running operation
      mockMCPManager.executeTool.mockImplementation(() => 
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve({
            success: true,
            result: 'Completed',
            executionTime: 5000,
            serverId: 'long',
            toolName: 'running',
          }), 5000);

          // Simulate cancellation
          setTimeout(() => {
            clearTimeout(timeout);
            reject(new Error('Operation cancelled'));
          }, 100);
        })
      );

      const cancelSpy = vi.fn();
      manager.on('executionCancelled', cancelSpy);

      const executionPromise = manager.executeToolCall(toolCall, 'session-1');

      // Cancel the execution
      setTimeout(() => {
        manager.cancelExecution('cancel-test');
      }, 50);

      const result = await executionPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
      expect(cancelSpy).toHaveBeenCalledWith({
        toolCallId: 'cancel-test',
        sessionId: 'session-1',
        reason: 'User cancelled',
      });
    });

    it('should handle cancellation of non-existent execution', () => {
      expect(() => {
        manager.cancelExecution('non-existent');
      }).not.toThrow();
    });
  });

  describe('execution statistics', () => {
    it('should provide execution statistics', async () => {
      const toolCalls = [
        {
          id: 'stats-1',
          type: 'function' as const,
          function: { name: 'test.success', arguments: '{}' },
          serverId: 'test',
        },
        {
          id: 'stats-2',
          type: 'function' as const,
          function: { name: 'test.failure', arguments: '{}' },
          serverId: 'test',
        },
      ];

      mockMCPManager.executeTool
        .mockResolvedValueOnce({
          success: true,
          result: 'Success',
          executionTime: 100,
          serverId: 'test',
          toolName: 'success',
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Failed',
          executionTime: 50,
          serverId: 'test',
          toolName: 'failure',
        });

      await manager.executeToolCall(toolCalls[0], 'session-1');
      await manager.executeToolCall(toolCalls[1], 'session-1');

      const stats = manager.getExecutionStatistics();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(1);
      expect(stats.averageExecutionTime).toBe(75);
      expect(stats.totalExecutionTime).toBe(150);
    });

    it('should provide statistics by session', async () => {
      const toolCall = {
        id: 'session-stats',
        type: 'function' as const,
        function: { name: 'test.tool', arguments: '{}' },
        serverId: 'test',
      };

      mockMCPManager.executeTool.mockResolvedValue({
        success: true,
        result: 'Result',
        executionTime: 200,
        serverId: 'test',
        toolName: 'tool',
      });

      await manager.executeToolCall(toolCall, 'session-1');

      const sessionStats = manager.getExecutionStatistics('session-1');

      expect(sessionStats.totalExecutions).toBe(1);
      expect(sessionStats.successfulExecutions).toBe(1);
      expect(sessionStats.failedExecutions).toBe(0);
      expect(sessionStats.averageExecutionTime).toBe(200);
    });
  });

  describe('cleanup and resource management', () => {
    it('should clean up old execution history', () => {
      // Add some mock history entries
      const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      manager['executionHistory'] = [
        {
          toolCallId: 'old-1',
          sessionId: 'session-1',
          toolName: 'old.tool',
          startTime: oldDate,
          endTime: oldDate,
          success: true,
          result: 'Old result',
          executionTime: 100,
        },
        {
          toolCallId: 'recent-1',
          sessionId: 'session-1',
          toolName: 'recent.tool',
          startTime: new Date(),
          endTime: new Date(),
          success: true,
          result: 'Recent result',
          executionTime: 100,
        },
      ];

      const initialCount = manager.getExecutionHistory().length;
      expect(initialCount).toBe(2);

      // Clean up entries older than 12 hours
      manager.cleanupHistory(12 * 60 * 60 * 1000);

      const afterCleanup = manager.getExecutionHistory();
      expect(afterCleanup).toHaveLength(1);
      expect(afterCleanup[0].toolCallId).toBe('recent-1');
    });

    it('should handle cleanup with no history', () => {
      expect(() => {
        manager.cleanupHistory(24 * 60 * 60 * 1000);
      }).not.toThrow();
    });
  });
});