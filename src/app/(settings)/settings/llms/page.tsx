'use client';

import { useState, useEffect } from 'react';
import { Plus, TestTube, Edit, Trash2, Eye, EyeOff, Check, X, Loader2, Wifi, Zap } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface LLMProvider {
  id: string;
  name: string;
  displayName: string;
  description: string;
  apiKey: string;
  isEnabled: boolean;
  isTested: boolean;
  lastTested?: Date;
}

const LLM_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    description: 'GPT-4, GPT-3.5 Turbo, and other OpenAI models',
    icon: '🤖'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    displayName: 'Claude',
    description: 'Claude 3, Claude 2, and other Anthropic models',
    icon: '🧠'
  },
  {
    id: 'google',
    name: 'Google',
    displayName: 'Google AI',
    description: 'Gemini Pro, Gemini Flash, and other Google models',
    icon: '🔍'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    displayName: 'Mistral',
    description: 'Mistral 7B, Mixtral 8x7B, and other Mistral models',
    icon: '🌪️'
  },
  {
    id: 'cohere',
    name: 'Cohere',
    displayName: 'Cohere',
    description: 'Command, Command Light, and other Cohere models',
    icon: '💬'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    displayName: 'Hugging Face',
    description: 'Access to thousands of open-source models',
    icon: '🤗'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    displayName: 'Perplexity',
    description: 'Perplexity models for search and chat',
    icon: '🔎'
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    displayName: 'Fireworks',
    description: 'Fast and efficient AI models',
    icon: '🎆'
  },
  {
    id: 'groq',
    name: 'Groq',
    displayName: 'Groq',
    description: 'Ultra-fast LLM inference',
    icon: '⚡'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    displayName: 'Ollama',
    description: 'Local LLM models',
    icon: '🏠'
  },
  {
    id: 'together',
    name: 'Together AI',
    displayName: 'Together AI',
    description: 'Open source AI models',
    icon: '🤝'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    displayName: 'DeepSeek',
    description: 'DeepSeek AI models',
    icon: '🔍'
  },
  {
    id: 'zhipu',
    name: 'Zhipu AI',
    displayName: 'Zhipu AI',
    description: 'Chinese AI models',
    icon: '🇨🇳'
  },
  {
    id: 'moonshot',
    name: 'Moonshot',
    displayName: 'Moonshot',
    description: 'Moonshot AI models',
    icon: '🚀'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    displayName: 'OpenRouter',
    description: 'Access to 300+ models from various providers',
    icon: '🌐'
  }
];

