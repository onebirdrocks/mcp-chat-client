'use client';

import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { DEFAULT_MODEL_PARAMS } from '@/lib/types';

interface Model {
  id: string;
  name: string;
  description: string;
  providerId: string;
  isCustom: boolean;
  isEnabled: boolean;
  createdAt: string;
  source: 'preset' | 'api' | 'custom';
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

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatData: {
    id: string;
    providerId: string;
    modelId: string;
    modelName: string;
    providerName: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  }) => void;
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  mistral: 'Mistral',
  cohere: 'Cohere',
  perplexity: 'Perplexity',
  fireworks: 'Fireworks',
  groq: 'Groq',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  huggingface: 'Hugging Face',
  ollama: 'Ollama',
  together: 'Together AI',
  zhipu: 'Zhipu AI',
  moonshot: 'Moonshot',
};

export default function CreateChatModal({ isOpen, onClose, onChatCreated }: CreateChatModalProps) {
  const { isDarkMode } = useTheme();
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedModelName, setSelectedModelName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  // ESC键关闭模态框
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/llm/models');
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        console.log('Groups:', data.groups);
        setModelGroups(data.groups || []);
      } else {
        console.error('API response not ok:', response.status);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderToggle = (providerId: string) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId);
    } else {
      newExpanded.add(providerId);
    }
    setExpandedProviders(newExpanded);
  };

  const handleModelSelect = (providerId: string, modelId: string, modelName: string) => {
    setSelectedProviderId(providerId);
    setSelectedModelId(modelId);
    setSelectedModelName(modelName);
  };

  const handleCreateChat = async () => {
    if (!selectedProviderId || !selectedModelId) {
      return;
    }
    setCreating(true);
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: selectedProviderId,
          modelId: selectedModelId,
          modelName: selectedModelName,
          providerName: PROVIDER_NAMES[selectedProviderId] || selectedProviderId,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        onChatCreated({
          id: data.chat.id,
          providerId: selectedProviderId,
          modelId: selectedModelId,
          modelName: selectedModelName,
          providerName: PROVIDER_NAMES[selectedProviderId] || selectedProviderId,
          systemPrompt: DEFAULT_MODEL_PARAMS.systemPrompt,
          temperature: DEFAULT_MODEL_PARAMS.temperature,
          maxTokens: DEFAULT_MODEL_PARAMS.maxTokens,
          topP: DEFAULT_MODEL_PARAMS.topP,
          frequencyPenalty: DEFAULT_MODEL_PARAMS.frequencyPenalty,
          presencePenalty: DEFAULT_MODEL_PARAMS.presencePenalty,
        });
        onClose();
      } else {
        console.error('Failed to create chat');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredModelGroups = modelGroups.filter(group => 
    group.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.models.some(model => 
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // 自动展开包含匹配模型的provider
  useEffect(() => {
    if (searchTerm.trim()) {
      const matchingProviders = new Set<string>();
      modelGroups.forEach(group => {
        const hasMatchingModel = group.models.some(model => 
          model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          model.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (hasMatchingModel || group.providerName.toLowerCase().includes(searchTerm.toLowerCase())) {
          matchingProviders.add(group.providerId);
        }
      });
      setExpandedProviders(matchingProviders);
    } else {
      // 清空搜索时，收起所有provider
      setExpandedProviders(new Set());
    }
  }, [searchTerm, modelGroups]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-2xl max-h-[80vh] rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-xl font-semibold">创建新聊天</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="搜索模型或提供商..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>



              {/* Model Groups */}
              <div className="space-y-4">
                {filteredModelGroups.map((group) => (
                  <div key={group.providerId} className={`border rounded-lg ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <button
                      onClick={() => handleProviderToggle(group.providerId)}
                      className={`w-full px-4 py-3 flex items-center justify-between text-left ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{group.providerName}</span>
                      <span className={`transform transition-transform ${
                        expandedProviders.has(group.providerId) ? 'rotate-180' : ''
                      }`}>
                        ▼
                      </span>
                    </button>
                    
                    {expandedProviders.has(group.providerId) && (
                      <div className={`border-t ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        {group.models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleModelSelect(group.providerId, model.id, model.name)}
                            className={`w-full px-4 py-3 text-left border-b last:border-b-0 ${
                              isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                            } ${
                              selectedProviderId === group.providerId && selectedModelId === model.id
                                ? isDarkMode ? 'bg-blue-600' : 'bg-blue-50'
                                : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{model.name}</div>
                                <div className={`text-sm ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {model.description}
                                </div>
                              </div>
                              {model.capabilities && (
                                <div className="flex gap-1">
                                  {model.capabilities.supportsMultimodal && (
                                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                      多模态
                                    </span>
                                  )}
                                  {model.capabilities.supportsTools && (
                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                      工具
                                    </span>
                                  )}
                                  {model.id === 'deepseek-reasoner' && (
                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                      推理专家
                                    </span>
                                  )}
                                  {model.capabilities.isInferenceModel && model.id !== 'deepseek-reasoner' && (
                                    <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                      推理
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredModelGroups.length === 0 && !loading && (
                <div className={`text-center py-8 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  没有找到匹配的模型
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {selectedProviderId && selectedModelId ? (
              <>
                已选择: <span className="font-medium">{PROVIDER_NAMES[selectedProviderId] || selectedProviderId}</span> - <span className="font-medium">{selectedModelName}</span>
              </>
            ) : (
              '请选择一个模型'
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              取消
            </button>
            <button
              onClick={handleCreateChat}
              disabled={!selectedProviderId || !selectedModelId || creating}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                selectedProviderId && selectedModelId && !creating
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : isDarkMode
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  创建聊天
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
