'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { useAccessibility } from '../../src/hooks/useAccessibility';
import { useSettingsStore } from '../../src/store/settingsStore';
import type { Theme, Language, AccessibilityPreferences } from '../../src/types';

interface PreferencesConfigProps {
  className?: string;
}

const PreferencesConfig: React.FC<PreferencesConfigProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme, changeTheme } = useTheme();
  const { currentLanguage, changeLanguage, supportedLanguages, getLanguageName } = useLanguage();
  const { userPreferences: accessibilityPrefs, updatePreferences: updateAccessibilityPrefs } = useAccessibility();
  const { preferences, updatePreferences } = useSettingsStore();
  
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Handle theme change
  const handleThemeChange = (newTheme: Theme) => {
    changeTheme(newTheme);
    updatePreferences({ theme: newTheme });
  };

  // Handle language change with Next.js router
  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === currentLanguage) return;
    
    setIsChangingLanguage(true);
    
    try {
      // Change language in i18next
      await changeLanguage(newLanguage);
      
      // Update preferences
      updatePreferences({ language: newLanguage });
      
      // For App Router, we don't need to change routes for language
      // The language change is handled by i18next and stored in localStorage
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  // Handle general preference changes
  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    updatePreferences({ [key]: value });
  };

  // Handle accessibility preference changes
  const handleAccessibilityChange = (key: keyof AccessibilityPreferences, value: boolean) => {
    updateAccessibilityPrefs({ [key]: value });
  };

  const ToggleSwitch: React.FC<{
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  }> = ({ id, label, description, checked, onChange, disabled = false }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <label 
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          {label}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-description`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked 
            ? 'bg-blue-600' 
            : 'bg-gray-200 dark:bg-gray-700'
          }
        `}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <div id={`${id}-description`} className="sr-only">
        {description}
      </div>
    </div>
  );

  const SelectField: React.FC<{
    id: string;
    label: string;
    description: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
  }> = ({ id, label, description, value, options, onChange, disabled = false }) => (
    <div className="py-3">
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {description}
      </p>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="
          block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
          rounded-md shadow-sm bg-white dark:bg-gray-800 
          text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Language and Theme */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('settings.general', 'General')}
        </h3>
        
        <div className="space-y-4">
          <SelectField
            id="language-select"
            label={t('settings.language', 'Language')}
            description={t('settings.languageDescription', 'Choose your preferred language for the interface')}
            value={currentLanguage}
            options={supportedLanguages.map(lang => ({
              value: lang,
              label: getLanguageName(lang)
            }))}
            onChange={handleLanguageChange}
            disabled={isChangingLanguage}
          />

          <SelectField
            id="theme-select"
            label={t('settings.theme', 'Theme')}
            description={t('settings.themeDescription', 'Choose your preferred color theme')}
            value={theme}
            options={[
              { value: 'light', label: t('themes.light', 'Light') },
              { value: 'dark', label: t('themes.dark', 'Dark') },
              { value: 'system', label: t('themes.system', 'System') }
            ]}
            onChange={(value) => handleThemeChange(value as Theme)}
          />
        </div>
      </div>

      {/* Chat Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('settings.preferences', 'Preferences')}
        </h3>
        
        <div className="space-y-2">
          <ToggleSwitch
            id="auto-scroll"
            label={t('settings.autoScroll', 'Auto-scroll')}
            description={t('settings.autoScrollDescription', 'Automatically scroll to new messages')}
            checked={preferences.autoScroll}
            onChange={(checked) => handlePreferenceChange('autoScroll', checked)}
          />

          <ToggleSwitch
            id="sound-enabled"
            label={t('settings.soundEnabled', 'Sound notifications')}
            description={t('settings.soundEnabledDescription', 'Play sounds for notifications')}
            checked={preferences.soundEnabled}
            onChange={(checked) => handlePreferenceChange('soundEnabled', checked)}
          />
        </div>
      </div>

      {/* Accessibility Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('accessibility.title', 'Accessibility')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('accessibility.description', 'Configure accessibility features to improve your experience')}
        </p>
        
        <div className="space-y-2">
          <ToggleSwitch
            id="high-contrast"
            label={t('accessibility.highContrast', 'High Contrast Mode')}
            description={t('accessibility.highContrastDescription', 'Increase contrast for better visibility')}
            checked={accessibilityPrefs.highContrast}
            onChange={(checked) => handleAccessibilityChange('highContrast', checked)}
          />

          <ToggleSwitch
            id="large-text"
            label={t('accessibility.largeText', 'Large Text')}
            description={t('accessibility.largeTextDescription', 'Increase text size throughout the interface')}
            checked={accessibilityPrefs.largeText}
            onChange={(checked) => handleAccessibilityChange('largeText', checked)}
          />

          <ToggleSwitch
            id="reduced-motion"
            label={t('accessibility.reducedMotion', 'Reduce Motion')}
            description={t('accessibility.reducedMotionDescription', 'Minimize animations and transitions')}
            checked={accessibilityPrefs.reducedMotion}
            onChange={(checked) => handleAccessibilityChange('reducedMotion', checked)}
          />

          <ToggleSwitch
            id="focus-visible"
            label={t('accessibility.focusVisible', 'Enhanced Focus Indicators')}
            description={t('accessibility.focusVisibleDescription', 'Show clear focus indicators for keyboard navigation')}
            checked={accessibilityPrefs.focusVisible}
            onChange={(checked) => handleAccessibilityChange('focusVisible', checked)}
          />

          <ToggleSwitch
            id="keyboard-navigation"
            label={t('accessibility.keyboardNavigation', 'Enhanced Keyboard Navigation')}
            description={t('accessibility.keyboardNavigationDescription', 'Improve keyboard navigation with arrow keys and shortcuts')}
            checked={accessibilityPrefs.keyboardNavigation}
            onChange={(checked) => handleAccessibilityChange('keyboardNavigation', checked)}
          />

          <ToggleSwitch
            id="screen-reader-announcements"
            label={t('accessibility.screenReaderAnnouncements', 'Screen Reader Announcements')}
            description={t('accessibility.screenReaderAnnouncementsDescription', 'Announce important changes and updates to screen readers')}
            checked={accessibilityPrefs.screenReaderAnnouncements}
            onChange={(checked) => handleAccessibilityChange('screenReaderAnnouncements', checked)}
          />
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <svg 
            className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              {t('accessibility.wcagCompliance', 'WCAG 2.1 AA Compliance')}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t('accessibility.wcagDescription', 'This application follows Web Content Accessibility Guidelines (WCAG) 2.1 AA standards to ensure accessibility for all users.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesConfig;