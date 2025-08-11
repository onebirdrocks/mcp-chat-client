'use client';

import { useState } from 'react';
import { Plus, Settings, Trash2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, RotateCcw, FileEdit } from 'lucide-react';
import { MCPServer } from '@/types/mcp';
import AddMCPServerModal from './AddMCPServerModal';
import EditMCPServerModal from './EditMCPServerModal';
import EditServersModal from './EditServersModal';
import MCPServerTools from './MCPServerTools';

interface MCPServerListProps {
  servers: MCPServer[];
  onAddServer: (server: Omit<MCPServer, 'id' | 'enabled' | 'tools' | 'lastConnected' | 'status'>) => void;
  onEditServer: (server: MCPServer) => void;
  onToggleServer: (id: string, enabled: boolean) => void;
  onDeleteServer: (id: string) => void;
}

export default function MCPServerList({
  servers,
  onAddServer,
  onEditServer,
  onToggleServer,
  onDeleteServer,
}: MCPServerListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditServersModal, setShowEditServersModal] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [refreshingServer, setRefreshingServer] = useState<Set<string>>(new Set());

  const handleAddServer = (serverData: Record<string, unknown>) => {
    onAddServer({
      name: serverData.name,
      description: serverData.description,
      command: serverData.command,
      args: serverData.args ? serverData.args.split(' ').filter(Boolean) : [],
      env: serverData.env ? JSON.parse(serverData.env) : {},
    });
    setShowAddModal(false);
  };

  const handleEditServer = (serverData: Record<string, unknown>) => {
    if (editingServer) {
      onEditServer({
        ...editingServer,
        name: serverData.name,
        description: serverData.description,
        command: serverData.command,
        args: serverData.args ? serverData.args.split(' ').filter(Boolean) : [],
        env: serverData.env ? JSON.parse(serverData.env) : {},
      });
    }
    setEditingServer(null);
  };



  const handleForceRefresh = async (serverId: string) => {
    setRefreshingServer(prev => new Set(prev).add(serverId));
    try {
      // Call the force refresh API endpoint
      const response = await fetch(`/api/mcp/refresh/${serverId}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.server) {
          onEditServer(result.server);
        }
      }
    } catch (error) {
      console.error('Force refresh failed:', error);
    } finally {
      setRefreshingServer(prev => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
    }
  };

  const handleSaveServersConfig = async (jsonContent: string) => {
    try {
      const response = await fetch('/api/mcp/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jsonContent }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh the page to show updated configuration
          window.location.reload();
        } else {
          throw new Error(result.error || 'Failed to save configuration');
        }
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save servers configuration:', error);
      throw error;
    }
  };

  const getStatusColor = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">MCP Servers</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditServersModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            title="Edit servers configuration JSON"
          >
            <FileEdit className="w-4 h-4" />
            Edit Servers
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Server
          </button>
        </div>
      </div>

      {/* Server List */}
      <div className="space-y-3">
        {servers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No MCP servers configured</p>
            <p className="text-sm mt-2">Click the button above to add your first server</p>
          </div>
        ) : (
          servers.map((server) => (
            <div
              key={server.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              {/* Server Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {getStatusIcon(server.status)}
                    {server.status === 'error' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-medium">{server.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${getStatusColor(server.status)}`}>{getStatusText(server.status)}</p>
                      {server.tools && server.tools.length > 0 && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                          {server.tools.length} tools
                        </span>
                      )}
                      {server.status === 'error' && (
                        <span className="text-xs bg-red-600 text-white px-2 py-1 rounded animate-pulse">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleForceRefresh(server.id)}
                    disabled={refreshingServer.has(server.id)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors disabled:opacity-50 group relative"
                    title="Force refresh connection"
                  >
                    <RotateCcw className={`w-4 h-4 ${refreshingServer.has(server.id) ? 'animate-spin' : ''}`} />
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 dark:bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Force refresh
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setExpandedServer(expandedServer === server.id ? null : server.id)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors group relative"
                    title={expandedServer === server.id ? 'Hide tools' : 'Show tools'}
                  >
                    {expandedServer === server.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 dark:bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {expandedServer === server.id ? 'Hide tools' : 'Show tools'}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => onToggleServer(server.id, !server.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow-md group ${
                      server.enabled 
                        ? 'bg-blue-600 shadow-blue-600/25' 
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    title={server.enabled ? 'Disable server' : 'Enable server'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
                        server.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 dark:bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {server.enabled ? 'Disable server' : 'Enable server'}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setEditingServer(server)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors group relative"
                    title="Edit server"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 dark:bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Edit server
                    </span>
                  </button>
                  
                  <button
                    onClick={() => onDeleteServer(server.id)}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors group relative"
                    title="Delete server"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 dark:bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Delete server
                    </span>
                  </button>
                </div>
              </div>

              {/* Server Details */}
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {server.description && (
                  <p>{server.description}</p>
                )}
                <p>Command: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">{server.command}</code></p>
                {server.args && server.args.length > 0 && (
                  <p>Args: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">{server.args.join(' ')}</code></p>
                )}
                {server.lastConnected && (
                  <p>Last connected: {server.lastConnected.toLocaleString()}</p>
                )}
                {server.enabled && (
                  <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></span>
                    Server is enabled
                  </p>
                )}
              </div>

              {/* Tools Section */}
              {expandedServer === server.id && server.tools && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <MCPServerTools tools={server.tools} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddMCPServerModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddServer}
        />
      )}

      {editingServer && (
        <EditMCPServerModal
          server={editingServer}
          onClose={() => setEditingServer(null)}
          onSubmit={handleEditServer}
        />
      )}

      {showEditServersModal && (
        <EditServersModal
          isOpen={showEditServersModal}
          onClose={() => setShowEditServersModal(false)}
          onSave={handleSaveServersConfig}
        />
      )}
    </div>
  );
}
