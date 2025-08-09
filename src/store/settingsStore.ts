import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Settings, 
  LLMProviderConfig, 
  MCPServerConfig, 
  UserPreferences,
  Theme,
  Language
} from '../types';

interface SettingsStore {
  // Settings data
  llmProviders: LLMProviderConfig[];
  mcpServers: MCPServerConfig[];
  preferences: UserPreferences;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions for LLM providers
  addLLMProvider: (config: Omit<LLMProviderConfig, 'id'>) => void;
  updateLLMProvider: (id: string, config: Partial<LLMProviderConfig>) => void;
  removeLLMProvider: (id: string) => void;
  toggleLLMProvider: (id: string) => void;
  // Note: Connection testing is now handled by the backend API
  testLLMConnection: (id: string, apiKey?: string) => Promise<boolean>;
  
  // Actions for MCP servers
  addMCPServer: (config: Omit<MCPServerConfig, 'id' | 'status'>) => void;
  updateMCPServer: (id: string, config: Partial<MCPServerConfig>) => void;
  removeMCPServer: (id: string) => void;
  toggleMCPServer: (id: string) => void;
  testMCPConnection: (id: string) => Promise<boolean>;
  
  // Actions for preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  changeLanguage: (language: Language) => void;
  changeTheme: (theme: Theme) => void;
  
  // General actions
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => Promise<boolean>;
  importMCPServers: (mcpConfigJson: string) => Promise<boolean>;
}

// Default settings
const defaultSettings: Settings = {
  llmProviders: [
    {
      id: 'default-openai',
      name: 'openai',
      apiKey: '', // User needs to configure this
      baseUrl: 'https://api.openai.com/v1',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', supportsToolCalling: true, maxTokens: 128000 },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsToolCalling: true, maxTokens: 128000 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', supportsToolCalling: true, maxTokens: 128000 },
        { id: 'gpt-4', name: 'GPT-4', supportsToolCalling: true, maxTokens: 8192 },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', supportsToolCalling: true, maxTokens: 16385 },
      ],
      enabled: false, // Disabled until API key is configured
    },
  ],
  mcpServers: [],
  preferences: {
    theme: 'system',
    language: 'en',
    autoScroll: true,
    soundEnabled: false,
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      screenReaderAnnouncements: true,
      keyboardNavigation: true,
      focusVisible: true,
      largeText: false,
    },
  },
};

// Generate unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Note: API Keys are now stored securely in the backend
// Frontend only handles temporary API key input for immediate use

// Storage utilities
const STORAGE_KEY = 'mcp-chat-ui-settings';

const saveToStorage = (settings: Settings): void => {
  try {
    // Validate settings before saving
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object');
    }

    // Remove API keys before storing - they are now stored securely in backend
    const settingsToStore = {
      ...settings,
      llmProviders: (settings.llmProviders || []).map(provider => ({
        ...provider,
        apiKey: '', // Don't store API keys in frontend localStorage
      })),
    };
    
    const serialized = JSON.stringify(settingsToStore);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
    throw error; // Re-throw to allow caller to handle
  }
};

