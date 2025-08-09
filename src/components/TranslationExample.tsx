import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSelector } from './LanguageSelector';

/**
 * Example component demonstrating the usage of translation utilities
 * This component can be removed in production
 */
export const TranslationExample: React.FC = () => {
  const { tNs, tPlural, tValues, currentLanguage } = useTranslation();

  const messageCount = 5;
  const userName = 'John Doe';

  return (
    <div className="p-6 max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Translation Examples
      </h2>
      
      {/* Language Selector */}
      <div className="mb-6">
        <LanguageSelector variant="buttons" />
      </div>

      {/* Basic translations */}
      <div className="space-y-3">
        <div>
          <strong>Common:</strong> {tNs.common('save')} | {tNs.common('cancel')}
        </div>
        
        <div>
          <strong>Chat:</strong> {tNs.chat('newChat')} | {tNs.chat('sendMessage')}
        </div>
        
        <div>
          <strong>Settings:</strong> {tNs.settings('language')} | {tNs.settings('theme')}
        </div>
        
        <div>
          <strong>Errors:</strong> {tNs.errors('connectionFailed')}
        </div>

        {/* Pluralization example */}
        <div>
          <strong>Pluralization:</strong> {tPlural('chat.messageCount', messageCount)}
        </div>

        {/* Interpolation example */}
        <div>
          <strong>Interpolation:</strong> {tValues('common.loading' as any, { user: userName })}
        </div>

        {/* Current language */}
        <div>
          <strong>Current Language:</strong> {currentLanguage}
        </div>
      </div>
    </div>
  );
};

export default TranslationExample;