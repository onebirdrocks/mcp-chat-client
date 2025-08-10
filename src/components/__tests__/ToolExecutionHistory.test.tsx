import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ToolExecutionHistory from '../ToolExecutionHistory';
import { chatApi } from '../../services/apiClient';
import { useChatStore } from '../../store/chatStore';

// Mock the API client
vi.mock('../../services/apiClient', () => ({
  chatApi: {
    getToolExecutionHistory: vi.fn(),
    clearToolExecutionHistory: vi.fn(),
  },
}));

// Mock the chat store
vi.mock('../../store/chatStore', () => ({
  useChatStore: vi.fn(),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('ToolExecutionHistory', () => {
  const mockClearToolExecutionHistory = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the store
    (useChatStore as any).mockReturnValue({
      clearToolExecutionHistory: mockClearToolExecutionHistory,
    });
    
    // Mock successful API response
    (chatApi.getToolExecutionHistory as any).mockResolvedValue({
      history: [
        {
          id: 'test-1',
          toolCallId: 'tool-1',
          sessionId: 'session-1',
          toolName: 'test_tool',
          serverId: 'test-server',
          status: 'success',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T10:00:01Z'),
          executionTime: 1000,
          parameters: { param1: 'value1' },
          result: 'Tool executed successfully',
          progress: [
            {
              stage: 'validating',
              message: 'Validating parameters...',
              progress: 10,
              timestamp: new Date('2024-01-01T10:00:00.1Z'),
            },
            {
              stage: 'executing',
              message: 'Executing tool...',
              progress: 50,
              timestamp: new Date('2024-01-01T10:00:00.5Z'),
            },
            {
              stage: 'completed',
              message: 'Tool execution completed',
              progress: 100,
              timestamp: new Date('2024-01-01T10:00:01Z'),
            },
          ],
        },
        {
          id: 'test-2',
          toolCallId: 'tool-2',
          sessionId: 'session-1',
          toolName: 'error_tool',
          serverId: 'test-server',
          status: 'error',
          startTime: new Date('2024-01-01T11:00:00Z'),
          endTime: new Date('2024-01-01T11:00:02Z'),
          executionTime: 2000,
          parameters: { param1: 'error' },
          error: 'Tool execution failed',
        },
      ],
      total: 2,
      stats: {
        total: 2,
        successful: 1,
        failed: 1,
        timeout: 0,
        cancelled: 0,
        averageExecutionTime: 1500,
        toolBreakdown: {
          test_tool: 1,
          error_tool: 1,
        },
      },
    });
  });

  it('should render tool execution history', async () => {
    render(<ToolExecutionHistory showStats={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Tool Execution History')).toBeInTheDocument();
    });
    
    // Should show statistics
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Total count
    
    // Should show history entries
    expect(screen.getByText('test_tool')).toBeInTheDocument();
    expect(screen.getByText('error_tool')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<ToolExecutionHistory />);
    
    expect(screen.getByText('Loading execution history...')).toBeInTheDocument();
  });

  it('should handle empty history', async () => {
    (chatApi.getToolExecutionHistory as any).mockResolvedValue({
      history: [],
      total: 0,
    });
    
    render(<ToolExecutionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('No tool executions found')).toBeInTheDocument();
    });
  });

  it('should expand and collapse history entries', async () => {
    render(<ToolExecutionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });
    
    // Find and click expand button
    const expandButtons = screen.getAllByLabelText('Expand');
    fireEvent.click(expandButtons[0]);
    
    // Should show expanded content
    expect(screen.getByText('Parameters:')).toBeInTheDocument();
    expect(screen.getByText('Result:')).toBeInTheDocument();
  });

  it('should handle clear history', async () => {
    render(<ToolExecutionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Clear History')).toBeInTheDocument();
    });
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    fireEvent.click(screen.getByText('Clear History'));
    
    await waitFor(() => {
      expect(mockClearToolExecutionHistory).toHaveBeenCalled();
    });
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should handle API errors', async () => {
    (chatApi.getToolExecutionHistory as any).mockRejectedValue(
      new Error('Failed to load history')
    );
    
    render(<ToolExecutionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    });
    
    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should filter by session when sessionId is provided', async () => {
    render(<ToolExecutionHistory sessionId="session-1" />);
    
    await waitFor(() => {
      expect(chatApi.getToolExecutionHistory).toHaveBeenCalledWith(
        'session-1',
        50,
        true
      );
    });
  });

  it('should respect limit parameter', async () => {
    render(<ToolExecutionHistory limit={10} />);
    
    await waitFor(() => {
      expect(chatApi.getToolExecutionHistory).toHaveBeenCalledWith(
        undefined,
        10,
        true
      );
    });
  });

  it('should show progress timeline when expanded', async () => {
    render(<ToolExecutionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });
    
    // Expand the first entry
    const expandButtons = screen.getAllByLabelText('Expand');
    fireEvent.click(expandButtons[0]);
    
    // Should show progress timeline
    expect(screen.getByText('Execution Progress:')).toBeInTheDocument();
    expect(screen.getByText('validating')).toBeInTheDocument();
    expect(screen.getByText('executing')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('should show error details for failed executions', async () => {
    render(<ToolExecutionHistory />);
    
    await waitFor(() => {
      expect(screen.getByText('error_tool')).toBeInTheDocument();
    });
    
    // Expand the error entry
    const expandButtons = screen.getAllByLabelText('Expand');
    fireEvent.click(expandButtons[1]);
    
    // Should show error details
    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Tool execution failed')).toBeInTheDocument();
  });
});