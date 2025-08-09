import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { useSettingsStore } from '@/store/settingsStore';
import { getApiKeyStatus, truncateUrl } from '@/utils';
import type { LLMProvider, LLMProviderConfig as LLMProviderConfigType, ModelInfo } from '@/types';

interface LLMProviderConfigProps {
  className?: string;
}

// Default models for each provider with tool calling support information
const DEFAULT_MODELS: Record<LLMProvider, ModelInfo[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', supportsToolCalling: true, maxTokens: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsToolCalling: true, maxTokens: 128000 },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', supportsToolCalling: true, maxTokens: 128000 },
    { id: 'gpt-4', name: 'GPT-4', supportsToolCalling: true, maxTokens: 8192 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', supportsToolCalling: true, maxTokens: 16385 },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', supportsToolCalling: true, maxTokens: 32768 },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', supportsToolCalling: true, maxTokens: 16384 },
  ],
  openrouter: [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', supportsToolCalling: true, maxTokens: 200000 },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', supportsToolCalling: true, maxTokens: 200000 },
    { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)', supportsToolCalling: true, maxTokens: 128000 },
    { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', supportsToolCalling: true, maxTokens: 2000000 },
  ],
};

// Default base URLs for each provider
const DEFAULT_BASE_URLS: Record<LLMProvider, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
};

