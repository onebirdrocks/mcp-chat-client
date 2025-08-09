/**
 * Accessibility utilities for MCP Chat UI
 * Provides functions for keyboard navigation, screen reader support, and WCAG compliance
 */

// Keyboard navigation utilities
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Check if an element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  return focusableSelectors.some(selector => element.matches(selector));
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
};

/**
 * Trap focus within a container (useful for modals)
 */
export const trapFocus = (container: HTMLElement, event: KeyboardEvent): void => {
  if (event.key !== KEYBOARD_KEYS.TAB) return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
};

/**
 * Handle arrow key navigation in a list
 */
export const handleArrowNavigation = (
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onIndexChange: (index: number) => void,
  orientation: 'horizontal' | 'vertical' = 'vertical'
): void => {
  const { key } = event;
  let newIndex = currentIndex;

  if (orientation === 'vertical') {
    if (key === KEYBOARD_KEYS.ARROW_UP) {
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    } else if (key === KEYBOARD_KEYS.ARROW_DOWN) {
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    }
  } else {
    if (key === KEYBOARD_KEYS.ARROW_LEFT) {
      newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    } else if (key === KEYBOARD_KEYS.ARROW_RIGHT) {
      newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    }
  }

  if (key === KEYBOARD_KEYS.HOME) {
    newIndex = 0;
  } else if (key === KEYBOARD_KEYS.END) {
    newIndex = items.length - 1;
  }

  if (newIndex !== currentIndex) {
    event.preventDefault();
    onIndexChange(newIndex);
    items[newIndex]?.focus();
  }
};

/**
 * Announce text to screen readers
 */
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Generate unique IDs for accessibility attributes
 */
export const generateA11yId = (prefix: string = 'a11y'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Check if user prefers high contrast
 */
export const prefersHighContrast = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Get appropriate focus ring classes based on user preferences
 */
export const getFocusRingClasses = (highContrast: boolean = false): string => {
  const baseClasses = 'focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  if (highContrast) {
    return `${baseClasses} focus:ring-black dark:focus:ring-white focus:ring-offset-white dark:focus:ring-offset-black`;
  }
  
  return `${baseClasses} focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-gray-800`;
};

/**
 * Create a roving tabindex manager for lists
 */
export class RovingTabindexManager {
  private items: HTMLElement[] = [];
  private currentIndex: number = 0;

  constructor(container: HTMLElement, itemSelector: string) {
    this.updateItems(container, itemSelector);
  }

  updateItems(container: HTMLElement, itemSelector: string): void {
    this.items = Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[];
    this.setTabindexes();
  }

  private setTabindexes(): void {
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
    });
  }

  setCurrentIndex(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.setTabindexes();
    }
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getItems(): HTMLElement[] {
    return this.items;
  }

  focusCurrent(): void {
    this.items[this.currentIndex]?.focus();
  }

  handleKeyDown(event: KeyboardEvent, orientation: 'horizontal' | 'vertical' = 'vertical'): void {
    handleArrowNavigation(
      event,
      this.items,
      this.currentIndex,
      (newIndex) => this.setCurrentIndex(newIndex),
      orientation
    );
  }
}

/**
 * WCAG color contrast utilities
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  // This is a simplified implementation
  // In a real app, you'd use a proper color contrast library
  const getLuminance = (color: string): number => {
    // Convert hex to RGB and calculate luminance
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if color combination meets WCAG AA standards
 */
export const meetsWCAGAA = (foreground: string, background: string): boolean => {
  return getContrastRatio(foreground, background) >= 4.5;
};

/**
 * Check if color combination meets WCAG AAA standards
 */
export const meetsWCAGAAA = (foreground: string, background: string): boolean => {
  return getContrastRatio(foreground, background) >= 7;
};

/**
 * Skip link utilities
 */
export const createSkipLink = (targetId: string, text: string): HTMLElement => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg';
  
  return skipLink;
};

/**
 * Screen reader only text utility
 */
export const createScreenReaderText = (text: string): HTMLElement => {
  const srText = document.createElement('span');
  srText.className = 'sr-only';
  srText.textContent = text;
  return srText;
};

/**
 * Enhanced keyboard navigation utilities
 */
export const NAVIGATION_KEYS = {
  ...KEYBOARD_KEYS,
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  F1: 'F1',
  F2: 'F2',
  F3: 'F3',
  F4: 'F4',
  F5: 'F5',
  F6: 'F6',
  F7: 'F7',
  F8: 'F8',
  F9: 'F9',
  F10: 'F10',
  F11: 'F11',
  F12: 'F12',
} as const;

