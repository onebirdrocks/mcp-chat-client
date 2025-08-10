import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatSessionItem } from '../ChatSessionItem';
import { ChatSession } from '../../../types';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('ChatSessionItem', () => {
  const mockOnSelect = vi.fn();
  const mockOnRename = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnArchive = vi.fn();

  const mockSession: ChatSession = {
    id: 'session-1',
    title: 'Test Chat Session',
    provider: 'openai',
    model: 'gpt-4',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date('2024-01-01T10:00:01Z'),
      },
    ],
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:01Z'),
    mcpServers: ['filesystem'],
    tags: ['important'],
    archived: false,
    totalTokens: 50,
    estimatedCost: 0.001,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session information correctly', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByText('Test Chat Session')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('2 messages')).toBeInTheDocument();
  });

  it('shows active state styling', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={true}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    expect(item).toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('shows inactive state styling', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    expect(item).toHaveClass('hover:bg-gray-50');
  });

  it('calls onSelect when clicked', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    fireEvent.click(item);

    expect(mockOnSelect).toHaveBeenCalledWith(mockSession);
  });

  it('shows context menu on right click', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    fireEvent.contextMenu(item);

    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onRename when rename is clicked', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    fireEvent.contextMenu(item);

    const renameButton = screen.getByText('Rename');
    fireEvent.click(renameButton);

    expect(mockOnRename).toHaveBeenCalledWith(mockSession);
  });

  it('calls onArchive when archive is clicked', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    fireEvent.contextMenu(item);

    const archiveButton = screen.getByText('Archive');
    fireEvent.click(archiveButton);

    expect(mockOnArchive).toHaveBeenCalledWith(mockSession);
  });

  it('calls onDelete when delete is clicked', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    fireEvent.contextMenu(item);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockSession);
  });

  it('shows archived indicator for archived sessions', () => {
    const archivedSession = { ...mockSession, archived: true };

    render(
      <ChatSessionItem
        session={archivedSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('shows unarchive option for archived sessions', () => {
    const archivedSession = { ...mockSession, archived: true };

    render(
      <ChatSessionItem
        session={archivedSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    fireEvent.contextMenu(item);

    expect(screen.getByText('Unarchive')).toBeInTheDocument();
  });

  it('displays session tags', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByText('important')).toBeInTheDocument();
  });

  it('shows last updated time', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    // Should show relative time
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('handles sessions with no messages', () => {
    const emptySession = { ...mockSession, messages: [] };

    render(
      <ChatSessionItem
        session={emptySession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByText('0 messages')).toBeInTheDocument();
  });

  it('truncates long titles', () => {
    const longTitleSession = {
      ...mockSession,
      title: 'This is a very long session title that should be truncated to fit in the UI',
    };

    render(
      <ChatSessionItem
        session={longTitleSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const titleElement = screen.getByText(longTitleSession.title);
    expect(titleElement).toHaveClass('truncate');
  });

  it('has proper accessibility attributes', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    expect(item).toHaveAttribute('aria-label', expect.stringContaining('Test Chat Session'));
    expect(item).toHaveAttribute('tabIndex', '0');
  });

  it('supports keyboard navigation', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    const item = screen.getByRole('button');
    fireEvent.keyDown(item, { key: 'Enter' });

    expect(mockOnSelect).toHaveBeenCalledWith(mockSession);
  });

  it('shows MCP servers information', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByText('filesystem')).toBeInTheDocument();
  });

  it('displays token count and cost', () => {
    render(
      <ChatSessionItem
        session={mockSession}
        isActive={false}
        onSelect={mockOnSelect}
        onRename={mockOnRename}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.getByText('50 tokens')).toBeInTheDocument();
    expect(screen.getByText('$0.001')).toBeInTheDocument();
  });
});