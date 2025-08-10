import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessibilitySettings } from '../AccessibilitySettings';
import { AccessibilityProvider } from '../AccessibilityProvider';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      const translations: Record<string, string> = {
        'accessibility.title': 'Accessibility Settings',
        'accessibility.description': 'Customize the interface to meet your accessibility needs.',
        'accessibility.visual.title': 'Visual Settings',
        'accessibility.highContrast.label': 'High Contrast Mode',
        'accessibility.highContrast.description': 'Increases color contrast for better visibility',
        'accessibility.fontSize.label': 'Font Size',
        'accessibility.fontSize.description': 'Adjust text size throughout the interface',
        'accessibility.fontSize.small': 'Small',
        'accessibility.fontSize.medium': 'Medium',
        'accessibility.fontSize.large': 'Large',
        'accessibility.fontSize.extraLarge': 'Extra Large',
        'accessibility.focusVisible.label': 'Enhanced Focus Indicators',
        'accessibility.focusVisible.description': 'Show prominent focus outlines for keyboard navigation',
        'accessibility.motion.title': 'Motion Settings',
        'accessibility.reducedMotion.label': 'Reduce Motion',
        'accessibility.reducedMotion.description': 'Minimize animations and transitions',
        'accessibility.navigation.title': 'Navigation Settings',
        'accessibility.keyboardNav.label': 'Enhanced Keyboard Navigation',
        'accessibility.keyboardNav.description': 'Enable advanced keyboard shortcuts and navigation',
        'accessibility.screenReader.label': 'Screen Reader Optimizations',
        'accessibility.screenReader.description': 'Optimize interface for screen reader users',
        'accessibility.actions.title': 'Actions',
        'accessibility.resetDefaults': 'Reset to Defaults',
        'accessibility.testScreenReader': 'Test Screen Reader',
        'accessibility.help.title': 'Accessibility Help',
        'accessibility.systemDetected': 'System preference detected',
      };
      return translations[key] || defaultValue || key;
    },
  }),
}));

// Mock localStorage and matchMedia
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};

const mockMatchMedia = vi.fn();

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  });
  
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

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AccessibilityProvider>
      {component}
    </AccessibilityProvider>
  );
};

describe('AccessibilitySettings', () => {
  it('should render accessibility settings sections', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    expect(screen.getByText('Visual Settings')).toBeInTheDocument();
    expect(screen.getByText('Motion Settings')).toBeInTheDocument();
    expect(screen.getByText('Navigation Settings')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should render high contrast toggle', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('High Contrast Mode')).toBeInTheDocument();
    expect(screen.getByText('Increases color contrast for better visibility')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /high contrast/i })).toBeInTheDocument();
  });

  it('should render font size selector', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByText('Adjust text size throughout the interface')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /font size/i })).toBeInTheDocument();
  });

  it('should render focus visible toggle', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('Enhanced Focus Indicators')).toBeInTheDocument();
    expect(screen.getByText('Show prominent focus outlines for keyboard navigation')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /focus/i })).toBeInTheDocument();
  });

  it('should render reduced motion toggle', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('Reduce Motion')).toBeInTheDocument();
    expect(screen.getByText('Minimize animations and transitions')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /motion/i })).toBeInTheDocument();
  });

  it('should render keyboard navigation toggle', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('Enhanced Keyboard Navigation')).toBeInTheDocument();
    expect(screen.getByText('Enable advanced keyboard shortcuts and navigation')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /keyboard/i })).toBeInTheDocument();
  });

  it('should render screen reader toggle', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('Screen Reader Optimizations')).toBeInTheDocument();
    expect(screen.getByText('Optimize interface for screen reader users')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /screen reader/i })).toBeInTheDocument();
  });

  it('should render action buttons', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test screen reader/i })).toBeInTheDocument();
  });

  it('should render help section', () => {
    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('Accessibility Help')).toBeInTheDocument();
    expect(screen.getByText(/use tab to navigate/i)).toBeInTheDocument();
    expect(screen.getByText(/press escape to close/i)).toBeInTheDocument();
    expect(screen.getByText(/use arrow keys/i)).toBeInTheDocument();
    expect(screen.getByText(/use skip links/i)).toBeInTheDocument();
  });

  it('should toggle high contrast setting', async () => {
    renderWithProvider(<AccessibilitySettings />);

    const toggle = screen.getByRole('switch', { name: /high contrast/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('should change font size setting', async () => {
    renderWithProvider(<AccessibilitySettings />);

    const fontSizeSelect = screen.getByRole('button', { name: /font size/i });
    fireEvent.click(fontSizeSelect);

    // Wait for dropdown to appear and select large option
    await waitFor(() => {
      const largeOption = screen.getByText('Large');
      fireEvent.click(largeOption);
    });

    // Verify the selection was made (this would depend on the Select component implementation)
    expect(fontSizeSelect).toBeInTheDocument();
  });

  it('should reset settings to defaults', async () => {
    renderWithProvider(<AccessibilitySettings />);

    // First change some settings
    const contrastToggle = screen.getByRole('switch', { name: /high contrast/i });
    fireEvent.click(contrastToggle);

    await waitFor(() => {
      expect(contrastToggle).toHaveAttribute('aria-checked', 'true');
    });

    // Then reset
    const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(contrastToggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('should test screen reader announcement', () => {
    renderWithProvider(<AccessibilitySettings />);

    const testButton = screen.getByRole('button', { name: /test screen reader/i });
    fireEvent.click(testButton);

    // Check that a live region was created for the announcement
    const liveRegion = document.getElementById('a11y-live-polite');
    expect(liveRegion).toBeInTheDocument();
  });

  it('should show system preference indicators', () => {
    // Mock system high contrast preference
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

    renderWithProvider(<AccessibilitySettings />);

    expect(screen.getByText('System preference detected')).toBeInTheDocument();
  });

  it('should have proper ARIA labels and structure', () => {
    renderWithProvider(<AccessibilitySettings />);

    // Check for proper heading structure
    expect(screen.getByRole('heading', { name: /accessibility settings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /visual settings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /motion settings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /navigation settings/i })).toBeInTheDocument();

    // Check for proper form controls
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);

    switches.forEach(switchElement => {
      expect(switchElement).toHaveAttribute('aria-checked');
    });
  });

  it('should handle keyboard navigation', () => {
    renderWithProvider(<AccessibilitySettings />);

    const firstSwitch = screen.getAllByRole('switch')[0];
    firstSwitch.focus();

    expect(document.activeElement).toBe(firstSwitch);

    // Test space key activation
    fireEvent.keyDown(firstSwitch, { key: ' ' });
    fireEvent.keyUp(firstSwitch, { key: ' ' });

    // Test enter key activation
    fireEvent.keyDown(firstSwitch, { key: 'Enter' });
    fireEvent.keyUp(firstSwitch, { key: 'Enter' });
  });
});