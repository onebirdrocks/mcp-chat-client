import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { IntegrationManager } from '../IntegrationManager';

// Mock the stores
jest.mock('../../store/chatStore', () => ({
  useChatStore: () => ({
    error: null,
    isLoading: false,
    initializeStore: jest.fn().mockResolvedValue(undefined),
    setError: jest.fn()
  })
}));

jest.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    error: null,
    isLoading: false,
    initializeStore: jest.fn().mockResolvedValue(undefined),
    setError: jest.fn()
  })
}));

// Mock fetch for health check
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({
    status: 'healthy',
    warnings: []
  })
});

describe('IntegrationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children after initialization', async () => {
    render(
      <IntegrationManager>
        <div data-testid="test-child">Test Content</div>
      </IntegrationManager>
    );

    // Should show loading initially
    expect(screen.getByText('Initializing Application')).toBeInTheDocument();

    // Should show children after initialization
    await waitFor(() => {
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });

  it('should handle initialization errors gracefully', async () => {
    // Mock initialization failure
    jest.doMock('../../store/chatStore', () => ({
      useChatStore: () => ({
        error: null,
        isLoading: false,
        initializeStore: jest.fn().mockRejectedValue(new Error('Init failed')),
        setError: jest.fn()
      })
    }));

    render(
      <IntegrationManager>
        <div data-testid="test-child">Test Content</div>
      </IntegrationManager>
    );

    await waitFor(() => {
      expect(screen.getByText('Initialization Failed')).toBeInTheDocument();
    });
  });
});