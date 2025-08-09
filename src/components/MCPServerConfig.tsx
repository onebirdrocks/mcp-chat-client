import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Alert } from '@/components/ui';
import { useSettingsStore } from '@/store/settingsStore';
import type { MCPServerConfig as MCPServerConfigType } from '@/types';

interface MCPServerConfigProps {
  className?: string;
}

const MCPServerConfig: React.FC<MCPServerConfigProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const {
    mcpServers,
    addMCPServer,
    updateMCPServer,
    removeMCPServer,
    toggleMCPServer,
    testMCPConnection,
    importMCPServers,
  } = useSettingsStore();

  // Form state for adding/editing servers
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    args: [] as string[],
    env: {} as Record<string, string>,
    enabled: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; error?: string; timestamp: number }>>({});
  const [jsonImportText, setJsonImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Reset form when adding new server
  const handleAddServer = () => {
    setFormData({
      name: '',
      command: '',
      args: [],
      env: {},
      enabled: true,
    });
    setFormErrors({});
    setIsAddingServer(true);
    setEditingServerId(null);
  };

  // Edit existing server
  const handleEditServer = (server: MCPServerConfigType) => {
    setFormData({
      name: server.name,
      command: server.command,
      args: server.args,
      env: server.env || {},
      enabled: server.enabled,
    });
    setFormErrors({});
    setIsAddingServer(false);
    setEditingServerId(server.id);
  };

  // Cancel form
  const handleCancelForm = () => {
    setIsAddingServer(false);
    setEditingServerId(null);
    setFormData({
      name: '',
      command: '',
      args: [],
      env: {},
      enabled: true,
    });
    setFormErrors({});
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = t('errors.invalidConfiguration');
    }

    if (!formData.command.trim()) {
      errors.command = t('errors.invalidConfiguration');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save server
  const handleSaveServer = () => {
    if (!validateForm()) return;

    const serverData = {
      name: formData.name.trim(),
      command: formData.command.trim(),
      args: formData.args,
      env: formData.env,
      enabled: formData.enabled,
    };

    if (editingServerId) {
      updateMCPServer(editingServerId, serverData);
    } else {
      addMCPServer(serverData);
    }

    handleCancelForm();
  };

  // Test connection
  const handleTestConnection = async (serverId: string) => {
    setTestingConnections(prev => new Set(prev).add(serverId));
    
    try {
      const success = await testMCPConnection(serverId);
      setConnectionResults(prev => ({
        ...prev,
        [serverId]: {
          success,
          timestamp: Date.now(),
        }
      }));
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionResults(prev => ({
        ...prev,
        [serverId]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        }
      }));
    } finally {
      setTestingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
    }
  };

  // Handle JSON import
  const handleJsonImport = async () => {
    setImportError('');
    try {
      const success = await importMCPServers(jsonImportText);
      if (success) {
        setJsonImportText('');
        setImportError('');
      } else {
        setImportError(t('errors.invalidConfiguration'));
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card variant="outlined">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('settings.mcpServers')}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('settings.mcpServersDescription')}
              </p>
            </div>
            <Button
              onClick={handleAddServer}
              disabled={isAddingServer || editingServerId !== null}
            >
              {t('settings.addServer')}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Add/Edit Server Form */}
          {(isAddingServer || editingServerId) && (
            <Card variant="outlined" className="mb-6 bg-gray-50 dark:bg-gray-900">
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={t('settings.serverName')}
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="my-mcp-server"
                      error={formErrors.name}
                      fullWidth
                      required
                    />

                    <Input
                      label={t('settings.serverCommand')}
                      value={formData.command}
                      onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                      placeholder="uvx"
                      error={formErrors.command}
                      fullWidth
                      required
                    />
                  </div>

                  <Textarea
                    label={t('settings.serverArgs')}
                    value={JSON.stringify(formData.args, null, 2)}
                    onChange={(e) => {
                      try {
                        const args = JSON.parse(e.target.value);
                        setFormData(prev => ({ ...prev, args: Array.isArray(args) ? args : [] }));
                      } catch {
                        // Keep the text as is for user to fix
                      }
                    }}
                    placeholder='["package@latest", "--arg1", "value1"]'
                    helperText="JSON array of command arguments"
                    rows={3}
                    fullWidth
                  />

                  <Textarea
                    label={t('settings.environmentVariables')}
                    value={JSON.stringify(formData.env, null, 2)}
                    onChange={(e) => {
                      try {
                        const env = JSON.parse(e.target.value);
                        setFormData(prev => ({ ...prev, env: typeof env === 'object' ? env : {} }));
                      } catch {
                        // Keep the text as is for user to fix
                      }
                    }}
                    placeholder='{"ENV_VAR": "value", "ANOTHER_VAR": "value2"}'
                    helperText="JSON object of environment variables"
                    rows={3}
                    fullWidth
                  />

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="server-enabled"
                      checked={formData.enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="server-enabled" className="text-sm text-gray-700 dark:text-gray-300">
                      {t('settings.serverEnabled')}
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={handleCancelForm}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSaveServer}>
                      {editingServerId ? t('common.save') : t('settings.addServer')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* JSON Import Section */}
          <Card variant="outlined" className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Import MCP Configuration</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Import servers from MCP JSON configuration
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  label="MCP Configuration JSON"
                  value={jsonImportText}
                  onChange={(e) => setJsonImportText(e.target.value)}
                  placeholder='{"mcpServers": {"server-name": {"command": "uvx", "args": ["package@latest"]}}}'
                  rows={6}
                  fullWidth
                />
                {importError && (
                  <Alert variant="error">
                    {importError}
                  </Alert>
                )}
                <div className="flex justify-end">
                  <Button 
                    onClick={handleJsonImport}
                    disabled={!jsonImportText.trim()}
                  >
                    Import Servers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Servers List */}
          <div className="space-y-4">
            {mcpServers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>{t('settings.noServersConfigured', 'No MCP servers configured yet.')}</p>
                <p className="text-sm mt-1">
                  Add a server to enable MCP tool calling in your chats.
                </p>
              </div>
            ) : (
              mcpServers.map((server) => (
                <Card key={server.id} variant="outlined" className="hover:shadow-sm transition-shadow">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              server.status === 'connected' ? 'bg-green-500' : 
                              server.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {server.name}
                            </h3>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            server.enabled 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {server.enabled ? t('settings.enable') : t('settings.disable')}
                          </span>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <p>Command: {server.command} {server.args.join(' ')}</p>
                          {Object.keys(server.env || {}).length > 0 && (
                            <p>Environment: {Object.keys(server.env || {}).length} variables</p>
                          )}
                          
                          {/* Connection Test Result */}
                          {connectionResults[server.id] && (
                            <div className={`mt-2 flex items-center space-x-2 text-xs ${
                              connectionResults[server.id].success 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {connectionResults[server.id].success ? (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>{t('settings.connectionSuccessful')}</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                  <span>
                                    {t('settings.connectionFailed')}
                                    {connectionResults[server.id].error && (
                                      <span className="ml-1">: {connectionResults[server.id].error}</span>
                                    )}
                                  </span>
                                </>
                              )}
                              <span className="text-gray-400">
                                ({new Date(connectionResults[server.id].timestamp).toLocaleTimeString()})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(server.id)}
                          loading={testingConnections.has(server.id)}
                          disabled={!server.enabled}
                        >
                          {t('settings.testConnection')}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMCPServer(server.id)}
                        >
                          {server.enabled ? t('settings.disable') : t('settings.enable')}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditServer(server)}
                          disabled={isAddingServer || editingServerId !== null}
                        >
                          {t('common.edit')}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMCPServer(server.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MCPServerConfig;