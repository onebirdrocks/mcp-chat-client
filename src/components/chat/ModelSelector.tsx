'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check, Zap, Palette, Code } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Model {
  id: string;
  name: string;
  description: string;
  providerId: string;
  capabilities?: {
    isInferenceModel?: boolean;
    supportsMultimodal?: boolean;
    supportsTools?: boolean;
    supportsFunctionCalling?: boolean;
    maxTokens?: number;
    contextLength?: number;
    visionCapabilities?: string[];
    toolTypes?: string[];
  };
}

interface ModelGroup {
  providerId: string;
  providerName: string;
  models: Model[];
}

interface ModelSelectorProps {
  onModelSelect: (providerId: string, modelId: string, modelName: string) => void;
  selectedProviderId?: string;
  selectedModelId?: string;
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

export default function ModelSelector({ onModelSelect, selectedProviderId, selectedModelId }: ModelSelectorProps) {
  const { isDarkMode } = useTheme();
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await fetch('/api/llm/models');
      if (response.ok) {
        const data = await response.json();
        setModelGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = modelGroups.filter(group => {
    if (!searchTerm) return true;
    
    const groupMatches = group.providerName.toLowerCase().includes(searchTerm.toLowerCase());
    const modelMatches = group.models.some(model => 
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return groupMatches || modelMatches;
  });

  const handleProviderToggle = (providerId: string) => {
    setExpandedProvider(expandedProvider === providerId ? null : providerId);
  };

  const handleModelSelect = (providerId: string, modelId: string, modelName: string) => {
    onModelSelect(providerId, modelId, modelName);
    setExpandedProvider(null);
  };

  const getCapabilityIcons = (capabilities?: Model['capabilities']) => {
    if (!capabilities) return null;

    const icons = [];
    if (capabilities.supportsMultimodal) {
      icons.push(<Palette key="multimodal" className="w-4 h-4 text-purple-500" />);
    }
    if (capabilities.supportsTools) {
      icons.push(<Code key="tools" className="w-4 h-4 text-green-500" />);
    }
    if (capabilities.isInferenceModel) {
      icons.push(<Zap key="inference" className="w-4 h-4 text-blue-500" />);
    }
    return icons;
  };

  if (loading) {
    return (
      <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        选择模型
      </h3>
      
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索模型或提供商..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg bg-transparent ${
            isDarkMode ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'
          }`}
        />
      </div>

      {/* Model Groups */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {searchTerm ? '没有找到匹配的模型' : '没有可用的模型'}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.providerId} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => handleProviderToggle(group.providerId)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{PROVIDER_ICONS[group.providerId] || '🤖'}</span>
                  <span className="font-medium">{group.providerName}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {group.models.length} 个模型
                  </span>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 transition-transform ${
                    expandedProvider === group.providerId ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              
              {expandedProvider === group.providerId && (
                <div className={`border-t ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                  {group.models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(group.providerId, model.id, model.name)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700 text-white' : 'text-gray-900'
                      } ${
                        selectedProviderId === group.providerId && selectedModelId === model.id
                          ? isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{model.name}</span>
                            {getCapabilityIcons(model.capabilities) && (
                              <div className="flex items-center gap-1">
                                {getCapabilityIcons(model.capabilities)}
                              </div>
                            )}
                          </div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {model.description}
                          </p>
                        </div>
                        {selectedProviderId === group.providerId && selectedModelId === model.id && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
