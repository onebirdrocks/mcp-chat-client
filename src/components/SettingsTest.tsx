import React, { useState } from 'react';
import { useSettings } from '../hooks';
import { Button, Input, Card, Select } from './ui';
import type { LLMProvider, Theme, Language } from '../types';

const SettingsTest: React.FC = () => {
  const {
    llmProviders,
    mcpServers,
    preferences,
    isLoading,
    isSaving,
    addLLMProvider,
    addMCPServer,
    updatePreferences,
    changeTheme,
    changeLanguage,
    exportSettings,
    importSettings,
    importMCPServers,
    resetSettings,
  } = useSettings();

  const [newProviderName, setNewProviderName] = useState<LLMProvider>('openai');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');
  const [newServerName, setNewServerName] = useState('');
  const [newServerCommand, setNewServerCommand] = useState('');
  const [importData, setImportData] = useState('');
  const [mcpConfigData, setMcpConfigData] = useState('');

  const handleAddProvider = () => {
    if (newProviderApiKey.trim()) {
      addLLMProvider(newProviderName, newProviderApiKey.trim());
      setNewProviderApiKey('');
    }
  };

  const handleAddServer = () => {
    if (newServerName.trim() && newServerCommand.trim()) {
      addMCPServer(newServerName.trim(), newServerCommand.trim());
      setNewServerName('');
      setNewServerCommand('');
    }
  };

  const handleExport = () => {
    const data = exportSettings();
    navigator.clipboard.writeText(data);
    alert('Settings exported to clipboard!');
  };

  const handleImport = async () => {
    if (importData.trim()) {
      const success = await importSettings(importData.trim());
      if (success) {
        alert('Settings imported successfully!');
        setImportData('');
      } else {
        alert('Failed to import settings. Please check the format.');
      }
    }
  };

  const handleImportMCPServers = async () => {
    if (mcpConfigData.trim()) {
      const success = await importMCPServers(mcpConfigData.trim());
      if (success) {
        alert('MCP servers imported successfully!');
        setMcpConfigData('');
      } else {
        alert('Failed to import MCP servers. Please check the JSON format.');
      }
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Settings Test Interface</h1>
      
      {/* Current Settings Display */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Current Settings</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Theme:</strong> {preferences.theme}</div>
          <div><strong>Language:</strong> {preferences.language}</div>
          <div><strong>Auto Scroll:</strong> {preferences.autoScroll ? 'Yes' : 'No'}</div>
          <div><strong>Sound:</strong> {preferences.soundEnabled ? 'Yes' : 'No'}</div>
          <div><strong>LLM Providers:</strong> {llmProviders.length}</div>
          <div><strong>MCP Servers:</strong> {mcpServers.length}</div>
        </div>
      </Card>

      {/* Theme and Language Controls */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <Select
              value={preferences.theme}
              onChange={(e) => changeTheme(e.target.value as Theme)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <Select
              value={preferences.language}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'zh', label: '中文' },
              ]}
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.autoScroll}
              onChange={(e) => updatePreferences({ autoScroll: e.target.checked })}
              className="mr-2"
            />
            Auto Scroll
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.soundEnabled}
              onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
              className="mr-2"
            />
            Sound Enabled
          </label>
        </div>
      </Card>

      {/* Add LLM Provider */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Add LLM Provider</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Provider</label>
            <Select
              value={newProviderName}
              onChange={(e) => setNewProviderName(e.target.value as LLMProvider)}
              options={[
                { value: 'openai', label: 'OpenAI' },
                { value: 'deepseek', label: 'DeepSeek' },
                { value: 'openrouter', label: 'OpenRouter' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">API Key</label>
            <Input
              type="password"
              value={newProviderApiKey}
              onChange={(e) => setNewProviderApiKey(e.target.value)}
              placeholder="Enter API key"
            />
          </div>
          <Button onClick={handleAddProvider} disabled={!newProviderApiKey.trim()}>
            Add Provider
          </Button>
        </div>
      </Card>

      {/* Current LLM Providers */}
      {llmProviders.length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Current LLM Providers</h2>
          <div className="space-y-2">
            {llmProviders.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <span className="font-medium">{provider.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({provider.models.length} models)
                  </span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                    provider.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  API Key: {provider.apiKey.substring(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add MCP Server */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Add MCP Server</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Server Name</label>
            <Input
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              placeholder="e.g., Ebook MCP Server"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Command</label>
            <Input
              value={newServerCommand}
              onChange={(e) => setNewServerCommand(e.target.value)}
              placeholder="e.g., uvx ebook-mcp"
            />
          </div>
          <Button onClick={handleAddServer} disabled={!newServerName.trim() || !newServerCommand.trim()}>
            Add Server
          </Button>
        </div>
      </Card>

      {/* Current MCP Servers */}
      {mcpServers.length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Current MCP Servers</h2>
          <div className="space-y-2">
            {mcpServers.map((server) => (
              <div key={server.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <span className="font-medium">{server.name}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                    server.status === 'connected' ? 'bg-green-100 text-green-800' :
                    server.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {server.status}
                  </span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                    server.enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {server.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {server.command}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Import/Export */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Import/Export Settings</h2>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={handleExport}>
              Export Settings
            </Button>
            <Button onClick={resetSettings} variant="danger">
              Reset All Settings
            </Button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Import Settings (JSON)</label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste exported settings JSON here"
              className="w-full h-32 p-2 border rounded"
            />
            <Button onClick={handleImport} disabled={!importData.trim()} className="mt-2">
              Import Settings
            </Button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Import MCP Servers (JSON)</label>
            <textarea
              value={mcpConfigData}
              onChange={(e) => setMcpConfigData(e.target.value)}
              placeholder='Paste MCP config JSON here, e.g.:
{
  "mcpServers": {
    "ebook-mcp": {
      "command": "uv",
      "args": ["--directory", "/path/to/ebook-mcp", "run", "main.py"]
    }
  }
}'
              className="w-full h-32 p-2 border rounded text-sm"
            />
            <Button onClick={handleImportMCPServers} disabled={!mcpConfigData.trim()} className="mt-2">
              Import MCP Servers
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading/Saving Status */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow">
          Saving settings...
        </div>
      )}
    </div>
  );
};

export default SettingsTest;