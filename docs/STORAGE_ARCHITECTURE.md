# Storage Architecture

This document explains how different types of settings are stored in the MCP Chat UI application.

## Storage Strategy

The application uses a hybrid storage approach to separate configuration data from user preferences:

### 1. Backend Configuration Files (API Keys & MCP Servers)
**Location**: Backend configuration files (not in browser)
**Purpose**: Store sensitive and system-wide configuration
**Contents**:
- API Keys (encrypted with AES)
- MCP Server configurations
- System-wide preferences

**Why**: 
- API keys need to be encrypted and stored securely
- MCP server configurations are system-specific
- These settings should persist across different browsers/devices

### 2. Browser Local Storage (UI Preferences)
**Location**: Browser localStorage
**Purpose**: Store user interface preferences
**Contents**:
- Theme preference (light/dark/system)
- Language preference (en/zh)
- Accessibility settings (stored per browser)

**Why**:
- Theme and language are personal preferences that should be browser-specific
- Different users on the same system may prefer different themes/languages
- These preferences should be immediate and not require server communication

## Implementation Details

### Backend Storage (`/api/settings`)
```typescript
// Stored in backend configuration files
interface BackendSettings {
  llmProviders: LLMProviderConfig[]; // API keys encrypted
  mcpServers: MCPServerConfig[];     // System configurations
  preferences: {
    autoScroll: boolean;
    soundEnabled: boolean;
    accessibility: AccessibilityPreferences;
    // Note: theme and language are NOT stored here
  };
}
```

### Browser Storage (`localStorage`)
```typescript
// Stored in browser localStorage
const browserPreferences = {
  'mcp-chat-ui-theme': 'light' | 'dark' | 'system',
  'mcp-chat-ui-language': 'en' | 'zh',
  // Accessibility preferences may also be stored here
};
```

## Data Flow

### Loading Settings
1. **Backend Configuration**: Load API keys and MCP servers from backend
2. **Browser Preferences**: Load theme and language from localStorage
3. **Merge**: Combine both sources for complete settings

### Saving Settings
1. **API Keys & MCP Servers**: Save to backend (encrypted)
2. **Theme & Language**: Save to localStorage immediately
3. **Other Preferences**: Save to backend

## Benefits

1. **Security**: API keys are encrypted and stored securely on the backend
2. **Performance**: Theme/language changes are immediate (no server round-trip)
3. **User Experience**: Each browser can have different theme/language preferences
4. **Portability**: System configurations can be shared across environments
5. **Privacy**: Personal preferences stay in the user's browser

## File Locations

### Backend Configuration
```
backend/data/settings/
├── settings.json          # Main configuration file
├── api-keys.encrypted     # Encrypted API keys
└── mcp-servers.json       # MCP server configurations
```

### Browser Storage
```
localStorage:
├── mcp-chat-ui-theme      # Theme preference
├── mcp-chat-ui-language   # Language preference
└── mcp-chat-ui-settings   # Backup/fallback settings
```

## Migration Strategy

When upgrading from previous versions:

1. **Existing localStorage settings**: Migrate API keys to backend storage
2. **Theme/Language**: Keep in localStorage
3. **Backup**: Maintain localStorage as fallback for offline usage

## Security Considerations

1. **API Keys**: Never stored in localStorage, always encrypted in backend
2. **MCP Configurations**: Stored in backend to prevent tampering
3. **Personal Preferences**: Safe to store in localStorage (no sensitive data)
4. **Encryption**: AES encryption for all sensitive backend data

## Development Notes

- Use `ThemeToggle` component for theme switching
- Use `LanguageSelector` component for language switching  
- Backend API handles all sensitive configuration
- Frontend localStorage only for immediate UI preferences