const loadFromStorage = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultSettings };
    
    const parsed = JSON.parse(stored);
    
    // Validate parsed data structure
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid settings data in localStorage, using defaults');
      return { ...defaultSettings };
    }
    
    // Load settings without API keys (they are stored securely in backend)
    const settings: Settings = {
      ...defaultSettings,
      ...parsed,
      llmProviders: (parsed.llmProviders || []).map((provider: any) => ({
        id: provider.id || generateId(),
        name: provider.name || 'openai',
        apiKey: '', // API keys are not stored in frontend
        baseUrl: provider.baseUrl,
        models: provider.models || [],
        enabled: provider.enabled !== false, // Default to true
      })),
      mcpServers: (parsed.mcpServers || []).map((server: any) => ({
        id: server.id || generateId(),
        name: server.name || '',
        command: server.command || '',
        args: Array.isArray(server.args) ? server.args : [],
        env: server.env || {},
        enabled: server.enabled !== false, // Default to true
        status: server.status || 'disconnected',
      })),
      preferences: {
        ...defaultSettings.preferences,
        ...parsed.preferences,
      },
    };
    
    return settings;
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    return { ...defaultSettings };
  }
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...defaultSettings,
      isLoading: false,
      isSaving: false,
      
      // LLM Provider actions
      addLLMProvider: (config) => {
        const newProvider: LLMProviderConfig = {
          ...config,
          id: generateId(),
        };
        
        set((state) => ({
          llmProviders: [...state.llmProviders, newProvider],
        }));
        
        get().saveSettings();
      },
      
      updateLLMProvider: (id, config) => {
        console.log('🔧 updateLLMProvider called:', { id, config });
        set((state) => ({
          llmProviders: state.llmProviders.map(provider =>
            provider.id === id ? { ...provider, ...config } : provider
          ),
        }));
        
        console.log('💾 Calling saveSettings after updateLLMProvider');
        get().saveSettings();
      },
      
      removeLLMProvider: (id) => {
        set((state) => ({
          llmProviders: state.llmProviders.filter(provider => provider.id !== id),
        }));
        
        get().saveSettings();
      },
      
      toggleLLMProvider: (id) => {
        set((state) => ({
          llmProviders: state.llmProviders.map(provider =>
            provider.id === id ? { ...provider, enabled: !provider.enabled } : provider
          ),
        }));
        
        get().saveSettings();
      },
      
      // Note: Connection testing is now handled by the backend API
      testLLMConnection: async (_id, _apiKey) => {
        throw new Error('Connection testing should use the backend API endpoint');
      },
      
      // MCP Server actions
      addMCPServer: (config) => {
        const newServer: MCPServerConfig = {
          ...config,
          id: generateId(),
          status: 'disconnected',
        };
        
        set((state) => ({
          mcpServers: [...state.mcpServers, newServer],
        }));
        
        get().saveSettings();
      },
      
      updateMCPServer: (id, config) => {
        set((state) => ({
          mcpServers: state.mcpServers.map(server =>
            server.id === id ? { ...server, ...config } : server
          ),
        }));
        
        get().saveSettings();
      },
      
      removeMCPServer: (id) => {
        set((state) => ({
          mcpServers: state.mcpServers.filter(server => server.id !== id),
        }));
        
        get().saveSettings();
      },
      
      toggleMCPServer: (id) => {
        set((state) => ({
          mcpServers: state.mcpServers.map(server =>
            server.id === id ? { ...server, enabled: !server.enabled } : server
          ),
        }));
        
        get().saveSettings();
      },
      
      testMCPConnection: async (id) => {
        const server = get().mcpServers.find(s => s.id === id);
        if (!server) return false;
        
        try {
          // Mock connection test - in real implementation, test actual MCP connection
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update server status
          get().updateMCPServer(id, { status: 'connected' });
          return true;
        } catch (error) {
          console.error('MCP connection test failed:', error);
          get().updateMCPServer(id, { status: 'error' });
          return false;
        }
      },
      
      // Preferences actions
      updatePreferences: (preferences) => {
        // Separate theme and language from other preferences
        const { theme, language, ...otherPreferences } = preferences;
        
        // Update non-theme/language preferences in store
        if (Object.keys(otherPreferences).length > 0) {
          set((state) => ({
            preferences: { ...state.preferences, ...otherPreferences },
          }));
          get().saveSettings();
        }
        
        // Handle theme and language separately (they are stored in localStorage)
        if (theme) {
          localStorage.setItem('mcp-chat-ui-theme', theme);
          applyThemeToDocument(theme);
        }
        
        if (language) {
          localStorage.setItem('mcp-chat-ui-language', language);
          updateI18nLanguage(language);
        }
      },
      
      changeLanguage: (language) => {
        // Store language in localStorage (browser-specific)
        localStorage.setItem('mcp-chat-ui-language', language);
        
        // Update i18n language immediately
        updateI18nLanguage(language);
        
        // Update store state for UI consistency but don't save to backend
        set((state) => ({
          preferences: { ...state.preferences, language },
        }));
      },
      
      changeTheme: (theme) => {
        // Store theme in localStorage (browser-specific)
        localStorage.setItem('mcp-chat-ui-theme', theme);
        
        // Apply theme immediately
        applyThemeToDocument(theme);
        
        // Update store state for UI consistency but don't save to backend
        set((state) => ({
          preferences: { ...state.preferences, theme },
        }));
      },
      
      // General actions
      loadSettings: async () => {
        console.log('📥 loadSettings called - loading from backend');
        set({ isLoading: true });
        
        try {
          // Load API keys and MCP servers from backend configuration
          const response = await fetch('/api/settings');
          if (response.ok) {
            const backendSettings = await response.json();
            console.log('📊 Backend settings loaded:', backendSettings);
            
            // Load theme and language from localStorage (browser-specific)
            const savedTheme = localStorage.getItem('mcp-chat-ui-theme') as Theme || 'system';
            const savedLanguage = localStorage.getItem('mcp-chat-ui-language') as Language || 'en';
            
            // Merge backend settings with browser preferences
            set({
              llmProviders: backendSettings.llmProviders || defaultSettings.llmProviders,
              mcpServers: backendSettings.mcpServers || defaultSettings.mcpServers,
              preferences: {
                ...defaultSettings.preferences,
                ...backendSettings.preferences,
                theme: savedTheme, // Override with browser preference
                language: savedLanguage, // Override with browser preference
              },
            });
          } else {
            console.warn('Failed to load settings from backend, using local storage');
            // Fallback to local storage if backend is not available
            const localSettings = loadFromStorage();
            
            // Still load theme and language from localStorage
            const savedTheme = localStorage.getItem('mcp-chat-ui-theme') as Theme || 'system';
            const savedLanguage = localStorage.getItem('mcp-chat-ui-language') as Language || 'en';
            
            set({
              ...localSettings,
              preferences: {
                ...localSettings.preferences,
                theme: savedTheme,
                language: savedLanguage,
              },
            });
          }
          
          // Apply theme and language after loading
          const currentState = get();
          applyThemeToDocument(currentState.preferences.theme);
          await updateI18nLanguage(currentState.preferences.language);
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Failed to load settings from backend:', error);
          // Fallback to local storage
          const localSettings = loadFromStorage();
          
          // Still load theme and language from localStorage
          const savedTheme = localStorage.getItem('mcp-chat-ui-theme') as Theme || 'system';
          const savedLanguage = localStorage.getItem('mcp-chat-ui-language') as Language || 'en';
          
          set({
            ...localSettings,
            preferences: {
              ...localSettings.preferences,
              theme: savedTheme,
              language: savedLanguage,
            },
          });
          
          // Apply theme and language
          applyThemeToDocument(savedTheme);
          await updateI18nLanguage(savedLanguage);
          
          set({ isLoading: false });
        }
      },
      
      saveSettings: async () => {
        console.log('💾 saveSettings called - saving to backend');
        set({ isSaving: true });
        
        try {
          const state = get();
          
          // Filter out providers with empty or masked API keys to avoid validation errors
          const filteredProviders = state.llmProviders.map(provider => {
            const apiKey = provider.apiKey;
            // Skip validation for empty, masked, or placeholder API keys
            if (!apiKey || 
                apiKey.includes('•') || 
                apiKey.includes('*') || 
                apiKey.trim() === '' ||
                apiKey === '••••') {
              return {
                ...provider,
                apiKey: '', // Send empty string instead of masked value
              };
            }
            return provider;
          });
          
          // Explicitly extract only the data fields we want to send
          // Exclude theme and language from backend storage (they are browser-specific)
          const { theme, language, ...backendPreferences } = state.preferences;
          
          const settings = {
            llmProviders: filteredProviders,
            mcpServers: state.mcpServers,
            preferences: backendPreferences, // Only save non-browser-specific preferences
          };
          
          // Debug: Log the data being sent (but mask API keys in logs)
          const logSettings = {
            ...settings,
            llmProviders: settings.llmProviders.map(p => ({
              ...p,
              apiKey: p.apiKey ? '***masked***' : '(empty)'
            }))
          };
          console.log('📤 Sending settings to backend:', JSON.stringify(logSettings, null, 2));
          
          // Save to backend API (backend will handle API key encryption)
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
          });
          
          if (response.ok) {
            const savedSettings = await response.json();
            console.log('✅ Settings saved to backend');
            
            // Update local state with backend response (API keys will be masked)
            set({
              llmProviders: savedSettings.llmProviders || settings.llmProviders,
              mcpServers: savedSettings.mcpServers || settings.mcpServers,
              preferences: savedSettings.preferences || settings.preferences,
            });
            
            // Also save to local storage as backup (without API keys)
            saveToStorage(settings);
          } else {
            // Get detailed error information
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              if (errorData.message) {
                errorMessage = errorData.message;
              }
              console.error('❌ Backend error details:', errorData);
            } catch (e) {
              console.error('❌ Failed to parse error response');
            }
            throw new Error(`Failed to save settings to backend: ${errorMessage}`);
          }
          
          set({ isSaving: false });
        } catch (error) {
          console.error('Failed to save settings:', error);
          // Fallback to local storage (without API keys)
          const state = get();
          const settings = {
            llmProviders: state.llmProviders,
            mcpServers: state.mcpServers,
            preferences: state.preferences,
          };
          saveToStorage(settings);
          set({ isSaving: false });
          throw error;
        }
      },
      
      resetSettings: () => {
        set({ ...defaultSettings });
        localStorage.removeItem(STORAGE_KEY);
      },
      
      exportSettings: () => {
        const state = get();
        const settings = {
          llmProviders: state.llmProviders,
          mcpServers: state.mcpServers,
          preferences: state.preferences,
        };
        return JSON.stringify(settings, null, 2);
      },
      
      importSettings: async (settingsJson) => {
        try {
          if (!settingsJson || typeof settingsJson !== 'string') {
            throw new Error('Invalid settings JSON string');
          }

          const settings = JSON.parse(settingsJson);
          
          // Validate settings structure
          if (!settings || typeof settings !== 'object') {
            throw new Error('Invalid settings format: not an object');
          }

          if (!Array.isArray(settings.llmProviders)) {
            throw new Error('Invalid settings format: llmProviders must be an array');
          }

          if (!Array.isArray(settings.mcpServers)) {
            throw new Error('Invalid settings format: mcpServers must be an array');
          }

          if (!settings.preferences || typeof settings.preferences !== 'object') {
            throw new Error('Invalid settings format: preferences must be an object');
          }
          
          // Merge with defaults to ensure all required fields are present
          const validatedSettings: Settings = {
            llmProviders: settings.llmProviders.map((provider: any) => ({
              id: provider.id || generateId(),
              name: provider.name || 'openai',
              apiKey: '', // API keys are not imported/stored in frontend
              baseUrl: provider.baseUrl,
              models: Array.isArray(provider.models) ? provider.models : [],
              enabled: provider.enabled !== false,
            })),
            mcpServers: settings.mcpServers.map((server: any) => ({
              id: server.id || generateId(),
              name: server.name || '',
              command: server.command || '',
              args: Array.isArray(server.args) ? server.args : [],
              env: server.env || {},
              enabled: server.enabled !== false,
              status: server.status || 'disconnected',
            })),
            preferences: {
              ...defaultSettings.preferences,
              ...settings.preferences,
            },
          };
          
          set({ ...defaultSettings, ...validatedSettings });
          await get().saveSettings();
          
          return true;
        } catch (error) {
          console.error('Failed to import settings:', error);
          return false;
        }
      },

      importMCPServers: async (mcpConfigJson) => {
        try {
          const newServers = importMCPServersFromJSON(mcpConfigJson);
          
          if (newServers.length === 0) {
            throw new Error('No valid MCP servers found in configuration');
          }

          set((state) => ({
            mcpServers: [...state.mcpServers, ...newServers],
          }));

          await get().saveSettings();
          return true;
        } catch (error) {
          console.error('Failed to import MCP servers:', error);
          return false;
        }
      },
    }),
    {
      name: STORAGE_KEY,
      // Only persist the settings data, not the loading states or actions
      partialize: (state) => ({
        llmProviders: state.llmProviders,
        mcpServers: state.mcpServers,
        preferences: state.preferences,
      }),

      // Ensure restored data is valid
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure arrays exist
          if (!Array.isArray(state.llmProviders)) {
            state.llmProviders = [];
          }
          if (!Array.isArray(state.mcpServers)) {
            state.mcpServers = [];
          }
          // Ensure preferences exist
          if (!state.preferences) {
            state.preferences = defaultSettings.preferences;
          }
        }
      },
    }
  )
);

