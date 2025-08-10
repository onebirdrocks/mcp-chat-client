import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Enhanced accessibility hook providing comprehensive WCAG compliance features
 */
export const useAccessibility = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const announcementTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Screen reader announcement utilities
   */
  const screenReader = {
    /**
     * Announce message to screen readers with priority levels
     */
    announce: (message: string, priority: 'polite' | 'assertive' = 'polite', context?: string) => {
      const fullMessage = context ? `${context}: ${message}` : message;
      
      // Create or update live region
      let liveRegion = document.getElementById(`sr-live-${priority}`);
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = `sr-live-${priority}`;
        liveRegion.setAttribute('aria-live', priority);
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
      }
      
      // Clear previous timeout
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      
      // Set message
      liveRegion.textContent = fullMessage;
      
      // Add to announcements history
      setAnnouncements(prev => [...prev.slice(-4), fullMessage]);
      
      // Clear after delay to allow re-announcement of same message
      announcementTimeoutRef.current = setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = '';
        }
      }, 1000);
    },

    /**
     * Announce success messages
     */
    announceSuccess: (message: string, context?: string) => {
      screenReader.announce(message, 'polite', context);
    },

    /**
     * Announce error messages with high priority
     */
    announceError: (message: string, context?: string) => {
      screenReader.announce(message, 'assertive', context);
    },

    /**
     * Announce navigation changes
     */
    announceNavigation: (location: string) => {
      screenReader.announce(t('accessibility.navigatedTo', `Navigated to ${location}`), 'polite');
    },

    /**
     * Announce loading states
     */
    announceLoading: (isLoading: boolean, context?: string) => {
      const message = isLoading 
        ? t('accessibility.loading', 'Loading')
        : t('accessibility.loadingComplete', 'Loading complete');
      screenReader.announce(message, 'polite', context);
    }
  };

  /**
   * Keyboard navigation utilities
   */
  const keyboard = {
    /**
     * Handle escape key to close modals/dialogs
     */
    useEscapeKey: (callback: () => void, enabled: boolean = true) => {
      useEffect(() => {
        if (!enabled) return;

        const handleEscape = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            callback();
          }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }, [callback, enabled]);
    },

    /**
     * Handle arrow key navigation in lists
     */
    useArrowNavigation: (
      containerRef: React.RefObject<HTMLElement>,
      itemSelector: string,
      options: {
        loop?: boolean;
        orientation?: 'vertical' | 'horizontal' | 'both';
        onSelect?: (element: HTMLElement, index: number) => void;
      } = {}
    ) => {
      const { loop = true, orientation = 'vertical', onSelect } = options;

      useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleKeyDown = (event: KeyboardEvent) => {
          const items = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
          if (items.length === 0) return;

          const currentIndex = items.findIndex(item => item === document.activeElement);
          let nextIndex = currentIndex;

          switch (event.key) {
            case 'ArrowDown':
              if (orientation === 'vertical' || orientation === 'both') {
                event.preventDefault();
                nextIndex = currentIndex + 1;
                if (nextIndex >= items.length) {
                  nextIndex = loop ? 0 : items.length - 1;
                }
              }
              break;
            case 'ArrowUp':
              if (orientation === 'vertical' || orientation === 'both') {
                event.preventDefault();
                nextIndex = currentIndex - 1;
                if (nextIndex < 0) {
                  nextIndex = loop ? items.length - 1 : 0;
                }
              }
              break;
            case 'ArrowRight':
              if (orientation === 'horizontal' || orientation === 'both') {
                event.preventDefault();
                nextIndex = currentIndex + 1;
                if (nextIndex >= items.length) {
                  nextIndex = loop ? 0 : items.length - 1;
                }
              }
              break;
            case 'ArrowLeft':
              if (orientation === 'horizontal' || orientation === 'both') {
                event.preventDefault();
                nextIndex = currentIndex - 1;
                if (nextIndex < 0) {
                  nextIndex = loop ? items.length - 1 : 0;
                }
              }
              break;
            case 'Home':
              event.preventDefault();
              nextIndex = 0;
              break;
            case 'End':
              event.preventDefault();
              nextIndex = items.length - 1;
              break;
            case 'Enter':
            case ' ':
              if (currentIndex >= 0 && onSelect) {
                event.preventDefault();
                onSelect(items[currentIndex], currentIndex);
              }
              break;
          }

          if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < items.length) {
            items[nextIndex].focus();
          }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
      }, [containerRef, itemSelector, loop, orientation, onSelect]);
    },

    /**
     * Trap focus within a container (for modals)
     */
    useFocusTrap: (containerRef: React.RefObject<HTMLElement>, isActive: boolean = true) => {
      useEffect(() => {
        if (!isActive) return;

        const container = containerRef.current;
        if (!container) return;

        const focusableElements = container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (event: KeyboardEvent) => {
          if (event.key !== 'Tab') return;

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement?.focus();
            }
          }
        };

        // Focus first element when trap becomes active
        firstElement?.focus();

        document.addEventListener('keydown', handleTabKey);
        return () => document.removeEventListener('keydown', handleTabKey);
      }, [containerRef, isActive]);
    }
  };

  /**
   * Focus management utilities
   */
  const focus = {
    /**
     * Set focus to element with optional delay
     */
    setFocus: (element: HTMLElement | null, delay: number = 0) => {
      if (!element) return;

      if (delay > 0) {
        setTimeout(() => element.focus(), delay);
      } else {
        element.focus();
      }
    },

    /**
     * Save and restore focus for modal interactions
     */
    useFocusReturn: (isActive: boolean) => {
      const previousFocusRef = useRef<HTMLElement | null>(null);

      useEffect(() => {
        if (isActive) {
          previousFocusRef.current = document.activeElement as HTMLElement;
        } else if (previousFocusRef.current) {
          previousFocusRef.current.focus();
          previousFocusRef.current = null;
        }
      }, [isActive]);
    },

    /**
     * Skip link functionality
     */
    createSkipLink: (targetId: string, label: string) => {
      const handleSkip = (event: React.KeyboardEvent) => {
        event.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      return {
        href: `#${targetId}`,
        onClick: handleSkip,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleSkip(event);
          }
        },
        className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg',
        children: label
      };
    }
  };

  /**
   * ARIA utilities
   */
  const aria = {
    /**
     * Generate unique IDs for ARIA relationships
     */
    useId: (prefix: string = 'aria') => {
      const [id] = useState(() => `${prefix}-${Math.random().toString(36).substr(2, 9)}`);
      return id;
    },

    /**
     * Create ARIA describedby relationships
     */
    useDescribedBy: (descriptions: string[]) => {
      const ids = descriptions.map((_, index) => aria.useId(`desc-${index}`));
      return {
        'aria-describedby': ids.join(' '),
        descriptionIds: ids
      };
    },

    /**
     * Create ARIA labelledby relationships
     */
    useLabelledBy: (labels: string[]) => {
      const ids = labels.map((_, index) => aria.useId(`label-${index}`));
      return {
        'aria-labelledby': ids.join(' '),
        labelIds: ids
      };
    },

    /**
     * Expanded state for collapsible elements
     */
    useExpanded: (isExpanded: boolean) => ({
      'aria-expanded': isExpanded,
      'aria-controls': aria.useId('controls')
    })
  };

  /**
   * Color contrast and theme utilities
   */
  const contrast = {
    /**
     * Check if high contrast mode is preferred
     */
    useHighContrast: () => {
      const [isHighContrast, setIsHighContrast] = useState(false);

      useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-contrast: high)');
        setIsHighContrast(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
          setIsHighContrast(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }, []);

      return isHighContrast;
    },

    /**
     * Check if reduced motion is preferred
     */
    useReducedMotion: () => {
      const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

      useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
          setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }, []);

      return prefersReducedMotion;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  return {
    screenReader,
    keyboard,
    focus,
    aria,
    contrast,
    announcements
  };
};

/**
 * Simplified hook for basic accessibility features
 */
export const useEnhancedAccessibility = () => {
  const accessibility = useAccessibility();
  
  return {
    screenReaderUtils: accessibility.screenReader,
    keyboardUtils: accessibility.keyboard,
    focusUtils: accessibility.focus,
    ariaUtils: accessibility.aria,
    contrastUtils: accessibility.contrast
  };
};

export default useAccessibility;