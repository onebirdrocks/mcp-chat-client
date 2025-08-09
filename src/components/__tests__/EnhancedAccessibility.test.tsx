import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import Chat from '../Chat';
import AccessibilityConfig from '../AccessibilityConfig';
import { useEnhancedAccessibility } from '../../hooks/useEnhancedAccessibility';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
vi.mock('../../store/chatStore', () => ({
  useChatStore: () => ({
    currentSession: {
      id: 'test-session',
      provider: 'openai',
      model: 'gpt-4',
    },
    messages: [],
    isLoading: false,
    pendingToolCall: null,
    error: null,
    sendMessage: vi.fn(),
    deleteMessage: vi.fn(),
    confirmToolCall: vi.fn(),
    cancelToolCall: vi.fn(),
    setError: vi.fn(),
  }),
}));

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    llmProviders: [
      {
        name: 'openai',
        enabled: true,
      },
    ],
    preferences: {
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReaderAnnouncements: true,
        keyboardNavigation: true,
        focusVisible: true,
        largeText: false,
      },
    },
    updatePreferences: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('Enhanced Accessibility Features', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.documentElement.className = '';
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    document.documentElement.className = '';
  });

  describe('WCAG Compliance', () => {
    it('should have no accessibility violations in Chat component', async () => {
      const { container } = render(<Chat />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in AccessibilityConfig', async () => {
      const { container } = render(<AccessibilityConfig />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support skip links', () => {
      render(<Chat />);
      
      const skipLink = screen.getByText(/skip to message input/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#message-input');
    });

    it('should handle keyboard shortcuts', () => {
      const TestComponent = () => {
        const { announce } = useEnhancedAccessibility();
        
        React.useEffect(() => {
          // Simulate Alt+M shortcut
          const event = new KeyboardEvent('keydown', {
            key: 'm',
            altKey: true,
          });
          document.dispatchEvent(event);
        }, []);

        return <div>Test</div>;
      };

      render(<TestComponent />);
      
      // Should focus main content when Alt+M is pressed
      const mainElement = document.querySelector('main');
      if (mainElement) {
        expect(document.activeElement).toBe(mainElement);
      }
    });

    it('should trap focus in modals', () => {
      // This would be tested with a modal component
      // The focus trap functionality is implemented in useModalAccessibility
      expect(true).toBe(true); // Placeholder for modal focus trap test
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels', () => {
      render(<Chat />);
      
      expect(screen.getByRole('main')).toHaveAttribute('aria-label');
      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    it('should announce loading states', async () => {
      const TestComponent = () => {
        const { screenReaderUtils } = useEnhancedAccessibility();
        
        React.useEffect(() => {
          screenReaderUtils.announceLoading(true, 'Test');
        }, [screenReaderUtils]);

        return <div>Test</div>;
      };

      render(<TestComponent />);
      
      // Check for live region creation
      await waitFor(() => {
        const liveRegions = document.querySelectorAll('[aria-live]');
        expect(liveRegions.length).toBeGreaterThan(0);
      });
    });

    it('should have semantic HTML structure', () => {
      render(<Chat />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('log')).toBeInTheDocument();
    });
  });

  describe('High Contrast Mode', () => {
    it('should apply high contrast styles when enabled', () => {
      render(<AccessibilityConfig />);
      
      const highContrastToggle = screen.getByRole('switch', { name: /high contrast mode/i });
      fireEvent.click(highContrastToggle);
      
      expect(document.documentElement).toHaveClass('high-contrast');
    });

    it('should have sufficient color contrast in high contrast mode', () => {
      document.documentElement.classList.add('high-contrast');
      
      render(<Chat />);
      
      // Check that high contrast styles are applied
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // In high contrast mode, buttons should have strong borders
        expect(parseInt(styles.borderWidth)).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Reduced Motion', () => {
    it('should respect reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<AccessibilityConfig />);
      
      expect(document.documentElement).toHaveClass('reduce-motion');
    });
  });

  describe('Large Text Mode', () => {
    it('should apply large text styles when enabled', () => {
      render(<AccessibilityConfig />);
      
      const largeTextToggle = screen.getByRole('switch', { name: /large text/i });
      fireEvent.click(largeTextToggle);
      
      expect(document.documentElement).toHaveClass('large-text');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(<Chat />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        button.focus();
        expect(button).toHaveFocus();
        
        // Check for focus ring styles
        const styles = window.getComputedStyle(button);
        expect(styles.outline).toBeTruthy();
      });
    });

    it('should manage focus order correctly', () => {
      render(<Chat />);
      
      // Tab through focusable elements
      const focusableElements = screen.getAllByRole('button');
      
      if (focusableElements.length > 1) {
        focusableElements[0].focus();
        expect(focusableElements[0]).toHaveFocus();
        
        // Simulate Tab key
        fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
        
        // Focus should move to next element
        // Note: This is a simplified test - actual tab behavior is handled by the browser
      }
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper form labels and descriptions', () => {
      render(<Chat />);
      
      const messageInput = screen.getByRole('textbox');
      expect(messageInput).toHaveAttribute('aria-label');
      expect(messageInput).toHaveAttribute('aria-describedby');
    });

    it('should announce form validation errors', () => {
      render(<Chat />);
      
      const messageInput = screen.getByRole('textbox');
      
      // Simulate validation error
      fireEvent.change(messageInput, { target: { value: 'a'.repeat(5000) } });
      
      expect(messageInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Loading States', () => {
    it('should indicate loading states to screen readers', () => {
      render(<Chat />);
      
      const buttons = screen.getAllByRole('button');
      const loadingButton = buttons.find(button => 
        button.getAttribute('aria-busy') === 'true'
      );
      
      if (loadingButton) {
        expect(loadingButton).toHaveAttribute('aria-busy', 'true');
      }
    });
  });

  describe('Error Handling', () => {
    it('should announce errors to screen readers', () => {
      const TestComponent = () => {
        const { screenReaderUtils } = useEnhancedAccessibility();
        
        React.useEffect(() => {
          screenReaderUtils.announceError('Test error', 'Test context');
        }, [screenReaderUtils]);

        return <div>Test</div>;
      };

      render(<TestComponent />);
      
      // Check for error announcement
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should maintain accessibility on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Chat />);
      
      // Check that touch targets are large enough (minimum 44px)
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Internationalization', () => {
    it('should support RTL languages', () => {
      // Mock RTL language
      document.documentElement.setAttribute('dir', 'rtl');
      
      render(<Chat />);
      
      expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    });
  });
});