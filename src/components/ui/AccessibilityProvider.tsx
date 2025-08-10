import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  focusVisible: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  isHighContrast: boolean;
  isReducedMotion: boolean;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  
  // Default accessibility settings
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-settings');
      if (saved) {
        try {
          return { ...getDefaultSettings(), ...JSON.parse(saved) };
        } catch (e) {
          console.warn('Failed to parse saved accessibility settings:', e);
        }
      }
    }
    return getDefaultSettings();
  });

  // System preferences detection
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  function getDefaultSettings(): AccessibilitySettings {
    return {
      highContrast: false,
      reducedMotion: false,
      fontSize: 'medium',
      focusVisible: true,
      screenReaderOptimized: false,
      keyboardNavigation: true,
    };
  }

  // Detect system preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // High contrast detection
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(highContrastQuery.matches);
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };
    
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    // Reduced motion detection
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(reducedMotionQuery.matches);
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    return () => {
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, []);

  // Apply accessibility settings to document
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Apply high contrast
    root.classList.toggle('high-contrast', settings.highContrast || isHighContrast);
    
    // Apply reduced motion
    root.classList.toggle('reduced-motion', settings.reducedMotion || isReducedMotion);
    
    // Apply font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${settings.fontSize}`);
    
    // Apply focus visible
    root.classList.toggle('focus-visible-enabled', settings.focusVisible);
    
    // Apply screen reader optimizations
    root.classList.toggle('screen-reader-optimized', settings.screenReaderOptimized);
    
    // Apply keyboard navigation enhancements
    root.classList.toggle('keyboard-navigation-enhanced', settings.keyboardNavigation);

    // Set CSS custom properties for accessibility
    root.style.setProperty('--a11y-focus-width', settings.focusVisible ? '3px' : '2px');
    root.style.setProperty('--a11y-focus-color', settings.highContrast ? '#ffff00' : '#0066cc');
    root.style.setProperty('--a11y-animation-duration', settings.reducedMotion || isReducedMotion ? '0ms' : '200ms');
    
  }, [settings, isHighContrast, isReducedMotion]);

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    }
  }, [settings]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Screen reader announcement function
  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (typeof window === 'undefined') return;

    // Create or get live region
    let liveRegion = document.getElementById(`a11y-live-${priority}`);
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = `a11y-live-${priority}`;
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }

    // Clear and set message
    liveRegion.textContent = '';
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message;
      }
    }, 100);

    // Clear after delay to allow re-announcement
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = '';
      }
    }, 1000);
  };

  // Initialize skip links
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const skipLinksContainer = document.getElementById('skip-links');
    if (!skipLinksContainer) {
      const container = document.createElement('div');
      container.id = 'skip-links';
      container.className = 'skip-links';
      container.innerHTML = `
        <a href="#main-content" class="skip-link">${t('accessibility.skipToMain', 'Skip to main content')}</a>
        <a href="#navigation" class="skip-link">${t('accessibility.skipToNav', 'Skip to navigation')}</a>
        <a href="#search" class="skip-link">${t('accessibility.skipToSearch', 'Skip to search')}</a>
      `;
      document.body.insertBefore(container, document.body.firstChild);
    }
  }, [t]);

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    isHighContrast: settings.highContrast || isHighContrast,
    isReducedMotion: settings.reducedMotion || isReducedMotion,
    announceToScreenReader,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;