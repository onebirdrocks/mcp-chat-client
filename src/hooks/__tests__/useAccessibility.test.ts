import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAccessibility, useEnhancedAccessibility } from '../useAccessibility';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      if (key === 'accessibility.navigatedTo') return 'Navigated to {{location}}';
      if (key === 'accessibility.loading') return 'Loading';
      if (key === 'accessibility.loadingComplete') return 'Loading complete';
      return defaultValue || key;
    },
  }),
}));

// Mock DOM methods
const mockMatchMedia = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  
  // Mock window.matchMedia
  mockMatchMedia.mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    dispatchEvent: vi.fn(),
  }));
  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAccessibility', () => {
  describe('screenReader utilities', () => {
    it('should create live regions for announcements', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.screenReader.announce('Test message', 'polite');
      });
      
      const liveRegion = document.getElementById('sr-live-polite');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
      expect(liveRegion?.className).toBe('sr-only');
    });

    it('should announce success messages', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.screenReader.announceSuccess('Operation completed', 'Test');
      });
      
      const liveRegion = document.getElementById('sr-live-polite');
      expect(liveRegion?.textContent).toBe('Test: Operation completed');
    });

    it('should announce error messages with assertive priority', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.screenReader.announceError('Something went wrong', 'Error');
      });
      
      const liveRegion = document.getElementById('sr-live-assertive');
      expect(liveRegion?.textContent).toBe('Error: Something went wrong');
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
    });

    it('should announce navigation changes', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.screenReader.announceNavigation('Settings page');
      });
      
      const liveRegion = document.getElementById('sr-live-polite');
      expect(liveRegion?.textContent).toBe('Navigated to Settings page');
    });

    it('should announce loading states', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.screenReader.announceLoading(true, 'Data');
      });
      
      let liveRegion = document.getElementById('sr-live-polite');
      expect(liveRegion?.textContent).toBe('Data: Loading');
      
      act(() => {
        result.current.screenReader.announceLoading(false, 'Data');
      });
      
      liveRegion = document.getElementById('sr-live-polite');
      expect(liveRegion?.textContent).toBe('Data: Loading complete');
    });
  });

  describe('keyboard utilities', () => {
    it('should handle escape key', () => {
      const { result } = renderHook(() => useAccessibility());
      
      // This test verifies the function exists and can be called
      expect(result.current.keyboard.useEscapeKey).toBeDefined();
      expect(typeof result.current.keyboard.useEscapeKey).toBe('function');
    });

    it('should provide arrow navigation utility', () => {
      const { result } = renderHook(() => useAccessibility());
      
      expect(result.current.keyboard.useArrowNavigation).toBeDefined();
      expect(typeof result.current.keyboard.useArrowNavigation).toBe('function');
    });

    it('should provide focus trap utility', () => {
      const { result } = renderHook(() => useAccessibility());
      
      expect(result.current.keyboard.useFocusTrap).toBeDefined();
      expect(typeof result.current.keyboard.useFocusTrap).toBe('function');
    });
  });

  describe('focus utilities', () => {
    it('should provide focus management utilities', () => {
      const { result } = renderHook(() => useAccessibility());
      
      expect(result.current.focus.setFocus).toBeDefined();
      expect(result.current.focus.useFocusReturn).toBeDefined();
      expect(result.current.focus.createSkipLink).toBeDefined();
    });

    it('should create skip link with proper attributes', () => {
      const { result } = renderHook(() => useAccessibility());
      
      const skipLink = result.current.focus.createSkipLink('main-content', 'Skip to main');
      
      expect(skipLink.href).toBe('#main-content');
      expect(skipLink.children).toBe('Skip to main');
      expect(skipLink.className).toContain('sr-only');
      expect(skipLink.className).toContain('focus:not-sr-only');
    });
  });

  describe('ARIA utilities', () => {
    it('should provide ARIA utility functions', () => {
      const { result } = renderHook(() => useAccessibility());
      
      expect(result.current.aria.useId).toBeDefined();
      expect(result.current.aria.useDescribedBy).toBeDefined();
      expect(result.current.aria.useLabelledBy).toBeDefined();
      expect(result.current.aria.useExpanded).toBeDefined();
    });
  });

  describe('contrast utilities', () => {
    it('should detect high contrast preference', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useAccessibility());
      
      expect(result.current.contrast.useHighContrast).toBeDefined();
    });

    it('should detect reduced motion preference', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useAccessibility());
      
      expect(result.current.contrast.useReducedMotion).toBeDefined();
    });
  });

  describe('announcements tracking', () => {
    it('should track announcement history', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        result.current.screenReader.announce('First message');
        result.current.screenReader.announce('Second message');
        result.current.screenReader.announce('Third message');
      });
      
      expect(result.current.announcements).toContain('First message');
      expect(result.current.announcements).toContain('Second message');
      expect(result.current.announcements).toContain('Third message');
    });

    it('should limit announcement history to 5 items', () => {
      const { result } = renderHook(() => useAccessibility());
      
      act(() => {
        for (let i = 1; i <= 7; i++) {
          result.current.screenReader.announce(`Message ${i}`);
        }
      });
      
      expect(result.current.announcements).toHaveLength(5);
      expect(result.current.announcements).not.toContain('Message 1');
      expect(result.current.announcements).not.toContain('Message 2');
      expect(result.current.announcements).toContain('Message 7');
    });
  });
});

describe('useEnhancedAccessibility', () => {
  it('should provide simplified accessibility utilities', () => {
    const { result } = renderHook(() => useEnhancedAccessibility());
    
    expect(result.current.screenReaderUtils).toBeDefined();
    expect(result.current.keyboardUtils).toBeDefined();
    expect(result.current.focusUtils).toBeDefined();
    expect(result.current.ariaUtils).toBeDefined();
    expect(result.current.contrastUtils).toBeDefined();
  });
});