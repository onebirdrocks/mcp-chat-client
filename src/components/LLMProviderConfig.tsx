'use client';

import { useState, useEffect, useCallback } from 'react';
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
  latency?: number;
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

interface ProviderFormData {
  name: string;
  apiKey: string;
  baseUrl?: string;
  enabled: boolean;
}

export default function LLMProviderConfig({ language = 'en' }: LLMProviderConfigProps) {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [newProvider, setNewProvider] = useState<ProviderFormData>({
    name: 'openai',
    apiKey: '',
    enabled: true
  });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

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
    testAll: '测试所有连接',
    save: '保存',
    cancel: '取消',
    edit: '编辑',
    delete: '删除',
    enable: '启用',
    disable: '禁用',
    status: '状态',
    models: '模型',
    lastTested: '最后测试',
    latency: '延迟',
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
    securityNote: '安全提示：所有 API 密钥都使用 AES 加密存储，仅在服务器端使用，从不发送到客户端。',
    maskedKey: '密钥已加密存储',
    enterNewKey: '输入新密钥以更新',
    keepExisting: '保持现有密钥',
    providerOverview: '提供商概览',
    availableProviders: '可用提供商',
    configuredProviders: '已配置提供商',
    totalModels: '总模型数',
    toolSupportedModels: '支持工具调用的模型',
    refreshStatus: '刷新状态',
    viewDetails: '查看详情',
    hideDetails: '隐藏详情',
    modelDetails: '模型详情',
    providerDetails: '提供商详情',
    connectionDetails: '连接详情',
    ms: '毫秒',
    never: '从未',
    unknown: '未知',
    required: '必填',
    optional: '可选',
    validationError: '验证错误',
    networkError: '网络错误',
    authError: '认证错误',
    serverError: '服务器错误',
    retryConnection: '重试连接',
    autoTest: '自动测试',
    manualTest: '手动测试'
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
    testAll: 'Test All Connections',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    enable: 'Enable',
    disable: 'Disable',
    status: 'Status',
    models: 'Models',
    lastTested: 'Last Tested',
    latency: 'Latency',
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
    securityNote: 'Security: All API keys are encrypted with AES and stored server-side only, never sent to the client.',
    maskedKey: 'Key is encrypted and stored',
    enterNewKey: 'Enter new key to update',
    keepExisting: 'Keep existing key',
    providerOverview: 'Provider Overview',
    availableProviders: 'Available Providers',
    configuredProviders: 'Configured Providers',
    totalModels: 'Total Models',
    toolSupportedModels: 'Tool-Calling Models',
    refreshStatus: 'Refresh Status',
    viewDetails: 'View Details',
    hideDetails: 'Hide Details',
    modelDetails: 'Model Details',
    providerDetails: 'Provider Details',
    connectionDetails: 'Connection Details',
    ms: 'ms',
    never: 'Never',
    unknown: 'Unknown',
    required: 'Required',
    optional: 'Optional',
    validationError: 'Validation Error',
    networkError: 'Network Error',
    authError: 'Authentication Error',
    serverError: 'Server Error',
    retryConnection: 'Retry Connection',
    autoTest: 'Auto Test',
    manualTest: 'Manual Test'
  };

  // Load providers on component mount
  useEffect(() => {
    loadProviders();
  }, []);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
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

  const testConnection = async (providerId: string, showNotifications = true) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    setProviderStatuses(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], status: 'testing' }
    }));

    const startTime = Date.now();

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
      const latency = Date.now() - startTime;
      
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
          lastTested: result.timestamp,
          latency: result.latency || latency
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
        
        if (showNotifications) {
          showNotification('success', `${text.connectionSuccess}: ${provider.name}`);
        }
      } else if (showNotifications) {
        showNotification('error', `${text.connectionFailed}: ${provider.name} - ${result.error}`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      const latency = Date.now() - startTime;
      
      setProviderStatuses(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          status: 'error',
          error: 'Connection test failed',
          latency
        }
      }));
      
      if (showNotifications) {
        showNotification('error', `${text.connectionFailed}: ${provider.name}`);
      }
    }
  };

  const testAllConnections = async () => {
    setTestingAll(true);
    const enabledProviders = providers.filter(p => p.enabled && p.apiKey && !p.apiKey.includes('*'));
    
    showNotification('info', `Testing ${enabledProviders.length} providers...`);
    
    try {
      // Test connections in parallel with a limit
      const testPromises = enabledProviders.map(provider => 
        testConnection(provider.id, false)
      );
      
      await Promise.allSettled(testPromises);
      
      // Count successful connections
      const successCount = Object.values(providerStatuses).filter(s => s.status === 'connected').length;
      showNotification('success', `Testing complete: ${successCount}/${enabledProviders.length} providers connected`);
    } catch (error) {
      showNotification('error', 'Failed to test all connections');
    } finally {
      setTestingAll(false);
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
    if (!newProvider.name || !newProvider.apiKey) {
      showNotification('error', 'Provider name and API key are required');
      return;
    }

    // Validate API key format
    if (!validateApiKeyFormat(newProvider.name, newProvider.apiKey)) {
      showNotification('error', 'Invalid API key format for selected provider');
      return;
    }

    setSaving(true);
    
    try {
      const provider: LLMProvider = {
        id: `${newProvider.name}-${Date.now()}`,
        name: newProvider.name,
        apiKey: newProvider.apiKey,
        baseUrl: newProvider.baseUrl || getDefaultBaseUrl(newProvider.name),
        models: [],
        enabled: newProvider.enabled
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
        setNewProvider({ name: 'openai', apiKey: '', enabled: true });
        
        showNotification('success', text.providerAdded);
        
        // Test connection for new provider
        if (provider.enabled) {
          setTimeout(() => testConnection(provider.id), 500);
        }
      } else {
        showNotification('error', 'Failed to save provider');
      }
    } catch (error) {
      console.error('Failed to add provider:', error);
      showNotification('error', 'Failed to add provider');
    } finally {
      setSaving(false);
    }
  };

  const validateApiKeyFormat = (providerName: string, apiKey: string): boolean => {
    if (!apiKey || apiKey.length < 10) return false;
    
    switch (providerName) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'deepseek':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'openrouter':
        return apiKey.startsWith('sk-or-') && apiKey.length > 30;
      default:
        return apiKey.length > 10;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-gray-500 dark:text-gray-400">{text.loading}</div>
      </div>
    );
  }

  // Calculate statistics
  const totalProviders = providers.length;
  const enabledProviders = providers.filter(p => p.enabled).length;
  const connectedProviders = Object.values(providerStatuses).filter(s => s.status === 'connected').length;
  const totalModels = Object.values(providerStatuses).reduce((sum, status) => sum + (status.models?.length || 0), 0);
  const toolSupportedModels = Object.values(providerStatuses).reduce((sum, status) => 
    sum + (status.models?.filter(m => m.supportsToolCalling).length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg border-l-4 ${
          notification.type === 'success' ? 'bg-green-50 border-green-400 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
          notification.type === 'error' ? 'bg-red-50 border-red-400 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
          'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{text.title}</h2>
        <div className="flex space-x-2">
          <button
            onClick={testAllConnections}
            disabled={testingAll || enabledProviders === 0}
            className="inline-flex items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {testingAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                {text.testing}
              </>
            ) : (
              text.testAll
            )}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            disabled={saving}
          >
            {text.addProvider}
          </button>
        </div>
      </div>

      {/* Provider Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">{totalProviders}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{text.configuredProviders}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600">{connectedProviders}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{text.connected}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600">{totalModels}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{text.totalModels}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600">{toolSupportedModels}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{text.toolSupportedModels}</div>
        </div>
      </div>

      {/* Security Note */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border-l-4 border-blue-400 dark:text-gray-400 dark:bg-gray-700">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0 w-5 h-5 text-blue-500 mt-0.5">
            🔒
          </div>
          <div>
            <p className="font-medium mb-1">{text.note.split(':')[0]}:</p>
            <p>{text.securityNote}</p>
          </div>
        </div>
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {providers.map(provider => {
          const status = providerStatuses[provider.id];
          const isEditing = editingProvider === provider.id;
          const isExpanded = expandedProvider === provider.id;
          
          return (
            <div key={provider.id} className="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
              {/* Provider Header */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status?.status || 'disconnected')}`}></div>
                    <div>
                      <h3 className="font-medium capitalize">{provider.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{getStatusText(status?.status || 'disconnected')}</span>
                        {status?.latency && (
                          <>
                            <span>•</span>
                            <span>{status.latency}{text.ms}</span>
                          </>
                        )}
                        {status?.models && status.models.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{status.models.length} {text.models.toLowerCase()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                      className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      {isExpanded ? text.hideDetails : text.viewDetails}
                    </button>
                    <button
                      onClick={() => testConnection(provider.id)}
                      disabled={status?.status === 'testing' || !provider.enabled}
                      className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      {status?.status === 'testing' ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1 inline-block"></div>
                          {text.testing}
                        </>
                      ) : (
                        text.testConnection
                      )}
                    </button>
                    <button
                      onClick={() => setEditingProvider(isEditing ? null : provider.id)}
                      className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      {isEditing ? text.cancel : text.edit}
                    </button>
                    <button
                      onClick={() => toggleProvider(provider.id)}
                      className={`text-sm px-3 py-1 rounded transition-colors ${
                        provider.enabled 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                      }`}
                    >
                      {provider.enabled ? text.disable : text.enable}
                    </button>
                    <button
                      onClick={() => deleteProvider(provider.id)}
                      className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    >
                      {text.delete}
                    </button>
                  </div>
                </div>

                {/* Quick Status Info */}
                {status?.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3 dark:bg-red-900/20 dark:text-red-400">
                    <div className="flex items-center space-x-2">
                      <span>⚠️</span>
                      <span>{status.error}</span>
                    </div>
                  </div>
                )}

                {status?.lastTested && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {text.lastTested}: {new Date(status.lastTested).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Provider Details */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">{text.providerDetails}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{text.providerName}:</span>
                          <span className="capitalize">{provider.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{text.baseUrl}:</span>
                          <span className="truncate ml-2">{provider.baseUrl || text.unknown}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{text.apiKey}:</span>
                          <span className="font-mono text-xs">{provider.apiKey.includes('*') ? text.maskedKey : '••••••••'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{text.status}:</span>
                          <span className={`font-medium ${
                            status?.status === 'connected' ? 'text-green-600' :
                            status?.status === 'error' ? 'text-red-600' :
                            status?.status === 'testing' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {getStatusText(status?.status || 'disconnected')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Connection Details */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">{text.connectionDetails}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{text.lastTested}:</span>
                          <span>{status?.lastTested ? new Date(status.lastTested).toLocaleString() : text.never}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{text.latency}:</span>
                          <span>{status?.latency ? `${status.latency}${text.ms}` : text.unknown}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{text.totalModels}:</span>
                          <span>{status?.models?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{text.toolSupportedModels}:</span>
                          <span>{status?.models?.filter(m => m.supportsToolCalling).length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Models List */}
                  {status?.models && status.models.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">{text.modelDetails}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {status.models.map(model => (
                          <div key={model.id} className="text-sm p-3 bg-white rounded border dark:bg-gray-800 dark:border-gray-600">
                            <div className="font-medium mb-1">{model.displayName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                              <div>ID: {model.id}</div>
                              <div className="flex items-center space-x-2">
                                <span className={`w-2 h-2 rounded-full ${model.supportsToolCalling ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                <span>{model.supportsToolCalling ? text.toolCalling : 'No tool calling'}</span>
                              </div>
                              <div>{text.maxTokens}: {model.maxTokens?.toLocaleString() || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit Form */}
              {isEditing && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50">
                  <h4 className="text-sm font-medium mb-3">{text.edit} {provider.name}</h4>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor={`edit-api-key-${provider.id}`} className="block text-sm font-medium mb-1">
                        {text.apiKey} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`edit-api-key-${provider.id}`}
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
                      <label htmlFor={`edit-base-url-${provider.id}`} className="block text-sm font-medium mb-1">
                        {text.baseUrl} <span className="text-gray-400">({text.optional})</span>
                      </label>
                      <input
                        id={`edit-base-url-${provider.id}`}
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
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={() => updateProvider(provider.id, providers.find(p => p.id === provider.id)!)}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                            {text.saving}
                          </>
                        ) : (
                          text.save
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProvider(null);
                          loadProviders(); // Reset changes
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
                      >
                        {text.cancel}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {providers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">🤖</div>
            <p className="text-lg font-medium mb-2">No providers configured</p>
            <p className="text-sm">Add your first LLM provider to get started</p>
          </div>
        )}
      </div>

      {/* Add Provider Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium">{text.addProvider}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure a new LLM provider for chat sessions
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="provider-name-select" className="block text-sm font-medium mb-1">
                {text.providerName} <span className="text-red-500">*</span>
              </label>
              <select
                id="provider-name-select"
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select the LLM provider type
              </p>
            </div>
            
            <div>
              <label htmlFor="api-key-input" className="block text-sm font-medium mb-1">
                {text.apiKey} <span className="text-red-500">*</span>
              </label>
              <input
                id="api-key-input"
                type="password"
                value={newProvider.apiKey}
                placeholder={text.apiKeyPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-400"
                onChange={(e) => setNewProvider(prev => ({ ...prev, apiKey: e.target.value }))}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {newProvider.name === 'openai' && 'Starts with sk- (e.g., sk-...)'}
                {newProvider.name === 'deepseek' && 'Starts with sk- (e.g., sk-...)'}
                {newProvider.name === 'openrouter' && 'Starts with sk-or- (e.g., sk-or-...)'}
              </p>
            </div>
            
            <div>
              <label htmlFor="base-url-input" className="block text-sm font-medium mb-1">
                {text.baseUrl} <span className="text-gray-400">({text.optional})</span>
              </label>
              <input
                id="base-url-input"
                type="url"
                value={newProvider.baseUrl || ''}
                placeholder={text.baseUrlPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:border-blue-400"
                onChange={(e) => setNewProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Default: {getDefaultBaseUrl(newProvider.name)}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled-new"
                checked={newProvider.enabled}
                onChange={(e) => setNewProvider(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="enabled-new" className="text-sm">
                {text.enabled}
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (Enable immediately after adding)
              </span>
            </div>

            {/* API Key Validation Indicator */}
            {newProvider.apiKey && (
              <div className={`text-xs p-2 rounded ${
                validateApiKeyFormat(newProvider.name, newProvider.apiKey)
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {validateApiKeyFormat(newProvider.name, newProvider.apiKey)
                  ? '✓ API key format looks valid'
                  : '⚠ API key format may be invalid'
                }
              </div>
            )}
            
            <div className="flex space-x-2 pt-2">
              <button
                onClick={addProvider}
                disabled={!newProvider.name || !newProvider.apiKey || saving || !validateApiKeyFormat(newProvider.name, newProvider.apiKey)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    {text.saving}
                  </>
                ) : (
                  text.save
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewProvider({ name: 'openai', apiKey: '', enabled: true });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
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