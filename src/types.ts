// Re-export types from lib/types.ts for convenience
export * from '../lib/types';

// Additional frontend-specific types
export interface NotificationOptions {
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  options?: NotificationOptions;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

// UI Component Props
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// Form Types
export interface FormFieldProps {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Chat UI Types
export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onToolConfirm?: (toolCallId: string) => void;
  onToolCancel?: (toolCallId: string) => void;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

// Settings UI Types
export interface ProviderConfigProps {
  provider: LLMProviderConfig;
  onUpdate: (config: Partial<LLMProviderConfig>) => void;
  onRemove: () => void;
  onTest: () => Promise<boolean>;
}

export interface ServerConfigProps {
  server: MCPServerConfig;
  onUpdate: (config: Partial<MCPServerConfig>) => void;
  onRemove: () => void;
  onTest: () => Promise<boolean>;
}

// Accessibility Types
export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderAnnouncements: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  largeText: boolean;
}

// Responsive Types
export interface ResponsiveBreakpoints {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: keyof ResponsiveBreakpoints;
  width: number;
  height: number;
}

// Integration Manager Types
export interface IntegrationState {
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  systemHealth: {
    api: boolean;
    providers: boolean;
    mcpServers: boolean;
  };
}

export interface AsyncOperationOptions {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  showNotifications?: boolean;
}

export interface SystemValidation {
  isValid: boolean;
  issues: string[];
}