import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import { Card, CardHeader, CardTitle, CardContent, Select } from './ui';
import { LanguageSelector } from './LanguageSelector';
import AccessibilityConfig from './AccessibilityConfig';
import ThemeToggle from './ThemeToggle';
import type { Theme, Language } from '../types';

const PreferencesConfig: React.FC = () => {
  const { t } = useTranslation();
  const {
    preferences,
    updatePreferences,
    isSaving
  } = useSettingsStore();

  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handleLanguageChange = (newLanguage: Language) => {
    // Store language in localStorage (browser-specific)
    localStorage.setItem('mcp-chat-ui-language', newLanguage);
    
    // Update i18n immediately
    import('../utils/i18n').then(({ default: i18n }) => {
      i18n.changeLanguage(newLanguage);
    });
  };

  const handleTogglePreference = (key: keyof typeof preferences, value: boolean) => {
    const newPreferences = { ...localPreferences, [key]: value };
    setLocalPreferences(newPreferences);
    updatePreferences({ [key]: value });
  };

  const themeOptions = [
    { value: 'light' as const, label: t('themes.light') },
    { value: 'dark' as const, label: t('themes.dark') },
    { value: 'system' as const, label: t('themes.system') }
  ];

  return (
    <Card variant="outlined">
      <CardHeader>
        <CardTitle>{t('settings.preferences')}</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('settings.description')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Theme Selection */}
          <ThemeToggle />

          {/* Language Selection */}
          <div>
            <LanguageSelector 
              onLanguageChange={handleLanguageChange}
              className="w-full"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Language changes take effect immediately
            </p>
          </div>

          {/* Auto-scroll Setting */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.autoScroll')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Automatically scroll to new messages in chat
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePreference('autoScroll', !localPreferences.autoScroll)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${localPreferences.autoScroll 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-700'
                }
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${localPreferences.autoScroll ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Sound Notifications Setting */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.soundEnabled')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Play sound notifications for new messages
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePreference('soundEnabled', !localPreferences.soundEnabled)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${localPreferences.soundEnabled 
                  ? 'bg-blue-600' 
                  : 'bg-gray-200 dark:bg-gray-700'
                }
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${localPreferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Additional Preferences Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Additional Settings
            </h4>
            
            {/* Placeholder for future preferences */}
            <div className="space-y-4">
              <div className="flex items-center justify-between opacity-50">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Compact Mode
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use compact layout for messages (Coming soon)
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between opacity-50">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show Timestamps
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Display message timestamps (Coming soon)
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Save Status */}
          {isSaving && (
            <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Saving preferences...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PreferencesConfigWithAccessibility: React.FC = () => {
  return (
    <div className="space-y-6">
      <PreferencesConfig />
      <AccessibilityConfig />
    </div>
  );
};

export default PreferencesConfigWithAccessibility;