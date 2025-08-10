import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getToolStatus, DELETE as cancelToolExecution } from '../tool-execution/[toolCallId]/status/route';
import { GET as getActiveExecutions, DELETE as cancelAllExecutions } from '../tool-execution/active/route';
import { GET as getExecutionHistory, DELETE as clearExecutionHistory } from '../tool-execution/history/route';
import { toolExecutionManager } from '@/lib/services/ToolExecutionManager';

// Mock the ToolExecutionManager
vi.mock('@/lib/services/ToolExecutionManager', () => ({
  toolExecutionManager: {
    getActiveExecutions: vi.fn(),
    getExecutionHistory: vi.fn(),
    clearHistory: vi.fn(),
    cancelExecution: vi.fn(),
    getExecutionStats: vi.fn(),
  },
}));

describe('Tool Execution API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/tool-execution/[toolCallId]/status', () => {
    it('should return active execution status', async () => {
      const mockActiveExecution = {
        toolCall: { id: 'test-tool-1' },
        sessionId: 'session-1',
        startTime: new Date(),
        timeout: 30000,
        toolName: 'test_tool',
        serverId: 'test-server',
      };

      (toolExecutionManager.getActiveExecutions as any).mockReturnValue([mockActiveExecution]);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/test-tool-1/status');
      const response = await getToolStatus(request, { params: { toolCallId: 'test-tool-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('active');
      expect(data.toolCallId).toBe('test-tool-1');
    });

    it('should return completed execution from history', async () => {
      (toolExecutionManager.getActiveExecutions as any).mockReturnValue([]);
      (toolExecutionManager.getExecutionHistory as any).mockReturnValue([
        {
          toolCallId: 'test-tool-1',
          sessionId: 'session-1',
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          executionTime: 1000,
          toolName: 'test_tool',
          serverId: 'test-server',
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/test-tool-1/status');
      const response = await getToolStatus(request, { params: { toolCallId: 'test-tool-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.result).toBe('success');
    });

    it('should return 404 for non-existent tool execution', async () => {
      (toolExecutionManager.getActiveExecutions as any).mockReturnValue([]);
      (toolExecutionManager.getExecutionHistory as any).mockReturnValue([]);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/non-existent/status');
      const response = await getToolStatus(request, { params: { toolCallId: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('should return 400 for missing toolCallId', async () => {
      const request = new NextRequest('http://localhost:3000/api/tool-execution//status');
      const response = await getToolStatus(request, { params: { toolCallId: '' } });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/tool-execution/[toolCallId]/status', () => {
    it('should cancel active execution', async () => {
      (toolExecutionManager.cancelExecution as any).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/test-tool-1/status', {
        method: 'DELETE',
      });
      const response = await cancelToolExecution(request, { params: { toolCallId: 'test-tool-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.toolCallId).toBe('test-tool-1');
      expect(toolExecutionManager.cancelExecution).toHaveBeenCalledWith('test-tool-1');
    });

    it('should return 404 for non-existent execution', async () => {
      (toolExecutionManager.cancelExecution as any).mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/non-existent/status', {
        method: 'DELETE',
      });
      const response = await cancelToolExecution(request, { params: { toolCallId: 'non-existent' } });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tool-execution/active', () => {
    it('should return active executions', async () => {
      const mockActiveExecutions = [
        {
          toolCall: { id: 'tool-1', function: { name: 'test_tool', arguments: '{}' }, serverId: 'server-1' },
          sessionId: 'session-1',
          startTime: new Date(),
        },
      ];

      (toolExecutionManager.getActiveExecutions as any).mockReturnValue(mockActiveExecutions);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/active');
      const response = await getActiveExecutions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activeExecutions).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should filter by sessionId', async () => {
      const mockActiveExecutions = [
        {
          toolCall: { id: 'tool-1', function: { name: 'test_tool', arguments: '{}' }, serverId: 'server-1' },
          sessionId: 'session-1',
          startTime: new Date(),
        },
      ];

      (toolExecutionManager.getActiveExecutions as any).mockReturnValue(mockActiveExecutions);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/active?sessionId=session-1');
      const response = await getActiveExecutions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activeExecutions).toHaveLength(1);
    });
  });

  describe('DELETE /api/tool-execution/active', () => {
    it('should cancel all active executions', async () => {
      const mockActiveExecutions = [
        {
          toolCall: { id: 'tool-1' },
          sessionId: 'session-1',
        },
        {
          toolCall: { id: 'tool-2' },
          sessionId: 'session-1',
        },
      ];

      (toolExecutionManager.getActiveExecutions as any).mockReturnValue(mockActiveExecutions);
      (toolExecutionManager.cancelExecution as any).mockReturnValue(true);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/active', {
        method: 'DELETE',
      });
      const response = await cancelAllExecutions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cancelledCount).toBe(2);
      expect(toolExecutionManager.cancelExecution).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /api/tool-execution/history', () => {
    it('should return execution history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          toolCallId: 'tool-1',
          sessionId: 'session-1',
          toolName: 'test_tool',
          serverId: 'server-1',
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          executionTime: 1000,
        },
      ];

      const mockStats = {
        total: 1,
        successful: 1,
        failed: 0,
        timeout: 0,
        cancelled: 0,
        averageExecutionTime: 1000,
        toolBreakdown: { test_tool: 1 },
      };

      (toolExecutionManager.getExecutionHistory as any).mockReturnValue(mockHistory);
      (toolExecutionManager.getExecutionStats as any).mockReturnValue(mockStats);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/history?includeStats=true');
      const response = await getExecutionHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.stats).toBeDefined();
    });

    it('should filter by sessionId and limit', async () => {
      (toolExecutionManager.getExecutionHistory as any).mockReturnValue([]);

      const request = new NextRequest('http://localhost:3000/api/tool-execution/history?sessionId=session-1&limit=10');
      await getExecutionHistory(request);

      expect(toolExecutionManager.getExecutionHistory).toHaveBeenCalledWith('session-1', 10);
    });
  });

  describe('DELETE /api/tool-execution/history', () => {
    it('should clear execution history', async () => {
      const request = new NextRequest('http://localhost:3000/api/tool-execution/history', {
        method: 'DELETE',
      });
      const response = await clearExecutionHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(toolExecutionManager.clearHistory).toHaveBeenCalledWith(undefined);
    });

    it('should clear history for specific session', async () => {
      const request = new NextRequest('http://localhost:3000/api/tool-execution/history?sessionId=session-1', {
        method: 'DELETE',
      });
      const response = await clearExecutionHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(toolExecutionManager.clearHistory).toHaveBeenCalledWith('session-1');
    });
  });

  describe('Error handling', () => {
    it('should handle internal server errors', async () => {
      (toolExecutionManager.getActiveExecutions as any).mockImplementation(() => {
        throw new Error('Internal error');
      });

      const request = new NextRequest('http://localhost:3000/api/tool-execution/active');
      const response = await getActiveExecutions(request);

      expect(response.status).toBe(500);
    });
  });
});