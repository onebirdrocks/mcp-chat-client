import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibilityContext } from './AccessibilityProvider';
import Button from './Button';
import { Switch } from './Switch';
import { Select } from './Select';

interface AccessibilitySettingsProps {
  className?: string;
}

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ 
  className = '' 
}) => {
  const { t } = useTranslation();
  const { settings, updateSettings, isHighContrast, isReducedMotion, announceToScreenReader } = useAccessibilityContext();

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    updateSettings({ [key]: value });
    announceToScreenReader(
      t('accessibility.settingChanged', `${key} setting changed to ${value}`),
      'polite'
    );
  };

  const fontSizeOptions = [
    { value: 'small', label: t('accessibility.fontSize.small', 'Small') },
    { value: 'medium', label: t('accessibility.fontSize.medium', 'Medium') },
    { value: 'large', label: t('accessibility.fontSize.large', 'Large') },
    { value: 'extra-large', label: t('accessibility.fontSize.extraLarge', 'Extra Large') },
  ];

  const resetToDefaults = () => {
    updateSettings({
      highContrast: false,
      reducedMotion: false,
      fontSize: 'medium',
      focusVisible: true,
      screenReaderOptimized: false,
      keyboardNavigation: true,
    });
    announceToScreenReader(
      t('accessibility.settingsReset', 'Accessibility settings reset to defaults'),
      'polite'
    );
  };

  return (
    <div className={`accessibility-settings space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('accessibility.title', 'Accessibility Settings')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('accessibility.description', 'Customize the interface to meet your accessibility needs.')}
        </p>
      </div>

      {/* Visual Settings */}
      <section aria-labelledby="visual-settings-heading">
        <h4 
          id="visual-settings-heading"
          className="text-md font-medium text-gray-900 dark:text-white mb-4"
        >
          {t('accessibility.visual.title', 'Visual Settings')}
        </h4>
        
        <div className="space-y-4">
          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label 
                htmlFor="high-contrast-toggle"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('accessibility.highContrast.label', 'High Contrast Mode')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('accessibility.highContrast.description', 'Increases color contrast for better visibility')}
                {isHighContrast && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    ({t('accessibility.systemDetected', 'System preference detected')})
                  </span>
                )}
              </p>
            </div>
            <Switch
              id="high-contrast-toggle"
              checked={settings.highContrast}
              onChange={(checked) => handleSettingChange('highContrast', checked)}
              aria-describedby="high-contrast-description"
            />
          </div>

          {/* Font Size */}
          <div>
            <label 
              htmlFor="font-size-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('accessibility.fontSize.label', 'Font Size')}
            </label>
            <Select
              id="font-size-select"
              value={settings.fontSize}
              onChange={(value) => handleSettingChange('fontSize', value)}
              options={fontSizeOptions}
              className="w-full max-w-xs"
              aria-describedby="font-size-description"
            />
            <p 
              id="font-size-description"
              className="text-xs text-gray-500 dark:text-gray-400 mt-1"
            >
              {t('accessibility.fontSize.description', 'Adjust text size throughout the interface')}
            </p>
          </div>

          {/* Focus Visible */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label 
                htmlFor="focus-visible-toggle"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('accessibility.focusVisible.label', 'Enhanced Focus Indicators')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('accessibility.focusVisible.description', 'Show prominent focus outlines for keyboard navigation')}
              </p>
            </div>
            <Switch
              id="focus-visible-toggle"
              checked={settings.focusVisible}
              onChange={(checked) => handleSettingChange('focusVisible', checked)}
            />
          </div>
        </div>
      </section>

      {/* Motion Settings */}
      <section aria-labelledby="motion-settings-heading">
        <h4 
          id="motion-settings-heading"
          className="text-md font-medium text-gray-900 dark:text-white mb-4"
        >
          {t('accessibility.motion.title', 'Motion Settings')}
        </h4>
        
        <div className="space-y-4">
          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label 
                htmlFor="reduced-motion-toggle"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('accessibility.reducedMotion.label', 'Reduce Motion')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('accessibility.reducedMotion.description', 'Minimize animations and transitions')}
                {isReducedMotion && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    ({t('accessibility.systemDetected', 'System preference detected')})
                  </span>
                )}
              </p>
            </div>
            <Switch
              id="reduced-motion-toggle"
              checked={settings.reducedMotion}
              onChange={(checked) => handleSettingChange('reducedMotion', checked)}
            />
          </div>
        </div>
      </section>

      {/* Navigation Settings */}
      <section aria-labelledby="navigation-settings-heading">
        <h4 
          id="navigation-settings-heading"
          className="text-md font-medium text-gray-900 dark:text-white mb-4"
        >
          {t('accessibility.navigation.title', 'Navigation Settings')}
        </h4>
        
        <div className="space-y-4">
          {/* Keyboard Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label 
                htmlFor="keyboard-nav-toggle"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('accessibility.keyboardNav.label', 'Enhanced Keyboard Navigation')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('accessibility.keyboardNav.description', 'Enable advanced keyboard shortcuts and navigation')}
              </p>
            </div>
            <Switch
              id="keyboard-nav-toggle"
              checked={settings.keyboardNavigation}
              onChange={(checked) => handleSettingChange('keyboardNavigation', checked)}
            />
          </div>

          {/* Screen Reader Optimized */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label 
                htmlFor="screen-reader-toggle"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('accessibility.screenReader.label', 'Screen Reader Optimizations')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('accessibility.screenReader.description', 'Optimize interface for screen reader users')}
              </p>
            </div>
            <Switch
              id="screen-reader-toggle"
              checked={settings.screenReaderOptimized}
              onChange={(checked) => handleSettingChange('screenReaderOptimized', checked)}
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <section aria-labelledby="actions-heading">
        <h4 
          id="actions-heading"
          className="text-md font-medium text-gray-900 dark:text-white mb-4"
        >
          {t('accessibility.actions.title', 'Actions')}
        </h4>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{t('accessibility.resetDefaults', 'Reset to Defaults')}</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              announceToScreenReader(
                t('accessibility.testAnnouncement', 'This is a test announcement for screen readers'),
                'polite'
              );
            }}
            className="flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span>{t('accessibility.testScreenReader', 'Test Screen Reader')}</span>
          </Button>
        </div>
      </section>

      {/* Help Text */}
      <section className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          {t('accessibility.help.title', 'Accessibility Help')}
        </h4>
        <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <p>{t('accessibility.help.keyboard', '• Use Tab to navigate, Enter/Space to activate')}</p>
          <p>{t('accessibility.help.escape', '• Press Escape to close dialogs and menus')}</p>
          <p>{t('accessibility.help.arrows', '• Use arrow keys to navigate lists and menus')}</p>
          <p>{t('accessibility.help.skipLinks', '• Use skip links to jump to main content')}</p>
        </div>
      </section>
    </div>
  );
};

export default AccessibilitySettings;