const LLMProviderConfig: React.FC<LLMProviderConfigProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const {
    llmProviders,
    addLLMProvider,
    updateLLMProvider,
    removeLLMProvider,
    toggleLLMProvider,
    testLLMConnection,
  } = useSettingsStore();

  // Form state for adding/editing providers
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: 'openai' as LLMProvider,
    apiKey: '',
    baseUrl: '',
    models: [] as ModelInfo[],
    enabled: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; error?: string; timestamp: number }>>({});
  
  // Note: API key testing is now handled by the backend

  // Reset form when adding new provider
  const handleAddProvider = () => {
    setFormData({
      name: 'openai',
      apiKey: '',
      baseUrl: DEFAULT_BASE_URLS.openai,
      models: DEFAULT_MODELS.openai,
      enabled: true,
    });
    setFormErrors({});
    setIsAddingProvider(true);
    setEditingProviderId(null);
  };

  // Edit existing provider
  const handleEditProvider = (provider: LLMProviderConfigType) => {
    setFormData({
      name: provider.name,
      // If API key is masked, show empty field for user to enter new key
      apiKey: provider.apiKey && provider.apiKey.includes('*') ? '' : provider.apiKey,
      baseUrl: provider.baseUrl || DEFAULT_BASE_URLS[provider.name],
      models: provider.models.length > 0 ? provider.models : DEFAULT_MODELS[provider.name],
      enabled: provider.enabled,
    });
    setFormErrors({});
    setIsAddingProvider(false);
    setEditingProviderId(provider.id);
  };

  // Cancel form
  const handleCancelForm = () => {
    setIsAddingProvider(false);
    setEditingProviderId(null);
    setFormData({
      name: 'openai',
      apiKey: '',
      baseUrl: '',
      models: [],
      enabled: true,
    });
    setFormErrors({});
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // For editing existing providers, API key is optional (user can keep existing one)
    // For new providers, API key is required
    if (!editingProviderId && !formData.apiKey.trim()) {
      errors.apiKey = t('errors.invalidApiKey');
    }

    if (formData.baseUrl && !isValidUrl(formData.baseUrl)) {
      errors.baseUrl = t('errors.invalidConfiguration');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to validate URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Save provider
  const handleSaveProvider = () => {
    if (!validateForm()) return;

    const providerData: Partial<LLMProviderConfigType> = {
      name: formData.name,
      baseUrl: formData.baseUrl.trim() || DEFAULT_BASE_URLS[formData.name],
      models: formData.models,
      enabled: formData.enabled,
    };

    // Only include API key if it's provided (not empty)
    if (formData.apiKey.trim()) {
      providerData.apiKey = formData.apiKey.trim();
    }

    if (editingProviderId) {
      updateLLMProvider(editingProviderId, providerData);
    } else {
      // For new providers, API key is required
      if (!formData.apiKey.trim()) {
        setFormErrors({ apiKey: t('errors.invalidApiKey') });
        return;
      }
      addLLMProvider({
        ...providerData,
        apiKey: formData.apiKey.trim(),
      } as Omit<LLMProviderConfigType, 'id'>);
    }

    handleCancelForm();
  };

  // Test connection - use backend API for testing
  const handleTestConnection = async (providerId: string) => {
    setTestingConnections(prev => new Set(prev).add(providerId));
    
    try {
      // Call backend API to test connection using stored API key
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setConnectionResults(prev => ({
          ...prev,
          [providerId]: {
            success: result.success,
            error: result.error,
            timestamp: Date.now(),
          }
        }));
      } else {
        throw new Error('Failed to test connection');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionResults(prev => ({
        ...prev,
        [providerId]: {
          success: false,
          error: error instanceof Error ? error.message : 'Connection test failed',
          timestamp: Date.now(),
        }
      }));
    } finally {
      setTestingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
    }
  };

  // Note: API key input for testing is no longer needed

  // Update form data when provider selection changes
  useEffect(() => {
    if (isAddingProvider || editingProviderId) {
      setFormData(prev => ({
        ...prev,
        baseUrl: prev.baseUrl || DEFAULT_BASE_URLS[prev.name],
        models: prev.models.length > 0 ? prev.models : DEFAULT_MODELS[prev.name],
      }));
    }
  }, [formData.name, isAddingProvider, editingProviderId]);

  const providerOptions = [
    { value: 'openai', label: t('providers.openai') },
    { value: 'deepseek', label: t('providers.deepseek') },
    { value: 'openrouter', label: t('providers.openrouter') },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <Card variant="outlined">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('settings.llmProvider')}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.llmProviderDescription')}
              </p>
            </div>
            <Button
              onClick={handleAddProvider}
              disabled={isAddingProvider || editingProviderId !== null}
            >
              {t('settings.addProvider', 'Add Provider')}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Add/Edit Provider Form */}
          {(isAddingProvider || editingProviderId) && (
            <Card variant="outlined" className="mb-6 bg-gray-50 dark:bg-gray-900">
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label={t('settings.llmProvider')}
                      options={providerOptions}
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        name: e.target.value as LLMProvider,
                        baseUrl: DEFAULT_BASE_URLS[e.target.value as LLMProvider],
                        models: DEFAULT_MODELS[e.target.value as LLMProvider],
                      }))}
                      fullWidth
                    />

                    <Input
                      label={t('settings.apiKey')}
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder={editingProviderId ? 
                        t('settings.apiKeyPlaceholderEdit', 'Leave empty to keep existing API key') : 
                        t('settings.apiKeyPlaceholder')}
                      error={formErrors.apiKey}
                      helperText={editingProviderId ? 
                        t('settings.apiKeyHelperEdit', 'Enter a new API key to update, or leave empty to keep the current one') : 
                        undefined}
                      fullWidth
                      required={!editingProviderId}
                    />
                  </div>

                  <Input
                    label={t('settings.baseUrl')}
                    type="url"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder={t('settings.baseUrlPlaceholder')}
                    error={formErrors.baseUrl}
                    helperText={`Default: ${DEFAULT_BASE_URLS[formData.name]}`}
                    fullWidth
                  />

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="provider-enabled"
                      checked={formData.enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="provider-enabled" className="text-sm text-gray-700 dark:text-gray-300">
                      {t('settings.serverEnabled')}
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={handleCancelForm}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSaveProvider}>
                      {editingProviderId ? t('common.save') : t('settings.addProvider', 'Add Provider')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Providers List */}
          <div className="space-y-4">
            {llmProviders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>{t('settings.noProvidersConfigured', 'No LLM providers configured yet.')}</p>
                <p className="text-sm mt-1">
                  {t('settings.addProviderToStart', 'Add a provider to start using the chat interface.')}
                </p>
              </div>
            ) : (
              llmProviders.map((provider) => (
                <Card key={provider.id} variant="outlined" className="hover:shadow-sm transition-shadow">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              provider.enabled ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {t(`providers.${provider.name}`)}
                            </h3>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                            {provider.models.length} {t('settings.model', { count: provider.models.length })}
                          </span>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium min-w-0 flex-shrink-0">API Key:</span>
                            {(() => {
                              const keyStatus = getApiKeyStatus(provider.apiKey);
                              return keyStatus.configured ? (
                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                                  {keyStatus.masked ? '••••' : 'Configured'}
                                </code>
                              ) : (
                                <span className="text-xs text-gray-500">
                                  {t('settings.notConfigured', 'Not configured')}
                                </span>
                              );
                            })()}
                          </div>
                          {provider.baseUrl && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium min-w-0 flex-shrink-0">Base URL:</span>
                              <code className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20 px-1 rounded">
                                {truncateUrl(provider.baseUrl, 35)}
                              </code>
                            </div>
                          )}
                          
                          {/* Connection Test Result */}
                          {connectionResults[provider.id] && (
                            <div className={`mt-2 flex items-center space-x-2 text-xs ${
                              connectionResults[provider.id].success 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {connectionResults[provider.id].success ? (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>{t('settings.connectionSuccessful')}</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                  <span>
                                    {t('settings.connectionFailed')}
                                    {connectionResults[provider.id].error && (
                                      <span className="ml-1">: {connectionResults[provider.id].error}</span>
                                    )}
                                  </span>
                                </>
                              )}
                              <span className="text-gray-400">
                                ({new Date(connectionResults[provider.id].timestamp).toLocaleTimeString()})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Model List with Tool Support Indicators */}
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('settings.availableModels', 'Available Models')}:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {provider.models.map((model) => (
                              <span
                                key={model.id}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  model.supportsToolCalling
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}
                              >
                                {model.name}
                                {model.supportsToolCalling && (
                                  <svg
                                    className="ml-1 w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    aria-label={t('settings.modelSupportsTools')}
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(provider.id)}
                          loading={testingConnections.has(provider.id)}
                          disabled={!provider.enabled}
                        >
                          {t('settings.testConnection')}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLLMProvider(provider.id)}
                        >
                          {provider.enabled ? t('settings.disable', 'Disable') : t('settings.enable', 'Enable')}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProvider(provider)}
                          disabled={isAddingProvider || editingProviderId !== null}
                        >
                          {t('common.edit')}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLLMProvider(provider.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LLMProviderConfig;