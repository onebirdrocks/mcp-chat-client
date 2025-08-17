'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface LLMProvider {
  id: string;
  name: string;
  description?: string;
  hasApiKey: boolean;
}

interface LLMProviderSelectorProps {
  selectedProvider: string;
  onProviderChange: (providerId: string) => void;
  className?: string;
}

export default function LLMProviderSelector({
  selectedProvider,
  onProviderChange,
  className = ''
}: LLMProviderSelectorProps) {
  const { isDarkMode } = useTheme();
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch('/api/llm/providers');
        if (response.ok) {
          const data = await response.json();
          setProviders(data.providers || []);
        }
      } catch (error) {
        console.error('Failed to load LLM providers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProviders();
  }, []);

  const selectedProviderData = providers.find(p => p.id === selectedProvider);

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
          {selectedProviderData ? (
            <>
              <span className="font-medium">{selectedProviderData.name}</span>
              {selectedProviderData.hasApiKey && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  已配置
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">选择LLM Provider</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1 z-50 border rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
        }`}>
          <div className="max-h-60 overflow-y-auto">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  onProviderChange(provider.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  selectedProvider === provider.id
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-900'
                    : isDarkMode
                      ? 'text-white hover:bg-gray-700'
                      : 'text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{provider.name}</span>
                  {provider.hasApiKey && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      已配置
                    </span>
                  )}
                </div>
                {selectedProvider === provider.id && (
                  <Check className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
