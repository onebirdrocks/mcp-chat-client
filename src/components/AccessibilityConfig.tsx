import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../hooks/useAccessibility';
import { Card, CardHeader, CardTitle, CardContent } from './ui';

const AccessibilityConfig: React.FC = () => {
  const { t } = useTranslation();
  const { userPreferences, updatePreferences, systemPreferences } = useAccessibility();

  const handleTogglePreference = (key: keyof typeof userPreferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const ToggleSwitch: React.FC<{
    id: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  }> = ({ id, label, description, checked, onChange, disabled = false }) => (
    <div className="flex items-center justify-between">
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

  return (
    <Card variant="outlined">
      <CardHeader>
        <CardTitle>{t('accessibility.title', 'Accessibility')}</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('accessibility.description', 'Configure accessibility features to improve your experience')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Visual Accessibility */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              {t('accessibility.visual', 'Visual Accessibility')}
            </h4>
            <div className="space-y-4">
              <ToggleSwitch
                id="high-contrast"
                label={t('accessibility.highContrast', 'High Contrast Mode')}
                description={
                  systemPreferences.highContrast
                    ? t('accessibility.highContrastSystemEnabled', 'System high contrast is enabled')
                    : t('accessibility.highContrastDescription', 'Increase contrast for better visibility')
                }
                checked={userPreferences.highContrast}
                onChange={(checked) => handleTogglePreference('highContrast', checked)}
              />

              <ToggleSwitch
                id="large-text"
                label={t('accessibility.largeText', 'Large Text')}
                description={t('accessibility.largeTextDescription', 'Increase text size throughout the interface')}
                checked={userPreferences.largeText}
                onChange={(checked) => handleTogglePreference('largeText', checked)}
              />

              <ToggleSwitch
                id="focus-visible"
                label={t('accessibility.focusVisible', 'Enhanced Focus Indicators')}
                description={t('accessibility.focusVisibleDescription', 'Show clear focus indicators for keyboard navigation')}
                checked={userPreferences.focusVisible}
                onChange={(checked) => handleTogglePreference('focusVisible', checked)}
              />
            </div>
          </div>

          {/* Motion and Animation */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              {t('accessibility.motion', 'Motion and Animation')}
            </h4>
            <div className="space-y-4">
              <ToggleSwitch
                id="reduced-motion"
                label={t('accessibility.reducedMotion', 'Reduce Motion')}
                description={
                  systemPreferences.reducedMotion
                    ? t('accessibility.reducedMotionSystemEnabled', 'System reduced motion is enabled')
                    : t('accessibility.reducedMotionDescription', 'Minimize animations and transitions')
                }
                checked={userPreferences.reducedMotion}
                onChange={(checked) => handleTogglePreference('reducedMotion', checked)}
              />
            </div>
          </div>

          {/* Interaction */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              {t('accessibility.interaction', 'Interaction')}
            </h4>
            <div className="space-y-4">
              <ToggleSwitch
                id="keyboard-navigation"
                label={t('accessibility.keyboardNavigation', 'Enhanced Keyboard Navigation')}
                description={t('accessibility.keyboardNavigationDescription', 'Improve keyboard navigation with arrow keys and shortcuts')}
                checked={userPreferences.keyboardNavigation}
                onChange={(checked) => handleTogglePreference('keyboardNavigation', checked)}
              />

              <ToggleSwitch
                id="screen-reader-announcements"
                label={t('accessibility.screenReaderAnnouncements', 'Screen Reader Announcements')}
                description={t('accessibility.screenReaderAnnouncementsDescription', 'Announce important changes and updates to screen readers')}
                checked={userPreferences.screenReaderAnnouncements}
                onChange={(checked) => handleTogglePreference('screenReaderAnnouncements', checked)}
              />
            </div>
          </div>

          {/* System Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              {t('accessibility.systemInfo', 'System Preferences')}
            </h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>{t('accessibility.systemHighContrast', 'System High Contrast:')}</span>
                <span className={systemPreferences.highContrast ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  {systemPreferences.highContrast ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('accessibility.systemReducedMotion', 'System Reduced Motion:')}</span>
                <span className={systemPreferences.reducedMotion ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  {systemPreferences.reducedMotion ? t('common.enabled', 'Enabled') : t('common.disabled', 'Disabled')}
                </span>
              </div>
            </div>
          </div>

          {/* Accessibility Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              {t('accessibility.info', 'Accessibility Information')}
            </h4>
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
                  <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {t('accessibility.wcagCompliance', 'WCAG 2.1 AA Compliance')}
                  </h5>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('accessibility.wcagDescription', 'This application follows Web Content Accessibility Guidelines (WCAG) 2.1 AA standards to ensure accessibility for all users.')}
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-blue-600 dark:text-blue-400">
                    <div>• {t('accessibility.keyboardSupport', 'Full keyboard navigation support')}</div>
                    <div>• {t('accessibility.screenReaderSupport', 'Screen reader compatibility')}</div>
                    <div>• {t('accessibility.colorContrastSupport', 'Sufficient color contrast ratios')}</div>
                    <div>• {t('accessibility.focusManagement', 'Proper focus management')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccessibilityConfig;