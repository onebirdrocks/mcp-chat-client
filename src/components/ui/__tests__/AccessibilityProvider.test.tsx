import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AccessibilityProvider, useAccessibilityContext } from '../AccessibilityProvider';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock matchMedia
const mockMatchMedia = vi.fn();

beforeEach(() => {
  mockMatchMedia.mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
  
  mockLocalStorage.getItem.mockReturnValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
  document.documentElement.className = '';
  document.documentElement.style.cssText = '';
});

// Test component that uses the accessibility context
const TestComponent: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    isHighContrast, 
    isReducedMotion, 
    announceToScreenReader 
  } = useAccessibilityContext();

  return (
    <div>
      <div data-testid="high-contrast">{isHighContrast.toString()}</div>
      <div data-testid="reduced-motion">{isReducedMotion.toString()}</div>
      <div data-testid="font-size">{settings.fontSize}</div>
      <div data-testid="focus-visible">{settings.focusVisible.toString()}</div>
      
      <button 
        onClick={() => updateSettings({ highContrast: !settings.highContrast })}
        data-testid="toggle-contrast"
      >
        Toggle Contrast
      </button>
      
      <button 
        onClick={() => updateSettings({ fontSize: 'large' })}
        data-testid="set-large-font"
      >
        Set Large Font
      </button>
      
      <button 
        onClick={() => announceToScreenReader('Test announcement', 'polite')}
        data-testid="announce"
      >
        Announce
      </button>
    </div>
  );
};

describe('AccessibilityProvider', () => {
  it('should provide default accessibility settings', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
    expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false');
    expect(screen.getByTestId('font-size')).toHaveTextContent('medium');
    expect(screen.getByTestId('focus-visible')).toHaveTextContent('true');
  });

  it('should load settings from localStorage', () => {
    const savedSettings = {
      highContrast: true,
      fontSize: 'large',
      focusVisible: false,
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
    expect(screen.getByTestId('font-size')).toHaveTextContent('large');
    expect(screen.getByTestId('focus-visible')).toHaveTextContent('false');
  });

  it('should update settings and save to localStorage', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    fireEvent.click(screen.getByTestId('toggle-contrast'));

    await waitFor(() => {
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'accessibility-settings',
      expect.stringContaining('"highContrast":true')
    );
  });

  it('should apply CSS classes based on settings', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    fireEvent.click(screen.getByTestId('toggle-contrast'));
    fireEvent.click(screen.getByTestId('set-large-font'));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
      expect(document.documentElement.classList.contains('font-large')).toBe(true);
    });
  });

  it('should detect system high contrast preference', () => {
    mockMatchMedia.mockImplementation((query) => ({
      matches: query === '(prefers-contrast: high)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
  });

  it('should detect system reduced motion preference', () => {
    mockMatchMedia.mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true');
  });

  it('should create screen reader announcements', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    fireEvent.click(screen.getByTestId('announce'));

    const liveRegion = document.getElementById('a11y-live-polite');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
  });

  it('should handle invalid localStorage data gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid json');

    expect(() => {
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );
    }).not.toThrow();

    // Should fall back to defaults
    expect(screen.getByTestId('font-size')).toHaveTextContent('medium');
  });

  it('should set CSS custom properties', async () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    fireEvent.click(screen.getByTestId('toggle-contrast'));

    await waitFor(() => {
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--a11y-focus-color')).toBe('#ffff00');
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAccessibilityContext must be used within AccessibilityProvider');

    consoleSpy.mockRestore();
  });
});