'use client';

import { useState, useEffect } from 'react';
import { Plus, TestTube, Edit, Trash2, Eye, EyeOff, Loader2, Zap, AlertTriangle, Info, Settings } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import ValidationMessage from '@/components/ui/ValidationMessage';
import DefaultModelSelector from '@/components/ui/DefaultModelSelector';
import Link from 'next/link';

interface Model {
  id: string;
  name: string;
  description: string;
  providerId: string;
  isCustom: boolean;
  isEnabled: boolean;
  createdAt?: string;
  source: 'preset' | 'api' | 'custom';
}

interface ModelGroup {
  providerId: string;
  providerName: string;
  models: Model[];
  presetCount: number;
  apiCount: number;
  customCount: number;
  totalCount: number;
}

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

const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠',
  google: '🔍',
  mistral: '🌪️',
  cohere: '💬',
  perplexity: '🔎',
  fireworks: '🎆',
  groq: '⚡',
  deepseek: '🔍',
  openrouter: '🌐',
  huggingface: '🤗',
  ollama: '🏠',
  together: '🤝',
  zhipu: '🇨🇳',
  moonshot: '🚀',
};

export default function ModelsPage() {
  const { isDarkMode } = useTheme();
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: any }>({});
  
  // Form state
  const [formData, setFormData] = useState({
    modelId: '',
    name: '',
    description: ''
  });

  // Submit state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load models
      const modelsResponse = await fetch('/api/llm/models');
      const modelsData = await modelsResponse.json();
      if (modelsData.groups) {
        setModelGroups(modelsData.groups);
      }

      // Load providers
      const providersResponse = await fetch('/api/llm/providers');
      const providersData = await providersResponse.json();
      if (providersData.providers) {
        setProviders(providersData.providers);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfiguredProviders = () => {
    return providers.filter(p => p.apiKey && p.apiKey.trim() !== '');
  };



  const addCustomModel = async (modelData?: any) => {
    const data = modelData || {
      providerId: selectedProvider,
      ...formData
    };

    if (!data.providerId || !data.modelId || !data.name) {
      alert('Provider, Model ID, and Name are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: data.providerId,
          modelId: data.modelId,
          name: data.name,
          description: data.description || '',
          source: data.source || 'custom'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadData();
        setShowAddForm(false);
        setFormData({ modelId: '', name: '', description: '' });
        
        if (result.warnings && result.warnings.length > 0) {
          alert(`Model added successfully!\n\nWarnings:\n${result.warnings.join('\n')}`);
        } else {
          alert('Model added successfully!');
        }
      } else {
        if (result.validationErrors) {
          alert(`Validation failed:\n${result.validationErrors.join('\n')}`);
        } else {
          alert(result.error || 'Failed to add model');
        }
      }
    } catch (error) {
      console.error('Failed to add model:', error);
      alert('Failed to add model');
    } finally {
      setSubmitting(false);
    }
  };

  const testModel = async (providerId: string, modelId: string) => {
    const key = `${providerId}:${modelId}`;
    setTestingModel(key);
    
    try {
      const response = await fetch('/api/llm/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          modelId,
          testPrompt: 'Hello, this is a test message. Please respond with a brief greeting.'
        })
      });

      const result = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [key]: result.result
      }));

      if (result.success) {
        alert(`Model test successful!\nResponse: ${result.result.response}\nLatency: ${result.result.latency}ms`);
      } else {
        alert(`Model test failed: ${result.result.error}`);
      }
    } catch (error) {
      console.error('Failed to test model:', error);
      alert('Failed to test model');
    } finally {
      setTestingModel(null);
    }
  };

  const toggleModelEnabled = async (providerId: string, modelId: string, isEnabled: boolean) => {
    try {
      const response = await fetch('/api/llm/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          modelId,
          isEnabled: !isEnabled
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await loadData();
      } else {
        alert(result.error || 'Failed to update model');
      }
    } catch (error) {
      console.error('Failed to update model:', error);
      alert('Failed to update model');
    }
  };

  const deleteModel = async (providerId: string, modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) {
      return;
    }

    try {
      const response = await fetch(`/api/llm/models?provider=${providerId}&model=${modelId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        await loadData();
        alert('Model deleted successfully!');
      } else {
        alert(result.error || 'Failed to delete model');
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
      alert('Failed to delete model');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading models...</span>
      </div>
    );
  }

  const configuredProviders = getConfiguredProviders();

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Model Management</h1>
          <p className="text-gray-400">
            Manage and test your AI models across different providers
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Showing models for {configuredProviders.length} configured provider{configuredProviders.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Custom Model
          </button>
        </div>
      </div>

      {/* Default Model Selector */}
      <div className="mb-6">
        <DefaultModelSelector modelGroups={modelGroups} />
      </div>

      {/* No Providers Configured Warning */}
      {configuredProviders.length === 0 && (
        <div className={`mb-6 p-6 rounded-lg border ${
          isDarkMode ? 'border-yellow-600 bg-yellow-900/20' : 'border-yellow-300 bg-yellow-50'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <div>
              <h3 className={`font-semibold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                No LLM Providers Configured
              </h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                You need to configure at least one LLM provider with an API key to manage models.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/settings/llms"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configure LLM Providers
            </Link>
          </div>
        </div>
      )}

      {/* Add Model Form */}
      {showAddForm && configuredProviders.length > 0 && (
        <div className={`mb-6 p-6 rounded-lg border ${
          isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
        }`}>
          <h3 className="text-lg font-semibold mb-4">Add Custom Model</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Provider *
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
                  isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Select a provider</option>
                {configuredProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {PROVIDER_ICONS[provider.id]} {provider.displayName}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Model ID *
              </label>
              <input
                type="text"
                placeholder="e.g., gpt-4-custom"
                value={formData.modelId}
                onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
                  isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Display Name *
              </label>
              <input
                type="text"
                placeholder="e.g., GPT-4 Custom Model"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
                  isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                }`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description
              </label>
              <input
                type="text"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
                  isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => addCustomModel()}
              disabled={submitting || !selectedProvider || !formData.modelId || !formData.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Model'
              )}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ modelId: '', name: '', description: '' });
                setSelectedProvider('');
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Model Groups */}
      <div className="space-y-6">
        {modelGroups.map((group) => (
          <div
            key={group.providerId}
            className={`p-6 rounded-lg border ${
              isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{PROVIDER_ICONS[group.providerId]}</span>
                <div>
                  <h3 className="text-lg font-semibold">{group.providerName}</h3>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {group.totalCount} models ({group.presetCount} preset, {group.apiCount} API, {group.customCount} custom)
                  </p>
                </div>
              </div>
              

            </div>

            {/* Models List */}
            <div className="space-y-3">
              {group.models.map((model, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                  } ${!model.isEnabled ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{model.name}</h4>
                        {model.isCustom && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {model.source}
                          </span>
                        )}
                        {!model.isEnabled && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {model.description}
                      </p>
                      <code className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                        isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {model.id}
                      </code>
                      {model.createdAt && (
                        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                          Added: {new Date(model.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => testModel(group.providerId, model.id)}
                        disabled={testingModel === `${group.providerId}:${model.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        {testingModel === `${group.providerId}:${model.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <TestTube className="w-4 h-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => toggleModelEnabled(group.providerId, model.id, model.isEnabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          model.isEnabled
                            ? 'text-green-600 hover:bg-green-100'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {model.isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      
                      {model.isCustom && (
                        <button
                          onClick={() => deleteModel(group.providerId, model.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Test Results */}
                  {testResults[`${group.providerId}:${model.id}`] && (
                    <div className={`mt-3 p-3 rounded-lg ${
                      testResults[`${group.providerId}:${model.id}`].success
                        ? isDarkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                        : isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {testResults[`${group.providerId}:${model.id}`].success ? (
                          <Zap className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">
                          {testResults[`${group.providerId}:${model.id}`].success ? 'Test Successful' : 'Test Failed'}
                        </span>
                      </div>
                      {testResults[`${group.providerId}:${model.id}`].success ? (
                        <div className="text-sm">
                          <p><strong>Response:</strong> {testResults[`${group.providerId}:${model.id}`].response}</p>
                          <p><strong>Latency:</strong> {testResults[`${group.providerId}:${model.id}`].latency}ms</p>
                          {testResults[`${group.providerId}:${model.id}`].tokensUsed && (
                            <p><strong>Tokens Used:</strong> {testResults[`${group.providerId}:${model.id}`].tokensUsed}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">
                          {testResults[`${group.providerId}:${model.id}`].error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {group.models.length === 0 && (
                <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <p>No models found for {group.providerName}.</p>
                  <p className="text-sm mt-1">Add custom models to get started.</p>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {modelGroups.length === 0 && configuredProviders.length > 0 && (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>No models found.</p>
            <p className="text-sm mt-1">No models available for configured providers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