/**
 * Enhanced ARIA utilities
 */
export const setAriaAttributes = (element: HTMLElement, attributes: Record<string, string | boolean | number>): void => {
  Object.entries(attributes).forEach(([key, value]) => {
    const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
    element.setAttribute(ariaKey, String(value));
  });
};

/**
 * Create live region for dynamic announcements
 */
export const createLiveRegion = (priority: 'polite' | 'assertive' = 'polite'): HTMLElement => {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.id = `live-region-${Date.now()}`;
  document.body.appendChild(liveRegion);
  return liveRegion;
};

/**
 * Enhanced focus management
 */
export const manageFocus = {
  /**
   * Set focus to element with optional delay
   */
  setFocus: (element: HTMLElement | null, delay = 0): void => {
    if (!element) return;
    
    if (delay > 0) {
      setTimeout(() => element.focus(), delay);
    } else {
      element.focus();
    }
  },

  /**
   * Find next focusable element
   */
  findNextFocusable: (currentElement: HTMLElement, direction: 'forward' | 'backward' = 'forward'): HTMLElement | null => {
    const focusableElements = getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex === -1) return null;
    
    const nextIndex = direction === 'forward' 
      ? (currentIndex + 1) % focusableElements.length
      : (currentIndex - 1 + focusableElements.length) % focusableElements.length;
    
    return focusableElements[nextIndex] || null;
  },

  /**
   * Create focus trap for modal dialogs
   */
  createFocusTrap: (container: HTMLElement): (() => void) => {
    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYBOARD_KEYS.TAB) {
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
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  /**
   * Announce message with priority
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  },

  /**
   * Create status region for ongoing updates
   */
  createStatusRegion: (id: string): HTMLElement => {
    let statusRegion = document.getElementById(id);
    
    if (!statusRegion) {
      statusRegion = document.createElement('div');
      statusRegion.id = id;
      statusRegion.setAttribute('aria-live', 'polite');
      statusRegion.setAttribute('aria-atomic', 'false');
      statusRegion.className = 'sr-only';
      document.body.appendChild(statusRegion);
    }
    
    return statusRegion;
  },

  /**
   * Update status region
   */
  updateStatus: (id: string, message: string): void => {
    const statusRegion = document.getElementById(id);
    if (statusRegion) {
      statusRegion.textContent = message;
    }
  },
};

/**
 * Keyboard shortcut utilities
 */
export const keyboardShortcuts = {
  /**
   * Register global keyboard shortcut
   */
  register: (key: string, callback: (event: KeyboardEvent) => void, options: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  } = {}): (() => void) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrl = false, alt = false, shift = false, meta = false } = options;
      
      if (
        event.key === key &&
        event.ctrlKey === ctrl &&
        event.altKey === alt &&
        event.shiftKey === shift &&
        event.metaKey === meta
      ) {
        event.preventDefault();
        callback(event);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Format shortcut for display
   */
  formatShortcut: (key: string, options: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  } = {}): string => {
    const { ctrl = false, alt = false, shift = false, meta = false } = options;
    const parts: string[] = [];
    
    if (meta) parts.push('⌘');
    if (ctrl) parts.push('Ctrl');
    if (alt) parts.push('Alt');
    if (shift) parts.push('Shift');
    parts.push(key);
    
    return parts.join('+');
  },
};

/**
 * Color and contrast utilities
 */
export const colorUtils = {
  /**
   * Get accessible color pair
   */
  getAccessibleColorPair: (backgroundColor: string): { foreground: string; background: string } => {
    const whiteContrast = getContrastRatio('#ffffff', backgroundColor);
    const blackContrast = getContrastRatio('#000000', backgroundColor);
    
    return {
      foreground: whiteContrast >= blackContrast ? '#ffffff' : '#000000',
      background: backgroundColor,
    };
  },

  /**
   * Ensure minimum contrast ratio
   */
  ensureContrast: (foreground: string, background: string, minRatio = 4.5): string => {
    const currentRatio = getContrastRatio(foreground, background);
    
    if (currentRatio >= minRatio) {
      return foreground;
    }
    
    // Return high contrast alternative
    return getContrastRatio('#000000', background) > getContrastRatio('#ffffff', background)
      ? '#000000'
      : '#ffffff';
  },
};