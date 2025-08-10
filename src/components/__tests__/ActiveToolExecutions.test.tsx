import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActiveToolExecutions from '../ActiveToolExecutions';
import { chatApi } from '../../services/apiClient';
import { useChatStore } from '../../store/chatStore';

// Mock the API client
vi.mock('../../services/apiClient', () => ({
  chatApi: {
    getActiveToolExecutions: vi.fn(),
    cancelAllActiveExecutions: vi.fn(),
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

describe('ActiveToolExecutions', () => {
  const mockGetActiveToolExecutions = vi.fn();
  const mockCancelToolExecution = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the store
    (useChatStore as any).mockReturnValue({
      getActiveToolExecutions: mockGetActiveToolExecutions,
      cancelToolExecution: mockCancelToolExecution,
    });
    
    // Mock store returning active executions
    mockGetActiveToolExecutions.mockReturnValue([
      {
        toolCall: {
          id: 'tool-1',
          function: { name: 'test_tool' },
          serverId: 'test-server',
        },
        status: {
          stage: 'executing',
          message: 'Executing tool...',
          progress: 50,
          timestamp: new Date(),
        },
        startTime: new Date(Date.now() - 5000), // 5 seconds ago
      },
    ]);
    
    // Mock successful API response
    (chatApi.getActiveToolExecutions as any).mockResolvedValue({
      activeExecutions: [
        {
          toolCallId: 'tool-1',
          sessionId: 'session-1',
          toolName: 'test_tool',
          serverId: 'test-server',
          startTime: new Date(Date.now() - 5000),
          timeout: 30000,
          elapsedTime: 5000,
          parameters: { param1: 'value1' },
        },
      ],
      total: 1,
    });
  });

  it('should render active tool executions', async () => {
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Tool Executions')).toBeInTheDocument();
    });
    
    // Should show active execution
    expect(screen.getByText('test_tool')).toBeInTheDocument();
    expect(screen.getByText(/test-server/)).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<ActiveToolExecutions />);
    
    expect(screen.getByText('Loading active executions...')).toBeInTheDocument();
  });

  it('should handle empty active executions', async () => {
    mockGetActiveToolExecutions.mockReturnValue([]);
    (chatApi.getActiveToolExecutions as any).mockResolvedValue({
      activeExecutions: [],
      total: 0,
    });
    
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('No active tool executions')).toBeInTheDocument();
    });
  });

  it('should show progress information', async () => {
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });
    
    // Should show progress information
    expect(screen.getAllByText('Executing tool...')[0]).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should handle cancel execution', async () => {
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });
    
    // Find and click cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(mockCancelToolExecution).toHaveBeenCalledWith('tool-1');
    });
  });

  it('should handle cancel all executions', async () => {
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('Cancel All')).toBeInTheDocument();
    });
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    
    fireEvent.click(screen.getByText('Cancel All'));
    
    await waitFor(() => {
      expect(chatApi.cancelAllActiveExecutions).toHaveBeenCalled();
    });
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should show timeout warning for long-running executions', async () => {
    // Mock execution that's close to timeout
    (chatApi.getActiveToolExecutions as any).mockResolvedValue({
      activeExecutions: [
        {
          toolCallId: 'tool-1',
          sessionId: 'session-1',
          toolName: 'slow_tool',
          serverId: 'test-server',
          startTime: new Date(Date.now() - 25000), // 25 seconds ago
          timeout: 30000, // 30 second timeout
          elapsedTime: 25000,
          parameters: { param1: 'value1' },
        },
      ],
      total: 1,
    });
    
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('Tool execution is taking longer than expected')).toBeInTheDocument();
    });
  });

  it('should show parameters when expanded', async () => {
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });
    
    // Find and click "View Parameters" details
    const detailsElement = screen.getByText('View Parameters');
    fireEvent.click(detailsElement);
    
    // Should show parameters
    expect(screen.getByText(/param1/)).toBeInTheDocument();
    expect(screen.getByText(/value1/)).toBeInTheDocument();
  });

  it('should handle API errors', async () => {
    (chatApi.getActiveToolExecutions as any).mockRejectedValue(
      new Error('Failed to load active executions')
    );
    
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load active executions')).toBeInTheDocument();
    });
    
    // Should show dismiss button
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should filter by session when sessionId is provided', async () => {
    render(<ActiveToolExecutions sessionId="session-1" />);
    
    await waitFor(() => {
      expect(chatApi.getActiveToolExecutions).toHaveBeenCalledWith('session-1');
    });
  });

  it('should refresh data periodically', async () => {
    vi.useFakeTimers();
    
    render(<ActiveToolExecutions />);
    
    // Initial load
    await waitFor(() => {
      expect(chatApi.getActiveToolExecutions).toHaveBeenCalledTimes(1);
    });
    
    // Advance time by 2 seconds (polling interval)
    vi.advanceTimersByTime(2000);
    
    // Wait for the next call
    await waitFor(() => {
      expect(chatApi.getActiveToolExecutions).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });
    
    vi.useRealTimers();
  }, 10000);

  it('should show execution stage colors correctly', async () => {
    // Mock different execution stages
    mockGetActiveToolExecutions.mockReturnValue([
      {
        toolCall: {
          id: 'tool-1',
          function: { name: 'validating_tool' },
          serverId: 'test-server',
        },
        status: {
          stage: 'validating',
          message: 'Validating parameters...',
          timestamp: new Date(),
        },
        startTime: new Date(),
      },
      {
        toolCall: {
          id: 'tool-2',
          function: { name: 'executing_tool' },
          serverId: 'test-server',
        },
        status: {
          stage: 'executing',
          message: 'Executing tool...',
          timestamp: new Date(),
        },
        startTime: new Date(),
      },
    ]);
    
    (chatApi.getActiveToolExecutions as any).mockResolvedValue({
      activeExecutions: [
        {
          toolCallId: 'tool-1',
          toolName: 'validating_tool',
          serverId: 'test-server',
          elapsedTime: 1000,
          parameters: {},
        },
        {
          toolCallId: 'tool-2',
          toolName: 'executing_tool',
          serverId: 'test-server',
          elapsedTime: 2000,
          parameters: {},
        },
      ],
      total: 2,
    });
    
    render(<ActiveToolExecutions />);
    
    await waitFor(() => {
      expect(screen.getByText('validating_tool')).toBeInTheDocument();
      expect(screen.getByText('executing_tool')).toBeInTheDocument();
    });
    
    // Should show different stage messages
    expect(screen.getByText('Validating parameters...')).toBeInTheDocument();
    expect(screen.getAllByText('Executing tool...')[0]).toBeInTheDocument();
  }, 10000);
});