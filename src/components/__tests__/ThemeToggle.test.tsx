import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ThemeToggle from '../ThemeToggle';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Reset document classes
    document.documentElement.className = '';
  });

  afterEach(() => {
    // Clean up
    document.documentElement.className = '';
  });

  it('renders theme selector with options', () => {
    render(<ThemeToggle />);
    
    expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Check that all theme options are present
    expect(screen.getByText(/☀️ Light/)).toBeInTheDocument();
    expect(screen.getByText(/🌙 Dark/)).toBeInTheDocument();
    expect(screen.getByText(/💻 System/)).toBeInTheDocument();
  });

  it('loads saved theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('dark');
    
    render(<ThemeToggle />);
    
    expect(localStorageMock.getItem).toHaveBeenCalledWith('mcp-chat-ui-theme');
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('dark');
  });

  it('applies dark theme when selected', () => {
    render(<ThemeToggle />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'dark' } });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('mcp-chat-ui-theme', 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class when light theme is selected', () => {
    // Start with dark theme
    document.documentElement.classList.add('dark');
    
    render(<ThemeToggle />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'light' } });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('mcp-chat-ui-theme', 'light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('applies system theme based on media query', () => {
    // Mock system preference for dark mode
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)' ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<ThemeToggle />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'system' } });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('mcp-chat-ui-theme', 'system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('shows correct description for each theme', () => {
    render(<ThemeToggle />);
    
    const select = screen.getByRole('combobox');
    
    // Test system theme description
    fireEvent.change(select, { target: { value: 'system' } });
    expect(screen.getByText(/theme follows your system preference/i)).toBeInTheDocument();
    
    // Test light theme description
    fireEvent.change(select, { target: { value: 'light' } });
    expect(screen.getByText(/using light theme/i)).toBeInTheDocument();
    
    // Test dark theme description
    fireEvent.change(select, { target: { value: 'dark' } });
    expect(screen.getByText(/using dark theme/i)).toBeInTheDocument();
  });

  it('defaults to system theme when no saved preference', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(<ThemeToggle />);
    
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('system');
  });
});