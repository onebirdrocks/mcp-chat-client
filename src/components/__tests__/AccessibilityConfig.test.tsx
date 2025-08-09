import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AccessibilityConfig from '../AccessibilityConfig';

// Mock the hooks
vi.mock('../../hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    userPreferences: {
      highContrast: false,
      reducedMotion: false,
      screenReaderAnnouncements: true,
      keyboardNavigation: true,
      focusVisible: true,
      largeText: false,
    },
    systemPreferences: {
      reducedMotion: false,
      highContrast: false,
    },
    updatePreferences: vi.fn(),
  }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('AccessibilityConfig', () => {
  it('renders accessibility settings', () => {
    render(<AccessibilityConfig />);
    
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Visual Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Motion and Animation')).toBeInTheDocument();
    expect(screen.getByText('Interaction')).toBeInTheDocument();
  });

  it('displays toggle switches for accessibility preferences', () => {
    render(<AccessibilityConfig />);
    
    expect(screen.getByLabelText('High Contrast Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Large Text')).toBeInTheDocument();
    expect(screen.getByLabelText('Enhanced Focus Indicators')).toBeInTheDocument();
    expect(screen.getByLabelText('Reduce Motion')).toBeInTheDocument();
    expect(screen.getByLabelText('Enhanced Keyboard Navigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Screen Reader Announcements')).toBeInTheDocument();
  });

  it('shows WCAG compliance information', () => {
    render(<AccessibilityConfig />);
    
    expect(screen.getByText('WCAG 2.1 AA Compliance')).toBeInTheDocument();
    expect(screen.getByText(/full keyboard navigation support/i)).toBeInTheDocument();
    expect(screen.getByText(/screen reader compatibility/i)).toBeInTheDocument();
    expect(screen.getByText(/sufficient color contrast ratios/i)).toBeInTheDocument();
    expect(screen.getByText(/proper focus management/i)).toBeInTheDocument();
  });

  it('displays system preferences status', () => {
    render(<AccessibilityConfig />);
    
    expect(screen.getByText('System Preferences')).toBeInTheDocument();
    expect(screen.getByText('System High Contrast:')).toBeInTheDocument();
    expect(screen.getByText('System Reduced Motion:')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes for toggle switches', () => {
    render(<AccessibilityConfig />);
    
    const toggles = screen.getAllByRole('switch');
    toggles.forEach(toggle => {
      expect(toggle).toHaveAttribute('aria-checked');
      expect(toggle).toHaveAttribute('aria-describedby');
    });
  });

  it('should handle keyboard navigation', () => {
    render(<AccessibilityConfig />);
    
    const firstToggle = screen.getAllByRole('switch')[0];
    firstToggle.focus();
    
    expect(firstToggle).toHaveFocus();
    
    // Test Enter key activation
    fireEvent.keyDown(firstToggle, { key: 'Enter' });
    // The toggle should be activated (this would be tested with the actual implementation)
  });

  it('should provide clear descriptions for each accessibility feature', () => {
    render(<AccessibilityConfig />);
    
    expect(screen.getAllByText(/increase contrast for better visibility/i)).toHaveLength(2);
    expect(screen.getAllByText(/increase text size throughout the interface/i)).toHaveLength(2);
    expect(screen.getAllByText(/minimize animations and transitions/i)).toHaveLength(2);
  });
});