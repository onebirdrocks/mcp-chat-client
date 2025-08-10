// Migration types for data and configuration migration

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errors: string[];
  warnings: string[];
  rollbackData?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MigrationOptions {
  dryRun?: boolean;
  createBackup?: boolean;
  validateOnly?: boolean;
  force?: boolean;
  rollbackOnError?: boolean;
}

// Legacy data structures (from old Vite frontend + Next.js backend)
export interface LegacyMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  timestamp: string | Date;
  toolCalls?: LegacyToolCall[];
  toolCallId?: string;
}

export interface LegacyToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
  serverId?: string;
  approved?: boolean;
  executionTime?: number;
  result?: string;
  error?: string;
}

export interface LegacyChatSession {
  id: string;
  title: string;
  messages: LegacyMessage[];
  createdAt: string | Date;
  updatedAt: string | Date;
  provider: string;
  model: string;
  mcpServers?: string[];
  tags?: string[];
  archived?: boolean;
  totalTokens?: number;
  estimatedCost?: number;
}

export interface LegacySessionsData {
  sessions: Record<string, LegacyChatSession>;
  metadata?: {
    lastCleanup?: string;
    totalSessions?: number;
    version?: string;
    encrypted?: boolean;
  };
}

export interface LegacyLLMProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: LegacyModelInfo[];
  enabled: boolean;
  apiKeyHash?: string;
}

export interface LegacyModelInfo {
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

export interface LegacyMCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status?: 'connected' | 'disconnected' | 'error' | 'connecting';
  tools?: any[];
  timeout?: number;
  maxConcurrency?: number;
}

export interface LegacyUserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
  autoScroll: boolean;
  soundEnabled: boolean;
  accessibility?: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReaderAnnouncements: boolean;
    keyboardNavigation: boolean;
    focusVisible: boolean;
    largeText: boolean;
  };
}

export interface LegacySettings {
  llmProviders: LegacyLLMProviderConfig[];
  mcpServers: LegacyMCPServerConfig[];
  preferences: LegacyUserPreferences;
}

// Migration metadata
export interface MigrationMetadata {
  version: string;
  timestamp: string;
  sourceFormat: 'legacy-vite-backend' | 'legacy-backend-only' | 'mixed';
  targetFormat: 'unified-nextjs';
  migratedComponents: string[];
  backupLocation?: string;
}

export interface BackupData {
  metadata: MigrationMetadata;
  originalData: {
    sessions?: any;
    settings?: any;
    preferences?: any;
  };
  checksums: Record<string, string>;
}

// Migration step definitions
export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  execute: (options: MigrationOptions) => Promise<MigrationResult>;
  rollback?: (rollbackData: any) => Promise<MigrationResult>;
  validate?: (data: any) => ValidationResult;
}

export interface MigrationPlan {
  steps: MigrationStep[];
  totalSteps: number;
  estimatedDuration: number;
  requiredBackupSpace: number;
}