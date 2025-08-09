import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LLMProviderConfig } from '@/components';
import MCPServerConfig from '@/components/MCPServerConfig';
import PreferencesConfig from '@/components/PreferencesConfig';
import SettingsTest from '@/components/SettingsTest';
import ResponsiveTest from '@/components/ResponsiveTest';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'llm' | 'mcp' | 'preferences' | 'test' | 'responsive'>('llm');

  const tabs = [
    { id: 'llm' as const, label: t('settings.llmProvider') },
    { id: 'mcp' as const, label: t('settings.mcpServers') },
    { id: 'preferences' as const, label: t('settings.preferences') },
    { id: 'test' as const, label: 'Test Interface' },
    { id: 'responsive' as const, label: 'Responsive Test' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {t('settings.title')}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {t('settings.description')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4 sm:mb-6">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'llm' && (
            <LLMProviderConfig />
          )}

          {activeTab === 'mcp' && (
            <MCPServerConfig />
          )}

          {activeTab === 'preferences' && (
            <PreferencesConfig />
          )}

          {activeTab === 'test' && (
            <SettingsTest />
          )}

          {activeTab === 'responsive' && (
            <ResponsiveTest />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;