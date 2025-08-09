// Backend types for the unified Next.js architecture
// These types are used by backend services and may differ from frontend types

export interface Settings {
  llmProviders: LLMProviderConfig[];
  mcpServers: MCPServerConfig[];
  preferences: UserPreferences;
}

export interface LLMProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: ModelInfo[];
  enabled: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  displayName?: string;
  supportsToolCalling: boolean;
  maxTokens?: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status?: 'connected' | 'disconnected' | 'error' | 'connecting';
  tools?: MCPTool[];
  timeout?: number;
  maxConcurrency?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
  serverId: string;
  category?: string;
  dangerous?: boolean;
  requiresConfirmation: boolean;
}

export interface UserPreferences {
  theme: Theme;
  language: Language;
  autoScroll: boolean;
  soundEnabled: boolean;
  accessibility?: AccessibilitySettings;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderAnnouncements: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  largeText: boolean;
}

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Settings validation types
export interface SettingsValidationResult extends ValidationResult {
  sanitizedSettings?: Settings;
}

// Provider test result
export interface ProviderTestResult {
  success: boolean;
  error?: string;
  models?: ModelInfo[];
  latency?: number;
  timestamp: string;
}

// Export types
export interface SettingsExport {
  version: string;
  exportDate: string;
  settings: {
    preferences: UserPreferences;
    mcpServers: MCPServerConfig[];
    // API keys are excluded from exports for security
  };
}

export interface SettingsImportResult {
  imported: boolean;
  errors: string[];
  warnings: string[];
}

// Statistics types
export interface SettingsStatistics {
  totalProviders: number;
  providersWithKeys: number;
  totalMcpServers: number;
  enabledMcpServers: number;
  lastUpdated: string;
}

// Error types
export interface SettingsError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}