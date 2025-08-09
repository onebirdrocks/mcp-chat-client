import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import LLMProviderConfig from '../LLMProviderConfig';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock fetch
global.fetch = vi.fn();

const mockFetch = fetch as vi.MockedFunction<typeof fetch>;

describe('LLMProviderConfig', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('renders loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { llmProviders: [] }
      })
    } as Response);

    render(<LLMProviderConfig />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders provider management interface', async () => {
    const mockProviders = [
      {
        id: 'openai-1',
        name: 'openai',
        apiKey: 'sk-****************************',
        baseUrl: 'https://api.openai.com/v1',
        models: [],
        enabled: true
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { llmProviders: mockProviders }
      })
    } as Response);

    render(<LLMProviderConfig />);

    await waitFor(() => {
      expect(screen.getByText('LLM Provider Management')).toBeInTheDocument();
    });

    expect(screen.getByText('Add Provider')).toBeInTheDocument();
    expect(screen.getByText('Test All Connections')).toBeInTheDocument();
  });

  it('shows provider overview statistics', async () => {
    const mockProviders = [
      {
        id: 'openai-1',
        name: 'openai',
        apiKey: 'sk-****************************',
        baseUrl: 'https://api.openai.com/v1',
        models: [
          { id: 'gpt-4', name: 'GPT-4', displayName: 'GPT-4', supportsToolCalling: true, maxTokens: 8192 }
        ],
        enabled: true
      }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { llmProviders: mockProviders }
      })
    } as Response);

    render(<LLMProviderConfig />);

    await waitFor(() => {
      expect(screen.getByText('Configured Providers')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Models')).toBeInTheDocument();
    expect(screen.getByText('Tool-Calling Models')).toBeInTheDocument();
  });

  it('opens add provider form when button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { llmProviders: [] }
      })
    } as Response);

    render(<LLMProviderConfig />);

    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Provider'));

    expect(screen.getByText('Configure a new LLM provider for chat sessions')).toBeInTheDocument();
    expect(screen.getByLabelText(/Provider Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/API Key/)).toBeInTheDocument();
  });

  it('validates API key format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { llmProviders: [] }
      })
    } as Response);

    render(<LLMProviderConfig />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Add Provider'));
    });

    const apiKeyInput = screen.getByLabelText(/API Key/);
    
    // Test invalid key
    fireEvent.change(apiKeyInput, { target: { value: 'invalid-key' } });
    expect(screen.getByText('⚠ API key format may be invalid')).toBeInTheDocument();

    // Test valid OpenAI key
    fireEvent.change(apiKeyInput, { target: { value: 'sk-1234567890abcdef1234567890abcdef' } });
    expect(screen.getByText('✓ API key format looks valid')).toBeInTheDocument();
  });

  it('supports bilingual interface', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { llmProviders: [] }
      })
    } as Response);

    render(<LLMProviderConfig language="zh" />);

    await waitFor(() => {
      expect(screen.getByText('LLM 提供商管理')).toBeInTheDocument();
    });

    expect(screen.getByText('添加提供商')).toBeInTheDocument();
  });
});