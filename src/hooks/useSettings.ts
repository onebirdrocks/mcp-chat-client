import { useCallback } from 'react';
import { useSettingsStore } from '../store';
import type { 
  LLMProviderConfig, 
  MCPServerConfig, 
  UserPreferences, 
  LLMProvider,
  Theme,
  Language 
} from '../types';

export const useSettings = () => {
  const store = useSettingsStore();

  // LLM Provider management
  const addLLMProvider = useCallback((
    name: LLMProvider,
    apiKey: string,
    baseUrl?: string
  ) => {
    const defaultModels = getDefaultModelsForProvider(name);
    
    store.addLLMProvider({
      name,
      apiKey,
      baseUrl,
      models: defaultModels,
      enabled: true,
    });
  }, [store]);

  const updateLLMProvider = useCallback((
    id: string, 
    updates: Partial<LLMProviderConfig>
  ) => {
    store.updateLLMProvider(id, updates);
  }, [store]);

  const removeLLMProvider = useCallback((id: string) => {
    store.removeLLMProvider(id);
  }, [store]);

  const testLLMProvider = useCallback(async (id: string, apiKey?: string) => {
    return await store.testLLMConnection(id, apiKey);
  }, [store]);

  // MCP Server management
  const addMCPServer = useCallback((
    name: string,
    command: string,
    args: string[] = [],
    env?: Record<string, string>
  ) => {
    store.addMCPServer({
      name,
      command,
      args,
      env,
      enabled: true,
    });
  }, [store]);

  const updateMCPServer = useCallback((
    id: string,
    updates: Partial<MCPServerConfig>
  ) => {
    store.updateMCPServer(id, updates);
  }, [store]);

  const removeMCPServer = useCallback((id: string) => {
    store.removeMCPServer(id);
  }, [store]);

  const testMCPServer = useCallback(async (id: string) => {
    return await store.testMCPConnection(id);
  }, [store]);

  // Preferences management
  const updatePreferences = useCallback((
    updates: Partial<UserPreferences>
  ) => {
    store.updatePreferences(updates);
  }, [store]);

  const changeTheme = useCallback((theme: Theme) => {
    store.changeTheme(theme);
  }, [store]);

  const changeLanguage = useCallback((language: Language) => {
    store.changeLanguage(language);
  }, [store]);

  // Settings management
  const exportSettings = useCallback(() => {
    return store.exportSettings();
  }, [store]);

  const importSettings = useCallback(async (settingsJson: string) => {
    return await store.importSettings(settingsJson);
  }, [store]);

  const importMCPServers = useCallback(async (mcpConfigJson: string) => {
    return await store.importMCPServers(mcpConfigJson);
  }, [store]);

  const resetSettings = useCallback(() => {
    store.resetSettings();
  }, [store]);

  return {
    // State
    llmProviders: store.llmProviders,
    mcpServers: store.mcpServers,
    preferences: store.preferences,
    isLoading: store.isLoading,
    isSaving: store.isSaving,

    // LLM Provider actions
    addLLMProvider,
    updateLLMProvider,
    removeLLMProvider,
    testLLMProvider,
    toggleLLMProvider: store.toggleLLMProvider,

    // MCP Server actions
    addMCPServer,
    updateMCPServer,
    removeMCPServer,
    testMCPServer,
    toggleMCPServer: store.toggleMCPServer,

    // Preferences actions
    updatePreferences,
    changeTheme,
    changeLanguage,

    // General actions
    exportSettings,
    importSettings,
    importMCPServers,
    resetSettings,
    loadSettings: store.loadSettings,
    saveSettings: store.saveSettings,
  };
};

// Helper function to get default models for each provider
const getDefaultModelsForProvider = (provider: LLMProvider) => {
  switch (provider) {
    case 'openai':
      return [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          supportsToolCalling: true,
          maxTokens: 128000,
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          supportsToolCalling: true,
          maxTokens: 128000,
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          supportsToolCalling: true,
          maxTokens: 128000,
        },
      ];
    case 'deepseek':
      return [
        {
          id: 'deepseek-chat',
          name: 'DeepSeek Chat',
          supportsToolCalling: true,
          maxTokens: 32768,
        },
        {
          id: 'deepseek-coder',
          name: 'DeepSeek Coder',
          supportsToolCalling: true,
          maxTokens: 32768,
        },
      ];
    case 'openrouter':
      return [
        {
          id: 'anthropic/claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          supportsToolCalling: true,
          maxTokens: 200000,
        },
        {
          id: 'openai/gpt-4o',
          name: 'GPT-4o (OpenRouter)',
          supportsToolCalling: true,
          maxTokens: 128000,
        },
      ];
    default:
      return [];
  }
};