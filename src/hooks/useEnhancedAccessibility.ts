import { useEffect, useCallback, useRef } from 'react';
import { useAccessibility } from './useAccessibility';
import { 
  screenReader, 
  manageFocus, 
  keyboardShortcuts,
  NAVIGATION_KEYS 
} from '../utils/accessibility';

/**
 * Enhanced accessibility hook with comprehensive WCAG compliance features
 */
export const useEnhancedAccessibility = () => {
  const { preferences, announce } = useAccessibility();
  const shortcutCleanupRef = useRef<(() => void)[]>([]);

  // Register global keyboard shortcuts for accessibility
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // Skip to main content (Alt + M)
    cleanupFunctions.push(
      keyboardShortcuts.register('m', () => {
        const mainContent = document.querySelector('main, [role="main"]') as HTMLElement;
        if (mainContent) {
          manageFocus.setFocus(mainContent);
          announce('Skipped to main content', 'polite');
        }
      }, { alt: true })
    );

    // Skip to navigation (Alt + N)
    cleanupFunctions.push(
      keyboardShortcuts.register('n', () => {
        const navigation = document.querySelector('nav, [role="navigation"]') as HTMLElement;
        if (navigation) {
          manageFocus.setFocus(navigation);
          announce('Skipped to navigation', 'polite');
        }
      }, { alt: true })
    );

    // Toggle high contrast (Alt + H)
    cleanupFunctions.push(
      keyboardShortcuts.register('h', () => {
        const root = document.documentElement;
        const isHighContrast = root.classList.contains('high-contrast');
        
        if (isHighContrast) {
          root.classList.remove('high-contrast');
          announce('High contrast mode disabled', 'polite');
        } else {
          root.classList.add('high-contrast');
          announce('High contrast mode enabled', 'polite');
        }
      }, { alt: true })
    );

    // Show keyboard shortcuts help (Alt + ?)
    cleanupFunctions.push(
      keyboardShortcuts.register('?', () => {
        announce('Keyboard shortcuts: Alt+M for main content, Alt+N for navigation, Alt+H for high contrast, Escape to close dialogs', 'assertive');
      }, { alt: true })
    );

    shortcutCleanupRef.current = cleanupFunctions;

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [announce]);

  // Enhanced announcement function with context
  const announceWithContext = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite',
    context?: string
  ) => {
    const fullMessage = context ? `${context}: ${message}` : message;
    announce(fullMessage, priority);
  }, [announce]);

  // Focus management utilities
  const focusManagement = {
    /**
     * Move focus to first interactive element in container
     */
    focusFirst: (container: HTMLElement | null) => {
      if (!container) return;
      
      const firstFocusable = container.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        manageFocus.setFocus(firstFocusable);
      }
    },

    /**
     * Move focus to last interactive element in container
     */
    focusLast: (container: HTMLElement | null) => {
      if (!container) return;
      
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (lastFocusable) {
        manageFocus.setFocus(lastFocusable);
      }
    },

    /**
     * Create focus trap for modal dialogs
     */
    createTrap: (container: HTMLElement) => {
      return manageFocus.createFocusTrap(container);
    },
  };

  // Screen reader utilities
  const screenReaderUtils = {
    /**
     * Announce loading state
     */
    announceLoading: (isLoading: boolean, context?: string) => {
      const message = isLoading ? 'Loading' : 'Loading complete';
      announceWithContext(message, 'polite', context);
    },

    /**
     * Announce error state
     */
    announceError: (error: string, context?: string) => {
      announceWithContext(`Error: ${error}`, 'assertive', context);
    },

    /**
     * Announce success state
     */
    announceSuccess: (message: string, context?: string) => {
      announceWithContext(`Success: ${message}`, 'polite', context);
    },

    /**
     * Announce navigation change
     */
    announceNavigation: (location: string) => {
      announceWithContext(`Navigated to ${location}`, 'polite', 'Navigation');
    },

    /**
     * Create persistent status region
     */
    createStatusRegion: (id: string) => {
      return screenReader.createStatusRegion(id);
    },

    /**
     * Update status region
     */
    updateStatus: (id: string, message: string) => {
      screenReader.updateStatus(id, message);
    },
  };

  // Keyboard navigation helpers
  const keyboardNavigation = {
    /**
     * Handle list navigation with arrow keys
     */
    handleListNavigation: (
      event: React.KeyboardEvent,
      items: HTMLElement[],
      currentIndex: number,
      onIndexChange: (index: number) => void,
      orientation: 'horizontal' | 'vertical' = 'vertical'
    ) => {
      const { key } = event.nativeEvent;
      let newIndex = currentIndex;

      if (orientation === 'vertical') {
        if (key === NAVIGATION_KEYS.ARROW_UP) {
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        } else if (key === NAVIGATION_KEYS.ARROW_DOWN) {
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }
      } else {
        if (key === NAVIGATION_KEYS.ARROW_LEFT) {
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        } else if (key === NAVIGATION_KEYS.ARROW_RIGHT) {
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }
      }

      if (key === NAVIGATION_KEYS.HOME) {
        newIndex = 0;
      } else if (key === NAVIGATION_KEYS.END) {
        newIndex = items.length - 1;
      }

      if (newIndex !== currentIndex) {
        event.preventDefault();
        onIndexChange(newIndex);
        items[newIndex]?.focus();
      }
    },

    /**
     * Handle tab panel navigation
     */
    handleTabNavigation: (
      event: React.KeyboardEvent,
      tabs: HTMLElement[],
      currentIndex: number,
      onTabChange: (index: number) => void
    ) => {
      const { key } = event.nativeEvent;
      let newIndex = currentIndex;

      if (key === NAVIGATION_KEYS.ARROW_LEFT) {
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      } else if (key === NAVIGATION_KEYS.ARROW_RIGHT) {
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      } else if (key === NAVIGATION_KEYS.HOME) {
        newIndex = 0;
      } else if (key === NAVIGATION_KEYS.END) {
        newIndex = tabs.length - 1;
      }

      if (newIndex !== currentIndex) {
        event.preventDefault();
        onTabChange(newIndex);
        tabs[newIndex]?.focus();
      }
    },
  };

  // ARIA utilities
  const ariaUtils = {
    /**
     * Generate unique ID for ARIA relationships
     */
    generateId: (prefix = 'aria') => {
      return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    },

    /**
     * Create ARIA live region
     */
    createLiveRegion: (priority: 'polite' | 'assertive' = 'polite') => {
      const region = document.createElement('div');
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.id = ariaUtils.generateId('live-region');
      document.body.appendChild(region);
      return region;
    },

    /**
     * Set multiple ARIA attributes
     */
    setAttributes: (element: HTMLElement, attributes: Record<string, string | boolean | number>) => {
      Object.entries(attributes).forEach(([key, value]) => {
        const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
        element.setAttribute(ariaKey, String(value));
      });
    },
  };

  return {
    preferences,
    announce: announceWithContext,
    focusManagement,
    screenReaderUtils,
    keyboardNavigation,
    ariaUtils,
  };
};

