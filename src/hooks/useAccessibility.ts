import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { 
  announceToScreenReader, 
  prefersReducedMotion, 
  prefersHighContrast,
  getFocusRingClasses,
  RovingTabindexManager
} from '../utils/accessibility';

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderAnnouncements: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  largeText: boolean;
}

/**
 * Hook for managing accessibility features and preferences
 */
export const useAccessibility = () => {
  const { preferences, updatePreferences } = useSettingsStore();
  
  // Get accessibility preferences from settings store
  const accessibilityPrefs = preferences.accessibility || {
    highContrast: false,
    reducedMotion: false,
    screenReaderAnnouncements: true,
    keyboardNavigation: true,
    focusVisible: true,
    largeText: false,
  };

  const [systemPreferences, setSystemPreferences] = useState({
    reducedMotion: prefersReducedMotion(),
    highContrast: prefersHighContrast(),
  });

  // Listen for system preference changes
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setSystemPreferences(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setSystemPreferences(prev => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  // Update accessibility preferences
  const updateAccessibilityPreferences = useCallback((newPrefs: Partial<AccessibilityPreferences>) => {
    updatePreferences({
      accessibility: { ...accessibilityPrefs, ...newPrefs }
    });
  }, [accessibilityPrefs, updatePreferences]);

  // Announce to screen reader
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (accessibilityPrefs.screenReaderAnnouncements) {
      announceToScreenReader(message, priority);
    }
  }, [accessibilityPrefs.screenReaderAnnouncements]);

  // Get effective preferences (combining user and system preferences)
  const effectivePreferences = {
    highContrast: accessibilityPrefs.highContrast || systemPreferences.highContrast,
    reducedMotion: accessibilityPrefs.reducedMotion || systemPreferences.reducedMotion,
    screenReaderAnnouncements: accessibilityPrefs.screenReaderAnnouncements,
    keyboardNavigation: accessibilityPrefs.keyboardNavigation,
    focusVisible: accessibilityPrefs.focusVisible,
    largeText: accessibilityPrefs.largeText,
  };

  // Get focus ring classes based on preferences
  const focusRingClasses = getFocusRingClasses(effectivePreferences.highContrast);

  // Apply accessibility classes to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (effectivePreferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (effectivePreferences.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Large text
    if (effectivePreferences.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Focus visible
    if (effectivePreferences.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }
  }, [effectivePreferences]);

  return {
    preferences: effectivePreferences,
    userPreferences: accessibilityPrefs,
    systemPreferences,
    updatePreferences: updateAccessibilityPreferences,
    announce,
    focusRingClasses,
  };
};

/**
 * Hook for managing keyboard navigation in lists
 */
export const useKeyboardNavigation = (
  containerRef: React.RefObject<HTMLElement | null>,
  itemSelector: string,
  orientation: 'horizontal' | 'vertical' = 'vertical'
) => {
  const managerRef = useRef<RovingTabindexManager | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize the roving tabindex manager
  useEffect(() => {
    if (containerRef.current) {
      managerRef.current = new RovingTabindexManager(containerRef.current, itemSelector);
      setCurrentIndex(managerRef.current.getCurrentIndex());
    }

    return () => {
      managerRef.current = null;
    };
  }, [containerRef, itemSelector]);

  // Update items when container changes
  const updateItems = useCallback(() => {
    if (containerRef.current && managerRef.current) {
      managerRef.current.updateItems(containerRef.current, itemSelector);
      setCurrentIndex(managerRef.current.getCurrentIndex());
    }
  }, [containerRef, itemSelector]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (managerRef.current) {
      const prevIndex = managerRef.current.getCurrentIndex();
      managerRef.current.handleKeyDown(event.nativeEvent, orientation);
      const newIndex = managerRef.current.getCurrentIndex();
      
      if (newIndex !== prevIndex) {
        setCurrentIndex(newIndex);
      }
    }
  }, [orientation]);

  // Set current index programmatically
  const setIndex = useCallback((index: number) => {
    if (managerRef.current) {
      managerRef.current.setCurrentIndex(index);
      setCurrentIndex(index);
    }
  }, []);

  // Focus current item
  const focusCurrent = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.focusCurrent();
    }
  }, []);

  return {
    currentIndex,
    setIndex,
    focusCurrent,
    handleKeyDown,
    updateItems,
  };
};

/**
 * Hook for managing focus trap (useful for modals)
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the container
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && containerRef.current) {
        const focusableElements = Array.from(
          containerRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ) as HTMLElement[];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Hook for managing live regions for screen reader announcements
 */
export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
    }
  }, []);

  return { announce };
};