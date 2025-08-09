'use client';

import { useState, useEffect } from 'react';
import { LLMProviderConfig as LLMProvider, ModelInfo } from '../../lib/types';

interface LLMProviderConfigProps {
  language?: 'en' | 'zh';
}

interface ProviderStatus {
  id: string;
  status: 'connected' | 'disconnected' | 'error' | 'testing' | 'disabled';
  error?: string;
  models?: ModelInfo[];
  lastTested?: string;
}

interface TestConnectionResult {
  success: boolean;
  error?: string;
  models?: Array<{
    id: string;
    name: string;
    supportsToolCalling: boolean;
  }>;
  latency?: number;
  timestamp: string;
}

export default function LLMProviderConfig({ language = 'en' }: LLMProviderConfigProps) {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState<Partial<LLMProvider>>({
    name: 'openai',
    enabled: true,
    models: []
  });

  // Localized text
  const text = language === 'zh' ? {
    title: 'LLM 提供商管理',
    addProvider: '添加提供商',
    providerName: '提供商名称',
    apiKey: 'API 密钥',
    baseUrl: '基础 URL',
    enabled: '启用',
    disabled: '禁用',
    connected: '已连接',
    disconnected: '未连接',
    error: '错误',
    testing: '测试中',
    testConnection: '测试连接',
    save: '保存',
    cancel: '取消',
    edit: '编辑',
    delete: '删除',
    enable: '启用',
    disable: '禁用',
    status: '状态',
    models: '模型',
    lastTested: '最后测试',
    noModels: '无可用模型',
    toolCalling: '支持工具调用',
    maxTokens: '最大令牌数',
    loading: '加载中...',
    saving: '保存中...',
    testingConnection: '测试连接中...',
    connectionSuccess: '连接成功',
    connectionFailed: '连接失败',
    providerAdded: '提供商已添加',
    providerUpdated: '提供商已更新',
    providerDeleted: '提供商已删除',
    confirmDelete: '确定要删除此提供商吗？',
    apiKeyPlaceholder: '输入 API 密钥',
    baseUrlPlaceholder: '可选，留空使用默认值',
    selectProvider: '选择提供商类型',
    openai: 'OpenAI',
    deepseek: 'DeepSeek',
    openrouter: 'OpenRouter',
    note: '注意：API 密钥将安全加密存储在服务器上，从不暴露给客户端。',
    maskedKey: '密钥已加密存储',
    enterNewKey: '输入新密钥以更新',
    keepExisting: '保持现有密钥'
  } : {
    title: 'LLM Provider Management',
    addProvider: 'Add Provider',
    providerName: 'Provider Name',
    apiKey: 'API Key',
    baseUrl: 'Base URL',
    enabled: 'Enabled',
    disabled: 'Disabled',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
    testing: 'Testing',
    testConnection: 'Test Connection',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    enable: 'Enable',
    disable: 'Disable',
    status: 'Status',
    models: 'Models',
    lastTested: 'Last Tested',
    noModels: 'No models available',
    toolCalling: 'Supports Tool Calling',
    maxTokens: 'Max Tokens',
    loading: 'Loading...',
    saving: 'Saving...',
    testingConnection: 'Testing connection...',
    connectionSuccess: 'Connection successful',
    connectionFailed: 'Connection failed',
    providerAdded: 'Provider added',
    providerUpdated: 'Provider updated',
    providerDeleted: 'Provider deleted',
    confirmDelete: 'Are you sure you want to delete this provider?',
    apiKeyPlaceholder: 'Enter API key',
    baseUrlPlaceholder: 'Optional, leave empty for default',
    selectProvider: 'Select provider type',
    openai: 'OpenAI',
    deepseek: 'DeepSeek',
    openrouter: 'OpenRouter',
    note: 'Note: API keys are securely encrypted and stored on the server, never exposed to the client.',
    maskedKey: 'Key is encrypted and stored',
    enterNewKey: 'Enter new key to update',
    keepExisting: 'Keep existing key'
  };

  // Load providers on component mount
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.data.llmProviders || []);
        
        // Initialize provider statuses
        const statuses: Record<string, ProviderStatus> = {};
        for (const provider of data.data.llmProviders || []) {
          statuses[provider.id] = {
            id: provider.id,
            status: provider.enabled ? 'disconnected' : 'disabled',
            models: provider.models || []
          };
        }
        setProviderStatuses(statuses);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    setProviderStatuses(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], status: 'testing' }
    }));

    try {
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.name,
          providerId: providerId
        })
      });

      const result: TestConnectionResult = await response.json();
      
      setProviderStatuses(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          status: result.success ? 'connected' : 'error',
          error: result.error,
          models: result.models?.map(m => ({
            id: m.id,
            name: m.name,
            displayName: m.name,
            supportsToolCalling: m.supportsToolCalling,
            maxTokens: 4096 // Default value
          })),
          lastTested: result.timestamp
        }
      }));

      // Update provider models if connection successful
      if (result.success && result.models) {
        const updatedProviders = providers.map(p => 
          p.id === providerId 
            ? { 
                ...p, 
                models: result.models!.map(m => ({
                  id: m.id,
                  name: m.name,
                  displayName: m.name,
                  supportsToolCalling: m.supportsToolCalling,
                  maxTokens: 4096
                }))
              }
            : p
        );
        setProviders(updatedProviders);
        
        // Save updated models to backend
        await saveProviders(updatedProviders);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setProviderStatuses(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          status: 'error',
          error: 'Connection test failed'
        }
      }));
    }
  };

  const saveProviders = async (updatedProviders: LLMProvider[]) => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmProviders: updatedProviders
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save providers');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save providers:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addProvider = async () => {
    if (!newProvider.name || !newProvider.apiKey) return;

    const provider: LLMProvider = {
      id: `${newProvider.name}-${Date.now()}`,
      name: newProvider.name,
      apiKey: newProvider.apiKey,
      baseUrl: newProvider.baseUrl || getDefaultBaseUrl(newProvider.name),
      models: [],
      enabled: newProvider.enabled ?? true
    };

    const updatedProviders = [...providers, provider];
    const success = await saveProviders(updatedProviders);
    
    if (success) {
      setProviders(updatedProviders);
      setProviderStatuses(prev => ({
        ...prev,
        [provider.id]: {
          id: provider.id,
          status: provider.enabled ? 'disconnected' : 'disabled',
          models: []
        }
      }));
      setShowAddForm(false);
      setNewProvider({ name: 'openai', enabled: true, models: [] });
      
      // Test connection for new provider
      if (provider.enabled) {
        setTimeout(() => testConnection(provider.id), 500);
      }
    }
  };

  const updateProvider = async (providerId: string, updates: Partial<LLMProvider>) => {
    const updatedProviders = providers.map(p => 
      p.id === providerId ? { ...p, ...updates } : p
    );
    
    const success = await saveProviders(updatedProviders);
    if (success) {
      setProviders(updatedProviders);
      setEditingProvider(null);
      
      // Update status if enabled state changed
      if ('enabled' in updates) {
        setProviderStatuses(prev => ({
          ...prev,
          [providerId]: {
            ...prev[providerId],
            status: updates.enabled ? 'disconnected' : 'disabled'
          }
        }));
      }
    }
  };

  const deleteProvider = async (providerId: string) => {
    if (!confirm(text.confirmDelete)) return;

    const updatedProviders = providers.filter(p => p.id !== providerId);
    const success = await saveProviders(updatedProviders);
    
    if (success) {
      setProviders(updatedProviders);
      setProviderStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[providerId];
        return newStatuses;
      });
    }
  };

  const toggleProvider = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    await updateProvider(providerId, { enabled: !provider.enabled });
  };

  const getDefaultBaseUrl = (providerName: string): string => {
    switch (providerName) {
      case 'openai': return 'https://api.openai.com/v1';
      case 'deepseek': return 'https://api.deepseek.com/v1';
      case 'openrouter': return 'https://openrouter.ai/api/v1';
      default: return '';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'testing': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      case 'disabled': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'connected': return text.connected;
      case 'testing': return text.testing;
      case 'error': return text.error;
      case 'disabled': return text.disabled;
      default: return text.disconnected;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">{text.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{text.title}</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          disabled={saving}
        >
          {text.addProvider}
        </button>
      </div>

      {/* Security Note */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg dark:text-gray-400 dark:bg-gray-700">
        <p>{text.note}</p>
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {providers.map(provider => {
          const status = providerStatuses[provider.id];
          const isEditing = editingProvider === provider.id;
          
          return (
            <div key={provider.id} className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(status?.status || 'disconnected')}`}></div>
                  <h3 className="font-medium">{provider.name}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getStatusText(status?.status || 'disconnected')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testConnection(provider.id)}
                    disabled={status?.status === 'testing' || !provider.enabled}
                    className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    {status?.status === 'testing' ? text.testingConnection : text.testConnection}
                  </button>
                  <button
                    onClick={() => setEditingProvider(isEditing ? null : provider.id)}
                    className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    {isEditing ? text.cancel : text.edit}
                  </button>
                  <button
                    onClick={() => toggleProvider(provider.id)}
                    className={`text-sm px-3 py-1 rounded ${
                      provider.enabled 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {provider.enabled ? text.disable : text.enable}
                  </button>
                  <button
                    onClick={() => deleteProvider(provider.id)}
                    className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    {text.delete}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded dark:bg-gray-700">
                  <div>
                    <label className="block text-sm font-medium mb-1">{text.apiKey}</label>
                    <input
                      type="password"
                      placeholder={provider.apiKey.includes('*') ? text.enterNewKey : text.apiKeyPlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-400"
                      onChange={(e) => {
                        const updatedProviders = providers.map(p => 
                          p.id === provider.id ? { ...p, apiKey: e.target.value } : p
                        );
                        setProviders(updatedProviders);
                      }}
                    />
                    {provider.apiKey.includes('*') && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{text.maskedKey}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{text.baseUrl}</label>
                    <input
                      type="url"
                      value={provider.baseUrl || ''}
                      placeholder={text.baseUrlPlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-400"
                      onChange={(e) => {
                        const updatedProviders = providers.map(p => 
                          p.id === provider.id ? { ...p, baseUrl: e.target.value } : p
                        );
                        setProviders(updatedProviders);
                      }}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateProvider(provider.id, providers.find(p => p.id === provider.id)!)}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? text.saving : text.save}
                    </button>
                    <button
                      onClick={() => {
                        setEditingProvider(null);
                        loadProviders(); // Reset changes
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      {text.cancel}
                    </button>
                  </div>
                </div>
              )}

              {/* Status Details */}
              {status?.error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">
                  {status.error}
                </div>
              )}

              {status?.lastTested && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {text.lastTested}: {new Date(status.lastTested).toLocaleString()}
                </div>
              )}

              {/* Models */}
              <div>
                <h4 className="text-sm font-medium mb-2">{text.models}</h4>
                {status?.models && status.models.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {status.models.map(model => (
                      <div key={model.id} className="text-sm p-2 bg-gray-50 rounded dark:bg-gray-700">
                        <div className="font-medium">{model.displayName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {model.supportsToolCalling && `${text.toolCalling} • `}
                          {text.maxTokens}: {model.maxTokens?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">{text.noModels}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Provider Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
          <h3 className="font-medium mb-4">{text.addProvider}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">{text.providerName}</label>
              <select
                value={newProvider.name}
                onChange={(e) => setNewProvider(prev => ({ 
                  ...prev, 
                  name: e.target.value,
                  baseUrl: getDefaultBaseUrl(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-400"
              >
                <option value="openai">{text.openai}</option>
                <option value="deepseek">{text.deepseek}</option>
                <option value="openrouter">{text.openrouter}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{text.apiKey}</label>
              <input
                type="password"
                value={newProvider.apiKey || ''}
                placeholder={text.apiKeyPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-400"
                onChange={(e) => setNewProvider(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{text.baseUrl}</label>
              <input
                type="url"
                value={newProvider.baseUrl || ''}
                placeholder={text.baseUrlPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-400"
                onChange={(e) => setNewProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={newProvider.enabled}
                onChange={(e) => setNewProvider(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="enabled" className="text-sm">{text.enabled}</label>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={addProvider}
                disabled={!newProvider.name || !newProvider.apiKey || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? text.saving : text.save}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewProvider({ name: 'openai', enabled: true, models: [] });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                {text.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}