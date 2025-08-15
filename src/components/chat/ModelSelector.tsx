'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check, Zap, Eye, Code } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface ModelCapabilities {
  isInferenceModel: boolean;
  supportsMultimodal: boolean;
  supportsTools: boolean;
  supportsFunctionCalling: boolean;
  maxTokens: number;
  contextLength: number;
  visionCapabilities: string[];
  toolTypes: string[];
}

interface Model {
  id: string;
  name: string;
  description: string;
  capabilities: ModelCapabilities;
}

interface ModelSelectorProps {
  selectedProvider: string;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export default function ModelSelector({
  selectedProvider,
  selectedModel,
  onModelChange,
  className = ''
}: ModelSelectorProps) {
  const { isDarkMode } = useTheme();
  const [models, setModels] = useState<Model[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      if (!selectedProvider) {
        setModels([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/llm/models?provider=${selectedProvider}`);
        if (response.ok) {
          const data = await response.json();
          setModels(data.models || []);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [selectedProvider]);

  const selectedModelData = models.find(m => m.id === selectedModel);

  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'function_calling':
        return <Code className="w-3 h-3" />;
      case 'code_interpreter':
        return <Zap className="w-3 h-3" />;
      case 'retrieval':
        return <Eye className="w-3 h-3" />;
      default:
        return null;
    }
  };

  if (!selectedProvider) {
    return (
      <div className={`px-3 py-2 text-sm text-gray-500 ${className}`}>
        请先选择LLM Provider
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`px-3 py-2 text-sm text-gray-500 ${className}`}>
        加载中...
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg transition-colors ${
          isDarkMode
            ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          {selectedModelData ? (
            <>
              <span className="font-medium">{selectedModelData.name}</span>
              {selectedModelData.capabilities.supportsTools && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  支持工具
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">选择模型</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1 z-50 border rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
        }`}>
          <div className="max-h-60 overflow-y-auto">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start justify-between px-3 py-2 text-sm transition-colors ${
                  selectedModel === model.id
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-900'
                    : isDarkMode
                      ? 'text-white hover:bg-gray-700'
                      : 'text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{model.name}</span>
                    {model.capabilities.supportsTools && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        支持工具
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {model.description}
                  </div>
                  {model.capabilities.supportsTools && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {model.capabilities.toolTypes.map((toolType) => (
                        <span
                          key={toolType}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {getCapabilityIcon(toolType)}
                          {toolType.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {selectedModel === model.id && (
                  <Check className="w-4 h-4 ml-2 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
