import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './useTheme';
import { useLanguage } from './useLanguage';
import { useAccessibility } from './useAccessibility';
import { useSettingsStore } from '../store/settingsStore';
import type { Theme, Language, UserPreferences } from '../types';

/**
 * Comprehensive preferences management hook
 */
export const usePreferences = () => {
  const { theme, changeTheme } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { preferences: accessibilityPrefs, updatePreferences: updateAccessibilityPrefs } = useAccessibility();
  const { preferences, updatePreferences, isSaving } = useSettingsStore();

  // Handle theme changes with immediate UI updates
  const handleThemeChange = useCallback((newTheme: Theme) => {
    changeTheme(newTheme);
    updatePreferences({ theme: newTheme });
  }, [changeTheme, updatePreferences]);

  // Handle language changes
  const handleLanguageChange = useCallback(async (newLanguage: Language) => {
    if (newLanguage === currentLanguage) return;
    
    try {
      // Change language in i18next
      await changeLanguage(newLanguage);
      
      // Update preferences
      updatePreferences({ language: newLanguage });
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  }, [currentLanguage, changeLanguage, updatePreferences]);

  // Handle general preference changes
  const handlePreferenceChange = useCallback(<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    updatePreferences({ [key]: value });
  }, [updatePreferences]);

  // Handle accessibility preference changes
  const handleAccessibilityChange = useCallback((key: string, value: boolean) => {
    updateAccessibilityPrefs({ [key]: value });
  }, [updateAccessibilityPrefs]);

  // Bulk update preferences
  const updateAllPreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    const { theme: newTheme, language: newLanguage, ...otherPrefs } = newPreferences;
    
    // Handle theme change if provided
    if (newTheme && newTheme !== theme) {
      handleThemeChange(newTheme);
    }
    
    // Handle language change if provided
    if (newLanguage && newLanguage !== currentLanguage) {
      handleLanguageChange(newLanguage);
    }
    
    // Update other preferences
    if (Object.keys(otherPrefs).length > 0) {
      updatePreferences(otherPrefs);
    }
  }, [theme, currentLanguage, handleThemeChange, handleLanguageChange, updatePreferences]);

  // Reset preferences to defaults
  const resetPreferences = useCallback(() => {
    const defaultPrefs: Partial<UserPreferences> = {
      theme: 'system',
      language: 'en',
      autoScroll: true,
      soundEnabled: false,
    };
    
    updateAllPreferences(defaultPrefs);
  }, [updateAllPreferences]);

  // Get current effective preferences (combining all sources)
  const effectivePreferences: UserPreferences = {
    theme,
    language: currentLanguage,
    autoScroll: preferences.autoScroll ?? true,
    soundEnabled: preferences.soundEnabled ?? false,
  };

  // Check if preferences have been modified from defaults
  const hasModifiedPreferences = useCallback(() => {
    const defaults: UserPreferences = {
      theme: 'system',
      language: 'en',
      autoScroll: true,
      soundEnabled: false,
    };
    
    return JSON.stringify(effectivePreferences) !== JSON.stringify(defaults);
  }, [effectivePreferences]);

  // Export preferences for backup
  const exportPreferences = useCallback(() => {
    return {
      preferences: effectivePreferences,
      accessibility: accessibilityPrefs,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
  }, [effectivePreferences, accessibilityPrefs]);

  // Import preferences from backup
  const importPreferences = useCallback((importData: any) => {
    try {
      if (!importData || !importData.preferences) {
        throw new Error('Invalid import data format');
      }
      
      const { preferences: importedPrefs, accessibility: importedA11y } = importData;
      
      // Validate imported preferences
      if (typeof importedPrefs !== 'object') {
        throw new Error('Invalid preferences format');
      }
      
      // Apply imported preferences
      updateAllPreferences(importedPrefs);
      
      // Apply accessibility preferences if available
      if (importedA11y && typeof importedA11y === 'object') {
        Object.entries(importedA11y).forEach(([key, value]) => {
          if (typeof value === 'boolean') {
            handleAccessibilityChange(key, value);
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }, [updateAllPreferences, handleAccessibilityChange]);

  return {
    // Current preferences
    preferences: effectivePreferences,
    theme,
    language: currentLanguage,
    accessibilityPreferences: accessibilityPrefs,
    
    // State flags
    isSaving,
    hasModifiedPreferences: hasModifiedPreferences(),
    
    // Change handlers
    changeTheme: handleThemeChange,
    changeLanguage: handleLanguageChange,
    changePreference: handlePreferenceChange,
    changeAccessibilityPreference: handleAccessibilityChange,
    updateAllPreferences,
    resetPreferences,
    
    // Import/Export
    exportPreferences,
    importPreferences,
  };
};

export default usePreferences;