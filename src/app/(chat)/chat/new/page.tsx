'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Settings, Loader2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import ModelSelector from '@/components/chat/ModelSelector';
import Link from 'next/link';

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

function getProviderDisplayName(providerId: string): string {
  return PROVIDER_NAMES[providerId] || providerId;
}

interface DefaultModelConfig {
  enabled: boolean;
  providerId: string;
  modelId: string;
  modelName: string;
  lastUpdated: string;
}

export default function NewChatPage() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [defaultModel, setDefaultModel] = useState<DefaultModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedModelName, setSelectedModelName] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDefaultModel();
  }, []);

  const loadDefaultModel = async () => {
    try {
      const response = await fetch('/api/llm/default-model');
      if (response.ok) {
        const data = await response.json();
        setDefaultModel(data);
        
        // If default model is enabled, auto-select it
        if (data.enabled && data.providerId && data.modelId) {
          setSelectedProviderId(data.providerId);
          setSelectedModelId(data.modelId);
          setSelectedModelName(data.modelName);
        }
      }
    } catch (error) {
      console.error('Failed to load default model:', error);
    } finally {
      setLoading(false);
    }
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: selectedProviderId,
          modelId: selectedModelId,
          modelName: selectedModelName,
          providerName: getProviderDisplayName(selectedProviderId),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/chat/${data.chat.id}`);
      } else {
        console.error('Failed to create chat');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/chats"
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">新建聊天</h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              选择一个模型开始对话
            </p>
          </div>
        </div>

        {/* Default Model Info */}
        {defaultModel?.enabled && (
          <div className={`mb-6 p-4 rounded-lg border ${
            isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-600">默认模型已设置</span>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              将使用默认模型 <strong>{defaultModel.modelName}</strong> 创建聊天
            </p>
            <Link
              href="/settings/models"
              className={`inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2`}
            >
              更改默认模型
            </Link>
          </div>
        )}

        {/* Model Selection */}
        <div className="mb-8">
          {defaultModel?.enabled ? (
            <div className={`p-6 rounded-lg border text-center ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-semibold mb-2">使用默认模型</h3>
              <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {defaultModel.modelName}
              </p>
              <button
                onClick={handleCreateChat}
                disabled={creating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    创建中...
                  </>
                ) : (
                  '开始聊天'
                )}
              </button>
            </div>
          ) : (
            <ModelSelector
              onModelSelect={handleModelSelect}
              selectedProviderId={selectedProviderId}
              selectedModelId={selectedModelId}
            />
          )}
        </div>

        {/* Create Button (when no default model) */}
        {!defaultModel?.enabled && (
          <div className="flex justify-center">
            <button
              onClick={handleCreateChat}
              disabled={!selectedProviderId || !selectedModelId || creating}
              className={`px-8 py-3 rounded-lg transition-colors ${
                selectedProviderId && selectedModelId
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  创建中...
                </>
              ) : (
                '开始聊天'
              )}
            </button>
          </div>
        )}

        {/* Selected Model Info */}
        {selectedProviderId && selectedModelId && !defaultModel?.enabled && (
          <div className={`mt-6 p-4 rounded-lg border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h4 className="font-medium mb-2">已选择的模型</h4>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedModelName}
            </p>
          </div>
        )}

        {/* Settings Link */}
        <div className="mt-8 text-center">
          <Link
            href="/settings/models"
            className={`inline-flex items-center gap-2 text-sm ${
              isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            管理模型和默认设置
          </Link>
        </div>
      </div>
    </div>
  );
}
