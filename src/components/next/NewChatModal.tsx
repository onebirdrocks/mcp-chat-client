'use client';

import React, { useState, useEffect } from 'react';
import { Button, Modal, Select } from '../ui';
import { settingsApi } from '../../services/apiClient';
import type { LLMProviderConfig, ModelInfo } from '../../../lib/types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (provider: string, model: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChat,
}) => {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [providers, setProviders] = useState<LLMProviderConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load providers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);
  
  const loadProviders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const settings = await settingsApi.getSettings();
      // Only show enabled providers that have API keys configured
      const enabledProviders = settings.llmProviders.filter(p => p.enabled && p.apiKey);
      setProviders(enabledProviders);
      
      if (enabledProviders.length === 0) {
        setError('No LLM providers are configured. Please configure providers in settings.');
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
      setError('Failed to load provider configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateChat = () => {
    if (selectedProvider && selectedModel) {
      onCreateChat(selectedProvider, selectedModel);
      handleClose();
    }
  };
  
  const handleClose = () => {
    setSelectedProvider('');
    setSelectedModel('');
    setError(null);
    onClose();
  };
  
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProvider(e.target.value);
    setSelectedModel(''); // Reset model when provider changes
  };
  
  // Get provider options for select
  const providerOptions = providers.map(provider => ({
    value: provider.name,
    label: getProviderDisplayName(provider.name),
  }));
  
  // Get model options for selected provider
  const selectedProviderConfig = providers.find(p => p.name === selectedProvider);
  const modelOptions = selectedProviderConfig?.models.map(model => ({
    value: model.id,
    label: `${model.displayName}${model.supportsToolCalling ? ' (Tool Calling)' : ''}`,
  })) || [];
  
  function getProviderDisplayName(provider: string): string {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'deepseek':
        return 'DeepSeek';
      case 'openrouter':
        return 'OpenRouter';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  }
  
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case 'deepseek':
        return <div className="w-3 h-3 bg-blue-500 rounded-full" />;
      case 'openrouter':
        return <div className="w-3 h-3 bg-purple-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full" />;
    }
  };
  
  const selectedModelInfo = selectedProviderConfig?.models.find(m => m.id === selectedModel);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Start New Conversation"
      size="md"
    >
      <div className="space-y-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Select an LLM provider and model to start a new conversation. Only configured providers with valid API keys are shown.
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
              Loading providers...
            </span>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Configuration Error
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Select
              label="LLM Provider"
              options={providerOptions}
              value={selectedProvider}
              onChange={handleProviderChange}
              placeholder="Select a provider"
              fullWidth
            />
            
            {selectedProvider && (
              <Select
                label="Model"
                options={modelOptions}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                placeholder="Select a model"
                fullWidth
              />
            )}
            
            {selectedProvider && selectedModel && selectedModelInfo && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  {getProviderIcon(selectedProvider)}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Selected Configuration
                    </h4>
                    <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <div>
                        <span className="font-medium">Provider:</span> {getProviderDisplayName(selectedProvider)}
                      </div>
                      <div>
                        <span className="font-medium">Model:</span> {selectedModelInfo.displayName}
                      </div>
                      {selectedModelInfo.maxTokens && (
                        <div>
                          <span className="font-medium">Max Tokens:</span> {selectedModelInfo.maxTokens.toLocaleString()}
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Tool Calling:</span>
                        {selectedModelInfo.supportsToolCalling ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            ✓ Supported
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                            Not supported
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Button area */}
      <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCreateChat}
          disabled={!selectedProvider || !selectedModel || loading}
        >
          Create Chat
        </Button>
      </div>
    </Modal>
  );
};

export default NewChatModal;