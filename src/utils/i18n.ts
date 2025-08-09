import type { TFunction } from 'i18next';

// Specific translation key types for better type safety
export type CommonKeys = 
  | 'save' | 'cancel' | 'delete' | 'edit' | 'loading' | 'error' | 'success' 
  | 'confirm' | 'close' | 'back' | 'next' | 'previous' | 'search' | 'clear' | 'refresh';

export type ChatKeys = 
  | 'sendMessage' | 'newChat' | 'chatHistory' | 'toolConfirmation' | 'runTool' 
  | 'cancelTool' | 'messagePlaceholder' | 'noMessages' | 'toolExecuting' 
  | 'toolCompleted' | 'toolFailed' | 'copyMessage' | 'regenerateResponse' | 'stopGeneration'
  | 'selectProvider' | 'selectModel' | 'messageCount' | 'sessionTitle' | 'deleteSession'
  | 'renameSession' | 'exportSession' | 'toolParameters' | 'toolDescription'
  | 'confirmToolExecution' | 'toolExecutionWarning';

export type SettingsKeys = 
  | 'title' | 'llmProvider' | 'mcpServers' | 'language' | 'theme' | 'preferences' 
  | 'apiKey' | 'model' | 'testConnection' | 'connectionSuccessful' | 'connectionFailed' 
  | 'serverStatus' | 'connected' | 'disconnected' | 'addServer' | 'removeServer' 
  | 'serverName' | 'serverCommand' | 'serverArgs' | 'autoScroll' | 'soundEnabled'
  | 'apiKeyPlaceholder' | 'baseUrl' | 'baseUrlPlaceholder' | 'modelSupportsTools'
  | 'maxTokens' | 'temperature' | 'serverConfiguration' | 'environmentVariables'
  | 'serverEnabled' | 'availableTools' | 'toolCount' | 'resetSettings'
  | 'exportSettings' | 'importSettings';

export type ErrorKeys = 
  | 'connectionFailed' | 'invalidApiKey' | 'toolExecutionFailed' | 'sessionLoadFailed' 
  | 'settingsSaveFailed' | 'networkError' | 'unknownError' | 'fileNotFound' 
  | 'invalidConfiguration' | 'serverUnavailable';

export type NavigationKeys = 'home' | 'chat' | 'settings' | 'history' | 'about';
export type ProviderKeys = 'openai' | 'deepseek' | 'openrouter';
export type LanguageKeys = 'en' | 'zh';
export type ThemeKeys = 'light' | 'dark' | 'system';

// Type-safe translation keys based on our translation structure
export type TranslationKey = 
  | `common.${CommonKeys}`
  | `chat.${ChatKeys}`
  | `settings.${SettingsKeys}`
  | `errors.${ErrorKeys}`
  | `navigation.${NavigationKeys}`
  | `providers.${ProviderKeys}`
  | `languages.${LanguageKeys}`
  | `themes.${ThemeKeys}`;

// Helper function for type-safe translations
export const createTypedTranslation = (t: TFunction) => {
  return (key: TranslationKey, options?: any) => t(key, options);
};

// Translation namespace helpers
export const createNamespacedTranslation = (t: TFunction) => ({
  common: (key: CommonKeys, options?: any) => String(t(`common.${key}`, options)),
  chat: (key: ChatKeys, options?: any) => String(t(`chat.${key}`, options)),
  settings: (key: SettingsKeys, options?: any) => String(t(`settings.${key}`, options)),
  errors: (key: ErrorKeys, options?: any) => String(t(`errors.${key}`, options)),
  navigation: (key: NavigationKeys, options?: any) => String(t(`navigation.${key}`, options)),
  providers: (key: ProviderKeys, options?: any) => String(t(`providers.${key}`, options)),
  languages: (key: LanguageKeys, options?: any) => String(t(`languages.${key}`, options)),
  themes: (key: ThemeKeys, options?: any) => String(t(`themes.${key}`, options)),
});

// Language detection utilities
export const detectBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language || (navigator as any).userLanguage;
  
  // Extract language code (e.g., 'zh-CN' -> 'zh')
  const langCode = browserLang.split('-')[0];
  
  // Return supported language or fallback to English
  return ['en', 'zh'].includes(langCode) ? langCode : 'en';
};

// Format date/time based on current locale
export const formatDateTime = (date: Date, locale: string): string => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Format relative time (e.g., "2 minutes ago")
export const formatRelativeTime = (date: Date, locale: string): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Unknown time';
  }
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
};

// Pluralization helper
export const pluralize = (
  t: TFunction,
  key: string,
  count: number,
  options?: any
): string => {
  return String(t(key, { count, ...options }));
};

// Translation with interpolation helper
export const translateWithValues = (
  t: TFunction,
  key: TranslationKey,
  values: Record<string, any>
): string => {
  return String(t(key, values));
};

// Validation helper for translation keys
export const isValidTranslationKey = (key: string): key is TranslationKey => {
  const validPrefixes = ['common.', 'chat.', 'settings.', 'errors.', 'navigation.', 'providers.', 'languages.', 'themes.'];
  return validPrefixes.some(prefix => key.startsWith(prefix));
};

// Get all translation keys for a namespace
export const getNamespaceKeys = (namespace: string): string[] => {
  const keyMaps = {
    common: ['save', 'cancel', 'delete', 'edit', 'loading', 'error', 'success', 'confirm', 'close', 'back', 'next', 'previous', 'search', 'clear', 'refresh'],
    chat: ['sendMessage', 'newChat', 'chatHistory', 'toolConfirmation', 'runTool', 'cancelTool', 'messagePlaceholder', 'noMessages', 'toolExecuting', 'toolCompleted', 'toolFailed', 'copyMessage', 'regenerateResponse', 'stopGeneration', 'selectProvider', 'selectModel', 'messageCount', 'sessionTitle', 'deleteSession', 'renameSession', 'exportSession', 'toolParameters', 'toolDescription', 'confirmToolExecution', 'toolExecutionWarning'],
    settings: ['title', 'llmProvider', 'mcpServers', 'language', 'theme', 'preferences', 'apiKey', 'model', 'testConnection', 'connectionSuccessful', 'connectionFailed', 'serverStatus', 'connected', 'disconnected', 'addServer', 'removeServer', 'serverName', 'serverCommand', 'serverArgs', 'autoScroll', 'soundEnabled', 'apiKeyPlaceholder', 'baseUrl', 'baseUrlPlaceholder', 'modelSupportsTools', 'maxTokens', 'temperature', 'serverConfiguration', 'environmentVariables', 'serverEnabled', 'availableTools', 'toolCount', 'resetSettings', 'exportSettings', 'importSettings'],
    errors: ['connectionFailed', 'invalidApiKey', 'toolExecutionFailed', 'sessionLoadFailed', 'settingsSaveFailed', 'networkError', 'unknownError', 'fileNotFound', 'invalidConfiguration', 'serverUnavailable'],
    navigation: ['home', 'chat', 'settings', 'history', 'about'],
    providers: ['openai', 'deepseek', 'openrouter'],
    languages: ['en', 'zh'],
    themes: ['light', 'dark', 'system']
  };
  
  return keyMaps[namespace as keyof typeof keyMaps] || [];
};