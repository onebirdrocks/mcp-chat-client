/**
 * Integration tests for tool execution and confirmation workflows
 * Tests the complete tool execution flow from proposal to completion
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolConfirmationDialog } from '@/src/components/ToolConfirmationDialog';
import { ActiveToolExecutions } from '@/src/components/ActiveToolExecutions';
import { ToolExecutionHistory } from '@/src/components/ToolExecutionHistory';
import { ClientProviders } from '@/app/components/ClientProviders';
import * as apiClient from '@/src/services/apiClient';

// Mock API client
vi.mock('@/src/services/apiClient');

const mockApiClient = vi.mocked(apiClient);

describe('Tool Execution Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <ClientProviders>
        {component}
      </ClientProviders>
    );
  };

  describe('Tool Confirmation Dialog', () => {
    const mockToolCall = {
      id: 'tool-call-1',
      type: 'function' as const,
      function: {
        name: 'weather.get_weather',
        arguments: JSON.stringify({ location: 'New York', units: 'celsius' })
      },
      serverId: 'weather',
      approved: false
    };

    it('should display tool information correctly', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      renderWithProviders(
        <ToolConfirmationDialog
          toolCall={mockToolCall}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isOpen={true}
        />
      );

      // Verify tool details are displayed
      expect(screen.getByText('Tool Execution Confirmation')).toBeInTheDocument();
      expect(screen.getByText('weather.get_weather')).toBeInTheDocument();
      expect(screen.getByText(/location.*New York/i)).toBeInTheDocument();
      expect(screen.getByText(/units.*celsius/i)).toBeInTheDocument();

      // Verify action buttons
      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should handle tool confirmation', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      renderWithProviders(
        <ToolConfirmationDialog
          toolCall={mockToolCall}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isOpen={true}
        />
      );

      // Click run button
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      // Verify confirmation callback
      expect(onConfirm).toHaveBeenCalledWith(mockToolCall);
    });

    it('should handle tool cancellation', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      renderWithProviders(
        <ToolConfirmationDialog
          toolCall={mockToolCall}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isOpen={true}
        />
      );

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify cancellation callback
      expect(onCancel).toHaveBeenCalled();
    });

    it('should display dangerous tool warnings', async () => {
      const dangerousToolCall = {
        ...mockToolCall,
        function: {
          name: 'file.delete_file',
          arguments: JSON.stringify({ path: '/important/data.txt' })
        },
        serverId: 'file'
      };

      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      renderWithProviders(
        <ToolConfirmationDialog
          toolCall={dangerousToolCall}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isOpen={true}
          isDangerous={true}
        />
      );

      // Verify warning is displayed
      expect(screen.getByText(/dangerous operation/i)).toBeInTheDocument();
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();

      // Verify run button has warning style
      const runButton = screen.getByRole('button', { name: /run/i });
      expect(runButton).toHaveClass('bg-red-600');
    });

    it('should validate tool parameters', async () => {
      const invalidToolCall = {
        ...mockToolCall,
        function: {
          name: 'weather.get_weather',
          arguments: '{"invalid": "json"'  // Invalid JSON
        }
      };

      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      renderWithProviders(
        <ToolConfirmationDialog
          toolCall={invalidToolCall}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isOpen={true}
        />
      );

      // Verify error message for invalid parameters
      expect(screen.getByText(/invalid parameters/i)).toBeInTheDocument();

      // Verify run button is disabled
      const runButton = screen.getByRole('button', { name: /run/i });
      expect(runButton).toBeDisabled();
    });
  });

  describe('Active Tool Executions', () => {
    it('should display active tool executions', async () => {
      const mockActiveExecutions = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'running' as const,
          startTime: new Date(),
          progress: 50,
          parameters: { location: 'New York' }
        },
        {
          id: 'exec-2',
          toolCallId: 'tool-call-2',
          toolName: 'file.read_file',
          status: 'pending' as const,
          startTime: new Date(),
          progress: 0,
          parameters: { path: '/data/file.txt' }
        }
      ];

      mockApiClient.getActiveToolExecutions.mockResolvedValueOnce(mockActiveExecutions);

      renderWithProviders(<ActiveToolExecutions />);

      // Wait for executions to load
      await waitFor(() => {
        expect(screen.getByText('weather.get_weather')).toBeInTheDocument();
        expect(screen.getByText('file.read_file')).toBeInTheDocument();
      });

      // Verify status indicators
      expect(screen.getByText(/running/i)).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();

      // Verify progress indicators
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle tool execution cancellation', async () => {
      const user = userEvent.setup();
      
      const mockActiveExecutions = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'running' as const,
          startTime: new Date(),
          progress: 30,
          parameters: { location: 'New York' }
        }
      ];

      mockApiClient.getActiveToolExecutions.mockResolvedValueOnce(mockActiveExecutions);
      mockApiClient.cancelToolExecution.mockResolvedValueOnce({ success: true });

      renderWithProviders(<ActiveToolExecutions />);

      // Wait for execution to load
      await waitFor(() => {
        expect(screen.getByText('weather.get_weather')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Verify cancellation API call
      await waitFor(() => {
        expect(mockApiClient.cancelToolExecution).toHaveBeenCalledWith('tool-call-1');
      });
    });

    it('should update execution status in real-time', async () => {
      const mockActiveExecutions = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'running' as const,
          startTime: new Date(),
          progress: 30,
          parameters: { location: 'New York' }
        }
      ];

      // First call returns running status
      mockApiClient.getActiveToolExecutions.mockResolvedValueOnce(mockActiveExecutions);

      // Second call returns completed status
      mockApiClient.getActiveToolExecutions.mockResolvedValueOnce([
        {
          ...mockActiveExecutions[0],
          status: 'completed' as const,
          progress: 100,
          result: 'Weather: 72°F, sunny',
          endTime: new Date()
        }
      ]);

      renderWithProviders(<ActiveToolExecutions />);

      // Wait for initial status
      await waitFor(() => {
        expect(screen.getByText(/running/i)).toBeInTheDocument();
        expect(screen.getByText('30%')).toBeInTheDocument();
      });

      // Wait for status update (component should poll for updates)
      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Tool Execution History', () => {
    it('should display tool execution history', async () => {
      const mockHistory = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'completed' as const,
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:00:02Z'),
          executionTime: 2000,
          parameters: { location: 'New York' },
          result: 'Weather: 72°F, sunny',
          sessionId: 'session-1'
        },
        {
          id: 'exec-2',
          toolCallId: 'tool-call-2',
          toolName: 'file.read_file',
          status: 'failed' as const,
          startTime: new Date('2024-01-01T09:30:00Z'),
          endTime: new Date('2024-01-01T09:30:01Z'),
          executionTime: 1000,
          parameters: { path: '/nonexistent.txt' },
          error: 'File not found',
          sessionId: 'session-1'
        }
      ];

      mockApiClient.getToolExecutionHistory.mockResolvedValueOnce({
        executions: mockHistory,
        totalCount: 2,
        hasMore: false
      });

      renderWithProviders(<ToolExecutionHistory />);

      // Wait for history to load
      await waitFor(() => {
        expect(screen.getByText('weather.get_weather')).toBeInTheDocument();
        expect(screen.getByText('file.read_file')).toBeInTheDocument();
      });

      // Verify execution details
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
      expect(screen.getByText('Weather: 72°F, sunny')).toBeInTheDocument();
      expect(screen.getByText('File not found')).toBeInTheDocument();

      // Verify execution times
      expect(screen.getByText('2.0s')).toBeInTheDocument();
      expect(screen.getByText('1.0s')).toBeInTheDocument();
    });

    it('should filter history by status', async () => {
      const user = userEvent.setup();
      
      const mockHistory = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'completed' as const,
          startTime: new Date(),
          endTime: new Date(),
          executionTime: 2000,
          parameters: { location: 'New York' },
          result: 'Weather: 72°F, sunny',
          sessionId: 'session-1'
        }
      ];

      mockApiClient.getToolExecutionHistory.mockResolvedValueOnce({
        executions: mockHistory,
        totalCount: 1,
        hasMore: false
      });

      renderWithProviders(<ToolExecutionHistory />);

      // Wait for history to load
      await waitFor(() => {
        expect(screen.getByText('weather.get_weather')).toBeInTheDocument();
      });

      // Filter by completed status
      const statusFilter = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(statusFilter, 'completed');

      // Verify filter API call
      await waitFor(() => {
        expect(mockApiClient.getToolExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'completed'
          })
        );
      });
    });

    it('should search history by tool name', async () => {
      const user = userEvent.setup();
      
      const mockHistory = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'completed' as const,
          startTime: new Date(),
          endTime: new Date(),
          executionTime: 2000,
          parameters: { location: 'New York' },
          result: 'Weather: 72°F, sunny',
          sessionId: 'session-1'
        }
      ];

      mockApiClient.getToolExecutionHistory.mockResolvedValueOnce({
        executions: mockHistory,
        totalCount: 1,
        hasMore: false
      });

      renderWithProviders(<ToolExecutionHistory />);

      // Search for weather tools
      const searchInput = screen.getByPlaceholderText(/search tools/i);
      await user.type(searchInput, 'weather');

      // Verify search API call
      await waitFor(() => {
        expect(mockApiClient.getToolExecutionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'weather'
          })
        );
      });
    });

    it('should load more history items', async () => {
      const user = userEvent.setup();
      
      const mockHistory = Array.from({ length: 10 }, (_, i) => ({
        id: `exec-${i + 1}`,
        toolCallId: `tool-call-${i + 1}`,
        toolName: 'weather.get_weather',
        status: 'completed' as const,
        startTime: new Date(),
        endTime: new Date(),
        executionTime: 2000,
        parameters: { location: 'New York' },
        result: 'Weather: 72°F, sunny',
        sessionId: 'session-1'
      }));

      // First call returns first 10 items
      mockApiClient.getToolExecutionHistory.mockResolvedValueOnce({
        executions: mockHistory,
        totalCount: 20,
        hasMore: true
      });

      // Second call returns next 10 items
      mockApiClient.getToolExecutionHistory.mockResolvedValueOnce({
        executions: mockHistory.map(item => ({ ...item, id: `${item.id}-2` })),
        totalCount: 20,
        hasMore: false
      });

      renderWithProviders(<ToolExecutionHistory />);

      // Wait for initial history to load
      await waitFor(() => {
        expect(screen.getAllByText('weather.get_weather')).toHaveLength(10);
      });

      // Click load more button
      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      await user.click(loadMoreButton);

      // Verify more items are loaded
      await waitFor(() => {
        expect(screen.getAllByText('weather.get_weather')).toHaveLength(20);
      });
    });
  });

  describe('End-to-End Tool Execution Flow', () => {
    it('should complete full tool execution workflow', async () => {
      const user = userEvent.setup();
      
      const mockToolCall = {
        id: 'tool-call-1',
        type: 'function' as const,
        function: {
          name: 'weather.get_weather',
          arguments: JSON.stringify({ location: 'New York' })
        },
        serverId: 'weather',
        approved: false
      };

      // Mock successful tool execution
      mockApiClient.runTool.mockResolvedValueOnce({
        result: 'Weather in New York: 72°F, sunny',
        reply: 'The current weather in New York is 72°F and sunny.',
        executionTime: 1500
      });

      // Mock active executions API
      mockApiClient.getActiveToolExecutions.mockResolvedValueOnce([]);

      const onConfirm = vi.fn().mockImplementation(async (toolCall) => {
        // Simulate tool execution
        await mockApiClient.runTool({
          toolCall,
          sessionId: 'test-session',
          messages: [],
          approved: true
        });
      });

      const onCancel = vi.fn();

      renderWithProviders(
        <div>
          <ToolConfirmationDialog
            toolCall={mockToolCall}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isOpen={true}
          />
          <ActiveToolExecutions />
        </div>
      );

      // Verify tool confirmation dialog
      expect(screen.getByText('Tool Execution Confirmation')).toBeInTheDocument();
      expect(screen.getByText('weather.get_weather')).toBeInTheDocument();

      // Confirm tool execution
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      // Verify confirmation callback and API call
      expect(onConfirm).toHaveBeenCalledWith(mockToolCall);
      
      await waitFor(() => {
        expect(mockApiClient.runTool).toHaveBeenCalledWith({
          toolCall: mockToolCall,
          sessionId: 'test-session',
          messages: [],
          approved: true
        });
      });
    });

    it('should handle tool execution timeout', async () => {
      const user = userEvent.setup();
      
      const mockToolCall = {
        id: 'tool-call-1',
        type: 'function' as const,
        function: {
          name: 'slow.long_running_task',
          arguments: JSON.stringify({ duration: 60000 })
        },
        serverId: 'slow',
        approved: false
      };

      // Mock timeout error
      mockApiClient.runTool.mockRejectedValueOnce(new Error('Tool execution timeout'));

      const onConfirm = vi.fn().mockImplementation(async (toolCall) => {
        await mockApiClient.runTool({
          toolCall,
          sessionId: 'test-session',
          messages: [],
          approved: true
        });
      });

      const onCancel = vi.fn();

      renderWithProviders(
        <ToolConfirmationDialog
          toolCall={mockToolCall}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isOpen={true}
        />
      );

      // Confirm tool execution
      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      // Verify timeout error handling
      await waitFor(() => {
        expect(screen.getByText(/tool execution timeout/i)).toBeInTheDocument();
      });
    });

    it('should handle concurrent tool executions', async () => {
      const user = userEvent.setup();
      
      const mockActiveExecutions = [
        {
          id: 'exec-1',
          toolCallId: 'tool-call-1',
          toolName: 'weather.get_weather',
          status: 'running' as const,
          startTime: new Date(),
          progress: 50,
          parameters: { location: 'New York' }
        },
        {
          id: 'exec-2',
          toolCallId: 'tool-call-2',
          toolName: 'file.read_file',
          status: 'running' as const,
          startTime: new Date(),
          progress: 25,
          parameters: { path: '/data/file.txt' }
        }
      ];

      mockApiClient.getActiveToolExecutions.mockResolvedValueOnce(mockActiveExecutions);

      renderWithProviders(<ActiveToolExecutions />);

      // Wait for executions to load
      await waitFor(() => {
        expect(screen.getByText('weather.get_weather')).toBeInTheDocument();
        expect(screen.getByText('file.read_file')).toBeInTheDocument();
      });

      // Verify both executions are shown
      expect(screen.getAllByText(/running/i)).toHaveLength(2);
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();

      // Verify both can be cancelled independently
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      expect(cancelButtons).toHaveLength(2);
    });
  });
});