import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewChatModal } from '../NewChatModal';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock the settings store
const mockUseSettingsStore = vi.fn();
vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: () => mockUseSettingsStore(),
}));

// Mock the chat store
const mockCreateNewSession = vi.fn();
vi.mock('../../../store/chatStore', () => ({
  useChatStore: () => ({
    createNewSession: mockCreateNewSession,
  }),
}));

describe('NewChatModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSessionCreated = vi.fn();

  const mockProviders = [
    {
      id: 'openai-1',
      name: 'openai',
      displayName: 'OpenAI',
      enabled: true,
      models: [
        { id: 'gpt-4', name: 'GPT-4', supportsToolCalling: true },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', supportsToolCalling: true },
      ],
    },
    {
      id: 'deepseek-1',
      name: 'deepseek',
      displayName: 'DeepSeek',
      enabled: true,
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat', supportsToolCalling: true },
      ],
    },
  ];

  const mockMCPServers = {
    'filesystem': {
      id: 'filesystem',
      name: 'File System',
      enabled: true,
      status: 'connected',
    },
    'weather': {
      id: 'weather',
      name: 'Weather',
      enabled: true,
      status: 'connected',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseSettingsStore.mockReturnValue({
      llmProviders: mockProviders,
      mcpServers: mockMCPServers,
    });
  });

  it('renders modal when open', () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Chat')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <NewChatModal
        isOpen={false}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays available providers', () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
  });

  it('updates models when provider is selected', async () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    const providerSelect = screen.getByLabelText(/provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai-1' } });

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
      expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument();
    });
  });

  it('displays MCP servers with checkboxes', () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    expect(screen.getByText('File System')).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
  });

  it('creates session with selected options', async () => {
    mockCreateNewSession.mockResolvedValue({ id: 'new-session-id' });

    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Select provider
    const providerSelect = screen.getByLabelText(/provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai-1' } });

    // Wait for models to load and select model
    await waitFor(() => {
      const modelSelect = screen.getByLabelText(/model/i);
      fireEvent.change(modelSelect, { target: { value: 'gpt-4' } });
    });

    // Select MCP servers
    const filesystemCheckbox = screen.getByLabelText('File System');
    fireEvent.click(filesystemCheckbox);

    // Create session
    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockCreateNewSession).toHaveBeenCalledWith(
        'openai',
        'gpt-4',
        ['filesystem']
      );
      expect(mockOnSessionCreated).toHaveBeenCalledWith({ id: 'new-session-id' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('validates required fields', async () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/provider is required/i)).toBeInTheDocument();
    });

    expect(mockCreateNewSession).not.toHaveBeenCalled();
  });

  it('handles session creation errors', async () => {
    mockCreateNewSession.mockRejectedValue(new Error('Creation failed'));

    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    // Fill required fields
    const providerSelect = screen.getByLabelText(/provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai-1' } });

    await waitFor(() => {
      const modelSelect = screen.getByLabelText(/model/i);
      fireEvent.change(modelSelect, { target: { value: 'gpt-4' } });
    });

    const createButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create session/i)).toBeInTheDocument();
    });

    expect(mockOnSessionCreated).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes modal when cancel is clicked', () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when overlay is clicked', () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('focuses first input when opened', async () => {
    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    await waitFor(() => {
      const providerSelect = screen.getByLabelText(/provider/i);
      expect(providerSelect).toHaveFocus();
    });
  });

  it('shows only enabled providers', () => {
    const providersWithDisabled = [
      ...mockProviders,
      {
        id: 'disabled-1',
        name: 'disabled',
        displayName: 'Disabled Provider',
        enabled: false,
        models: [],
      },
    ];

    mockUseSettingsStore.mockReturnValue({
      llmProviders: providersWithDisabled,
      mcpServers: mockMCPServers,
    });

    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
    expect(screen.queryByText('Disabled Provider')).not.toBeInTheDocument();
  });

  it('shows only connected MCP servers', () => {
    const serversWithDisconnected = {
      ...mockMCPServers,
      'disconnected': {
        id: 'disconnected',
        name: 'Disconnected Server',
        enabled: true,
        status: 'disconnected',
      },
    };

    mockUseSettingsStore.mockReturnValue({
      llmProviders: mockProviders,
      mcpServers: serversWithDisconnected,
    });

    render(
      <NewChatModal
        isOpen={true}
        onClose={mockOnClose}
        onSessionCreated={mockOnSessionCreated}
      />
    );

    expect(screen.getByText('File System')).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.queryByText('Disconnected Server')).not.toBeInTheDocument();
  });
});