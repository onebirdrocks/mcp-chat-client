import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ToolConfirmationDialog from '../ToolConfirmationDialog';
import type { ToolCall } from '../../types';

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock the accessibility hook
vi.mock('../../hooks/useEnhancedAccessibility', () => ({
  useModalAccessibility: () => ({
    modalRef: { current: null },
  }),
}));

// Mock UI components
vi.mock('../ui', () => ({
  Modal: ({ children, isOpen, title }: any) => 
    isOpen ? <div data-testid="modal" aria-label={title}>{children}</div> : null,
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>
      {children}
    </div>
  ),
  Spinner: ({ size }: any) => <div data-testid="spinner" data-size={size}>Loading...</div>,
}));

describe('ToolConfirmationDialog', () => {
  const mockToolCall: ToolCall = {
    id: 'test-tool-call-1',
    type: 'function',
    function: {
      name: 'test_function',
      arguments: '{"param1": "value1", "param2": 42}',
    },
    serverId: 'test-server',
  };

  const defaultProps = {
    isOpen: true,
    toolCall: mockToolCall,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isExecuting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open with tool call', () => {
    render(<ToolConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('test_function')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ToolConfirmationDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('does not render when toolCall is null', () => {
    render(<ToolConfirmationDialog {...defaultProps} toolCall={null} />);
    
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('displays tool parameters correctly', () => {
    render(<ToolConfirmationDialog {...defaultProps} />);
    
    expect(screen.getByText('param1')).toBeInTheDocument();
    expect(screen.getByText('param2')).toBeInTheDocument();
    expect(screen.getByText('"value1"')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows parameter type badges', () => {
    render(<ToolConfirmationDialog {...defaultProps} />);
    
    const badges = screen.getAllByTestId('badge');
    expect(badges).toHaveLength(4); // Tool Function + server badge + 2 parameter types
  });

  it('calls onConfirm when Run button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ToolConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);
    
    const runButton = screen.getByText('Run Tool');
    fireEvent.click(runButton);
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(mockToolCall);
    });
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ToolConfirmationDialog {...defaultProps} onCancel={onCancel} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows execution progress when executing', () => {
    const executionProgress = {
      stage: 'executing' as const,
      message: 'Running tool...',
      progress: 50,
    };

    render(
      <ToolConfirmationDialog 
        {...defaultProps} 
        isExecuting={true}
        executionProgress={executionProgress}
      />
    );
    
    const spinners = screen.getAllByTestId('spinner');
    expect(spinners.length).toBeGreaterThan(0);
    expect(screen.getByText('Running tool...')).toBeInTheDocument();
  });

  it('shows execution result when completed', () => {
    const executionResult = {
      success: true,
      result: 'Tool executed successfully',
      executionTime: 1500,
    };

    render(
      <ToolConfirmationDialog 
        {...defaultProps} 
        executionResult={executionResult}
      />
    );
    
    expect(screen.getByText('Tool executed successfully')).toBeInTheDocument();
    expect(screen.getByText(/1500ms/)).toBeInTheDocument();
  });

  it('shows error result when execution fails', () => {
    const executionResult = {
      success: false,
      error: 'Tool execution failed',
      executionTime: 500,
    };

    render(
      <ToolConfirmationDialog 
        {...defaultProps} 
        executionResult={executionResult}
      />
    );
    
    expect(screen.getByText('Tool execution failed')).toBeInTheDocument();
  });

  it('handles invalid JSON arguments gracefully', () => {
    const invalidToolCall: ToolCall = {
      ...mockToolCall,
      function: {
        name: 'test_function',
        arguments: 'invalid json',
      },
    };

    render(<ToolConfirmationDialog {...defaultProps} toolCall={invalidToolCall} />);
    
    const alerts = screen.getAllByTestId('alert');
    expect(alerts.length).toBeGreaterThan(0);
    expect(screen.getByText('Parameter Parsing Error')).toBeInTheDocument();
  });

  it('shows parameter validation warnings', () => {
    const dangerousToolCall: ToolCall = {
      ...mockToolCall,
      function: {
        name: 'test_function',
        arguments: '{"path": "../../../etc/passwd", "command": "rm -rf /"}',
      },
    };

    render(<ToolConfirmationDialog {...defaultProps} toolCall={dangerousToolCall} />);
    
    const alerts = screen.getAllByTestId('alert');
    expect(alerts.length).toBeGreaterThan(1); // Should have warning alert for validation
  });

  it('shows security warning for dangerous operations', () => {
    const deleteToolCall: ToolCall = {
      ...mockToolCall,
      function: {
        name: 'delete_file',
        arguments: '{"file": "important.txt"}',
      },
    };

    render(<ToolConfirmationDialog {...defaultProps} toolCall={deleteToolCall} />);
    
    expect(screen.getByText('Potentially Destructive Operation')).toBeInTheDocument();
  });

  it('disables Run button when parameters are invalid', () => {
    const invalidToolCall: ToolCall = {
      ...mockToolCall,
      function: {
        name: 'test_function',
        arguments: 'invalid json',
      },
    };

    render(<ToolConfirmationDialog {...defaultProps} toolCall={invalidToolCall} />);
    
    const runButton = screen.getByText('Run Tool').closest('button');
    expect(runButton).toBeDisabled();
  });

  it('shows server information when serverId is provided', () => {
    render(<ToolConfirmationDialog {...defaultProps} />);
    
    // The text is split across elements, so we check for the server name directly
    expect(screen.getByText('test-server')).toBeInTheDocument();
    // Check that the server section exists
    expect(screen.getByText(/MCP Server/)).toBeInTheDocument();
  });
});