// Helper function to import MCP servers from JSON config format
export const importMCPServersFromJSON = (mcpConfigJson: string): MCPServerConfig[] => {
  try {
    const config = JSON.parse(mcpConfigJson);
    
    // Support the format: {"mcpServers": {"server-name": {"command": "...", "args": [...]}}}
    if (config.mcpServers && typeof config.mcpServers === 'object') {
      return Object.entries(config.mcpServers).map(([name, serverConfig]: [string, any]) => ({
        id: generateId(),
        name,
        command: serverConfig.command || '',
        args: Array.isArray(serverConfig.args) ? serverConfig.args : [],
        env: serverConfig.env || {},
        enabled: serverConfig.enabled !== false,
        status: 'disconnected' as const,
      }));
    }
    
    // Support direct array format: [{"name": "...", "command": "...", "args": [...]}]
    if (Array.isArray(config)) {
      return config.map((serverConfig: any) => ({
        id: generateId(),
        name: serverConfig.name || '',
        command: serverConfig.command || '',
        args: Array.isArray(serverConfig.args) ? serverConfig.args : [],
        env: serverConfig.env || {},
        enabled: serverConfig.enabled !== false,
        status: 'disconnected' as const,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to parse MCP servers JSON:', error);
    return [];
  }
};

// Note: Default base URLs are now handled by the backend

// Note: Connection testing is now handled by the backend API

// Theme application utility
let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

const applyThemeToDocument = (theme: Theme) => {
  const root = document.documentElement;
  
  // Remove existing system theme listener
  if (systemThemeListener) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.removeEventListener('change', systemThemeListener);
    systemThemeListener = null;
  }
  
  if (theme === 'dark') {
    root.classList.add('dark');
    console.log('🌙 Applied dark theme');
  } else if (theme === 'light') {
    root.classList.remove('dark');
    console.log('☀️ Applied light theme');
  } else {
    // System theme
    const applySystemTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        console.log('🌙 Applied system dark theme');
      } else {
        root.classList.remove('dark');
        console.log('☀️ Applied system light theme');
      }
    };
    
    // Apply system theme immediately
    applySystemTheme();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeListener = () => applySystemTheme();
    mediaQuery.addEventListener('change', systemThemeListener);
  }
};

// Language update utility
const updateI18nLanguage = async (language: Language) => {
  try {
    // Dynamically import i18n to avoid circular dependencies
    const { default: i18n } = await import('../i18n');
    await i18n.changeLanguage(language);
    
    // Also update localStorage for i18next language detector
    localStorage.setItem('i18nextLng', language);
  } catch (error) {
    console.warn('Failed to update i18n language:', error);
  }
};

// Initialize settings on app start
export const initializeSettings = async () => {
  const store = useSettingsStore.getState();
  
  // Set loading state to prevent unnecessary saves during initialization
  useSettingsStore.setState({ isLoading: true });
  
  try {
    await store.loadSettings();
    
    // Apply the current theme after loading settings
    const currentTheme = store.preferences.theme;
    applyThemeToDocument(currentTheme);
    
    // Apply the current language after loading settings
    const currentLanguage = store.preferences.language;
    await updateI18nLanguage(currentLanguage);
  } finally {
    // Mark initialization as complete
    useSettingsStore.setState({ isLoading: false });
  }
};
