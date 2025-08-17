'use client';

import { useState, useEffect } from 'react';
import { Settings, Star, CheckCircle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface DefaultModelConfig {
  enabled: boolean;
  providerId: string;
  modelId: string;
  modelName: string;
  lastUpdated: string;
}

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

interface DefaultModelSelectorProps {
  modelGroups: ModelGroup[];
}

export default function DefaultModelSelector({ modelGroups }: DefaultModelSelectorProps) {
  const { isDarkMode } = useTheme();
  const [config, setConfig] = useState<DefaultModelConfig>({
    enabled: false,
    providerId: '',
    modelId: '',
    modelName: '',
    lastUpdated: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    loadDefaultModelConfig();
  }, []);

  const loadDefaultModelConfig = async () => {
    try {
      const response = await fetch('/api/llm/default-model');
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        setSelectedProvider(data.config.providerId);
        setSelectedModel(data.config.modelId);
      }
    } catch (error) {
      console.error('Failed to load default model config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDefaultModelConfig = async (newConfig: Partial<DefaultModelConfig>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/llm/default-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        setShowSelector(false);
        return true;
      } else {
        alert(data.error || 'Failed to save default model');
        return false;
      }
    } catch (error) {
      console.error('Failed to save default model config:', error);
      alert('Failed to save default model');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled && (!selectedProvider || !selectedModel)) {
      setShowSelector(true);
      return;
    }

    const newConfig = {
      enabled,
      providerId: enabled ? selectedProvider : '',
      modelId: enabled ? selectedModel : '',
      modelName: enabled ? modelGroups
        .find(g => g.providerId === selectedProvider)
        ?.models.find(m => m.id === selectedModel)?.name || ''
        : ''
    };

    await saveDefaultModelConfig(newConfig);
  };

  const handleModelSelect = async () => {
    if (!selectedProvider || !selectedModel) {
      alert('Please select both provider and model');
      return;
    }

    const selectedModelData = modelGroups
      .find(g => g.providerId === selectedProvider)
      ?.models.find(m => m.id === selectedModel);

    if (!selectedModelData) {
      alert('Selected model not found');
      return;
    }

    const newConfig = {
      enabled: true,
      providerId: selectedProvider,
      modelId: selectedModel,
      modelName: selectedModelData.name
    };

    await saveDefaultModelConfig(newConfig);
  };

  const clearDefaultModel = async () => {
    try {
      const response = await fetch('/api/llm/default-model', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        setSelectedProvider('');
        setSelectedModel('');
        setShowSelector(false);
      }
    } catch (error) {
      console.error('Failed to clear default model:', error);
      alert('Failed to clear default model');
    }
  };

  if (loading) {
    return (
      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="animate-pulse flex items-center space-x-4">
          <div className={`h-4 bg-gray-300 rounded w-1/4 ${isDarkMode ? 'bg-gray-600' : ''}`}></div>
          <div className={`h-4 bg-gray-300 rounded w-1/6 ${isDarkMode ? 'bg-gray-600' : ''}`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Settings className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Default Model
          </h3>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
            config.enabled 
              ? 'bg-blue-600' 
              : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
          }`}></div>
        </label>
      </div>

      {config.enabled && (
        <div className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'} border ${isDarkMode ? 'border-gray-600' : 'border-blue-200'}`}>
          <div className="flex items-center space-x-2 mb-2">
            <Star className={`w-4 h-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
              Current Default Model
            </span>
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-blue-800'}`}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{config.modelName}</span>
              <span className={`px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-blue-100 text-blue-700'}`}>
                {config.providerId}
              </span>
            </div>
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-blue-600'}`}>
              Set on {new Date(config.lastUpdated).toLocaleString()}
            </div>
          </div>
          <button
            onClick={clearDefaultModel}
            className={`mt-2 text-xs px-2 py-1 rounded transition-colors ${
              isDarkMode 
                ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                : 'text-red-600 hover:text-red-700 hover:bg-red-50'
            }`}
          >
            Clear Default
          </button>
        </div>
      )}

      {showSelector && (
        <div className={`mt-4 p-4 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Select Default Model
          </h4>
          
          <div className="space-y-3">
            {/* Provider Selection */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setSelectedModel('');
                }}
                className={`w-full px-3 py-2 rounded-md border text-sm ${
                  isDarkMode 
                    ? 'bg-gray-600 border-gray-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Select a provider</option>
                {modelGroups.map(group => (
                  <option key={group.providerId} value={group.providerId}>
                    {group.providerName}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            {selectedProvider && (
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border text-sm ${
                    isDarkMode 
                      ? 'bg-gray-600 border-gray-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Select a model</option>
                  {modelGroups
                    .find(g => g.providerId === selectedProvider)
                    ?.models.filter(m => m.isEnabled)
                    .map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleModelSelect}
                disabled={!selectedProvider || !selectedModel || saving}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedProvider && selectedModel && !saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : `${isDarkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                }`}
              >
                {saving ? 'Saving...' : 'Set as Default'}
              </button>
              <button
                onClick={() => setShowSelector(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!config.enabled && !showSelector && (
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No default model set. Enable the switch above to select a default model for new chats.
        </div>
      )}
    </div>
  );
}