/**
 * Hook for managing modal accessibility
 */
export const useModalAccessibility = (isOpen: boolean) => {
  const { focusManagement, announce } = useEnhancedAccessibility();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Focus modal after a brief delay
      setTimeout(() => {
        if (modalRef.current) {
          focusManagement.focusFirst(modalRef.current);
        }
      }, 100);
      
      // Announce modal opening
      announce('Dialog opened', 'polite');
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore previous focus
      if (previousFocusRef.current) {
        manageFocus.setFocus(previousFocusRef.current, 100);
      }
      
      // Announce modal closing
      announce('Dialog closed', 'polite');
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, focusManagement, announce]);

  return {
    modalRef,
    createFocusTrap: (container: HTMLElement) => focusManagement.createTrap(container),
  };
};

/**
 * Hook for managing form accessibility
 */
export const useFormAccessibility = () => {
  const { announce, ariaUtils } = useEnhancedAccessibility();

  const validateField = useCallback((
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    validationRules: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      custom?: (value: string) => string | null;
    }
  ) => {
    const { required, minLength, maxLength, pattern, custom } = validationRules;
    const value = element.value.trim();
    let error: string | null = null;

    if (required && !value) {
      error = 'This field is required';
    } else if (minLength && value.length < minLength) {
      error = `Minimum length is ${minLength} characters`;
    } else if (maxLength && value.length > maxLength) {
      error = `Maximum length is ${maxLength} characters`;
    } else if (pattern && !pattern.test(value)) {
      error = 'Invalid format';
    } else if (custom) {
      error = custom(value);
    }

    // Update ARIA attributes
    element.setAttribute('aria-invalid', error ? 'true' : 'false');
    
    if (error) {
      announce(`Validation error: ${error}`, 'assertive');
    }

    return error;
  }, [announce]);

  return {
    validateField,
    generateId: ariaUtils.generateId,
    setAriaAttributes: ariaUtils.setAttributes,
  };
};