import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TranslationExample } from '../TranslationExample';

// Mock the custom translation hook
const mockUseTranslation = {
  tNs: vi.fn(),
  tPlural: vi.fn(),
  tValues: vi.fn(),
  currentLanguage: 'en',
};

vi.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => mockUseTranslation,
}));

describe('TranslationExample', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    mockUseTranslation.tNs.mockImplementation((namespace: string, key: string) => `${namespace}:${key}`);
    mockUseTranslation.tPlural.mockImplementation((key: string, count: number) => 
      count === 1 ? `${key}_singular` : `${key}_plural`
    );
    mockUseTranslation.tValues.mockImplementation((key: string, values: Record<string, any>) => 
      `${key}_with_${Object.keys(values).join('_')}`
    );
  });

  it('renders translation examples', () => {
    render(<TranslationExample />);

    expect(screen.getByText('Translation Examples')).toBeInTheDocument();
  });

  it('demonstrates namespace translations', () => {
    render(<TranslationExample />);

    expect(mockUseTranslation.tNs).toHaveBeenCalledWith('common', 'save');
    expect(mockUseTranslation.tNs).toHaveBeenCalledWith('chat', 'sendMessage');
    expect(mockUseTranslation.tNs).toHaveBeenCalledWith('settings', 'llmProvider');
  });

  it('demonstrates plural translations', () => {
    render(<TranslationExample />);

    expect(mockUseTranslation.tPlural).toHaveBeenCalledWith('messages', 1);
    expect(mockUseTranslation.tPlural).toHaveBeenCalledWith('messages', 5);
  });

  it('demonstrates value interpolation', () => {
    render(<TranslationExample />);

    expect(mockUseTranslation.tValues).toHaveBeenCalledWith('welcome', { name: 'User' });
    expect(mockUseTranslation.tValues).toHaveBeenCalledWith('tokenCount', { count: 150 });
  });

  it('displays current language', () => {
    render(<TranslationExample />);

    expect(screen.getByText(/Current Language: en/)).toBeInTheDocument();
  });

  it('handles different languages', () => {
    mockUseTranslation.currentLanguage = 'zh';

    render(<TranslationExample />);

    expect(screen.getByText(/Current Language: zh/)).toBeInTheDocument();
  });

  it('has proper structure and styling', () => {
    render(<TranslationExample />);

    const container = screen.getByText('Translation Examples').closest('div');
    expect(container).toHaveClass('p-4', 'border', 'rounded-lg', 'bg-gray-50');
  });

  it('shows all translation examples', () => {
    render(<TranslationExample />);

    // Check that all example sections are rendered
    expect(screen.getByText('Namespace Examples:')).toBeInTheDocument();
    expect(screen.getByText('Plural Examples:')).toBeInTheDocument();
    expect(screen.getByText('Value Interpolation:')).toBeInTheDocument();
  });

  it('handles translation function errors gracefully', () => {
    mockUseTranslation.tNs.mockImplementation(() => {
      throw new Error('Translation error');
    });

    // Component should not crash
    expect(() => render(<TranslationExample />)).not.toThrow();
  });
});