export default function LLMPage() {
  const { isDarkMode } = useTheme();
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: { success: boolean; message: string } }>({});

  // Load providers from API on component mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch('/api/llm/providers');
        const data = await response.json();
        if (data.providers) {
          setProviders(data.providers);
        }
      } catch (error) {
        console.error('Failed to load providers:', error);
      }
    };
    
    loadProviders();
  }, []);

  const handleAddProvider = async () => {
    if (!selectedProvider || !apiKey.trim()) return;

    const provider = LLM_PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider) return;

    try {
      const response = await fetch('/api/llm/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: selectedProvider,
          apiKey: apiKey.trim(),
          isEnabled: true,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload providers from API
        const providersResponse = await fetch('/api/llm/providers');
        const data = await providersResponse.json();
        if (data.providers) {
          setProviders(data.providers);
        }
        
        setSelectedProvider('');
        setApiKey('');
        setShowAddForm(false);
      } else {
        console.error('Failed to add provider:', result.error);
      }
    } catch (error) {
      console.error('Failed to add provider:', error);
    }
  };

  const handleEditProvider = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setSelectedProvider(provider.id);
      setApiKey(provider.apiKey);
      setEditingProvider(providerId);
      setShowAddForm(true);
    }
  };

  const handleUpdateProvider = async () => {
    if (!editingProvider || !apiKey.trim()) return;

    try {
      const response = await fetch('/api/llm/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: editingProvider,
          apiKey: apiKey.trim(),
          isEnabled: true,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload providers from API
        const providersResponse = await fetch('/api/llm/providers');
        const data = await providersResponse.json();
        if (data.providers) {
          setProviders(data.providers);
        }
        
        setSelectedProvider('');
        setApiKey('');
        setEditingProvider(null);
        setShowAddForm(false);
      } else {
        console.error('Failed to update provider:', result.error);
      }
    } catch (error) {
      console.error('Failed to update provider:', error);
    }
  };

  const handleRemoveProvider = async (providerId: string) => {
    try {
      const response = await fetch(`/api/llm/providers?providerId=${providerId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload providers from API
        const providersResponse = await fetch('/api/llm/providers');
        const data = await providersResponse.json();
        if (data.providers) {
          setProviders(data.providers);
        }
      } else {
        console.error('Failed to remove provider:', result.error);
      }
    } catch (error) {
      console.error('Failed to remove provider:', error);
    }
  };

  const handleToggleProvider = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    try {
      const response = await fetch('/api/llm/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: providerId,
          isEnabled: !provider.isEnabled,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload providers from API
        const providersResponse = await fetch('/api/llm/providers');
        const data = await providersResponse.json();
        if (data.providers) {
          setProviders(data.providers);
        }
      } else {
        console.error('Failed to toggle provider:', result.error);
      }
    } catch (error) {
      console.error('Failed to toggle provider:', error);
    }
  };

  const testConnection = async (provider: LLMProvider) => {
    setTestingProvider(provider.id);
    setTestResult(prev => ({ ...prev, [provider.id]: { success: false, message: 'Testing...' } }));

    try {
      // Make real API call to test connection
      const response = await fetch('/api/llm/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider.id,
          apiKey: provider.apiKey,
        }),
      });

      const result = await response.json();
      
      setTestResult(prev => ({
        ...prev,
        [provider.id]: {
          success: result.success,
          message: result.message
        }
      }));

      if (result.success) {
        // Update the provider's test status in the local state
        setProviders(prev => prev.map(p => 
          p.id === provider.id 
            ? { ...p, isTested: true, lastTested: new Date() }
            : p
        ));
      }
    } catch (error) {
      setTestResult(prev => ({
        ...prev,
        [provider.id]: {
          success: false,
          message: 'Connection failed. Please check your API key and network connection.'
        }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const getAvailableProviders = () => {
    const usedProviderIds = providers.map(p => p.id);
    return LLM_PROVIDERS.filter(p => !usedProviderIds.includes(p.id));
  };

  return (
    <div className="max-w-4xl">
      
      {/* Add Provider Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>LLM Providers</h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Provider
            </button>
          )}
        </div>

        {showAddForm && (
          <div className={`p-6 rounded-lg border ${
            isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
          }`}>
            <h3 className={`text-md font-medium mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {editingProvider ? 'Edit Provider' : 'Add New Provider'}
            </h3>
            
            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  disabled={!!editingProvider}
                  className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
                    isDarkMode 
                      ? 'border-gray-600 text-white' 
                      : 'border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Select a provider</option>
                  {(editingProvider ? LLM_PROVIDERS : getAvailableProviders()).map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.icon} {provider.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key Input */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className={`w-full px-3 py-2 pr-10 border rounded-lg bg-transparent ${
                      isDarkMode 
                        ? 'border-gray-600 text-white placeholder-gray-400' 
                        : 'border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 ${
                      isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={editingProvider ? handleUpdateProvider : handleAddProvider}
                  disabled={!selectedProvider || !apiKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingProvider ? 'Update Provider' : 'Add Provider'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedProvider('');
                    setApiKey('');
                    setEditingProvider(null);
                  }}
                  className={`px-4 py-2 border rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Providers List */}
      <div className="space-y-4">
        {providers.length === 0 ? (
          <div className={`text-center py-8 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <p>No LLM providers configured yet.</p>
            <p className="text-sm mt-1">Add your first provider to get started.</p>
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className={`p-4 rounded-lg border ${
                isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className={`flex items-center justify-between ${!provider.isEnabled ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {LLM_PROVIDERS.find(p => p.id === provider.id)?.icon}
                  </div>
                  <div>
                    <h3 className={`font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {provider.displayName}
                      {!provider.isEnabled && (
                        <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          Disabled
                        </span>
                      )}
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {provider.description}
                    </p>
                    {provider.lastTested && (
                                          <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Last tested: {provider.lastTested.toLocaleDateString()}
                    </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Indicator */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    provider.isEnabled
                      ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')
                      : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      provider.isEnabled ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                    {provider.isEnabled ? 'Enabled' : 'Disabled'}
                  </div>

                  {/* Test Status */}
                  {provider.isTested && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      testResult[provider.id]?.success
                        ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')
                        : (isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700')
                    }`}>
                      {testResult[provider.id]?.success ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      {testResult[provider.id]?.success ? 'Connected' : 'Failed'}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {/* Test Connection */}
                    <button
                      onClick={() => testConnection(provider)}
                      disabled={testingProvider === provider.id || !provider.isEnabled}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                      } ${!provider.isEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={!provider.isEnabled ? 'Enable provider to test connection' : 'Test Connection'}
                    >
                      {testingProvider === provider.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <div className="relative group">
                          <Wifi className="w-4 h-4 group-hover:text-blue-500 transition-colors" />
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEditProvider(provider.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                      }`}
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Toggle Enable/Disable */}
                    <button
                      onClick={() => handleToggleProvider(provider.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                      }`}
                      title={provider.isEnabled ? 'Disable' : 'Enable'}
                    >
                      {provider.isEnabled ? (
                        <div className="w-4 h-4 border-2 border-gray-400 rounded"></div>
                      ) : (
                        <div className="w-4 h-4 bg-blue-600 rounded"></div>
                      )}
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemoveProvider(provider.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-red-900' : 'hover:bg-red-100'
                      }`}
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Result Message */}
              {testResult[provider.id] && (
                <div className={`mt-3 p-2 rounded text-sm ${
                  testResult[provider.id].success
                    ? (isDarkMode ? 'bg-green-900/20 text-green-300' : 'bg-green-100 text-green-700')
                    : (isDarkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-100 text-red-700')
                }`}>
                  {testResult[provider.id].message}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
