'use client';

import { useState, useEffect } from 'react';
import { MCPServer } from '@/types/mcp';
import MCPServerList from '@/components/mcp/MCPServerList';
import { useTheme } from '@/hooks/useTheme';
import ErrorToast from '@/components/ui/ErrorToast';

export default function MCPPage() {
  const { isDarkMode } = useTheme();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load server list from API
    const loadServers = async () => {
      try {
        const response = await fetch('/api/mcp');
        const data = await response.json();
        if (data.servers) {
          setServers(data.servers);
        }
      } catch (error) {
        console.error('Failed to load servers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadServers();
  }, []);

  const handleAddServer = async (serverData: Omit<MCPServer, 'id' | 'enabled' | 'tools' | 'lastConnected' | 'status'>) => {
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add server');
      }
      
      if (result.server) {
        setServers(prev => [...prev, result.server]);
      } else {
        throw new Error('No server data returned');
      }
    } catch (error) {
      console.error('Failed to add server:', error);
      setError(`Failed to add server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditServer = async (server: MCPServer) => {
    try {
      const response = await fetch('/api/mcp', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(server),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update server');
      }
      
      if (result.server) {
        setServers(prev => prev.map(s => s.id === server.id ? result.server : s));
      } else {
        throw new Error('No server data returned');
      }
    } catch (error) {
      console.error('Failed to update server:', error);
      setError(`Failed to update server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggleServer = async (id: string, enabled: boolean) => {
    // Update local state immediately for better UX
    setServers(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
    
    try {
      const response = await fetch('/api/mcp/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, enabled }),
      });
      
      const result = await response.json();
      if (result.server) {
        // Update with server response (includes status, tools, etc.)
        setServers(prev => prev.map(s => s.id === id ? result.server : s));
      }
      
      // If enabling the server, also check health to get tools
      if (enabled) {
        setTimeout(async () => {
          try {
            const healthResponse = await fetch(`/api/mcp/health/${id}`);
            if (healthResponse.ok) {
              const health = await healthResponse.json();
              if (health.server) {
                setServers(prev => prev.map(s => s.id === id ? health.server : s));
              }
            }
          } catch (error) {
            console.error('Failed to get server health:', error);
          }
        }, 1000); // Wait a bit for the server to start
      }
    } catch (error) {
      console.error('Failed to toggle server:', error);
      // Revert on error
      setServers(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s));
    }
  };

  const handleDeleteServer = async (id: string) => {
    try {
      const response = await fetch(`/api/mcp?id=${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete server');
      }
      
      if (result.success) {
        setServers(prev => prev.filter(s => s.id !== id));
      } else {
        throw new Error('Failed to delete server');
      }
    } catch (error) {
      console.error('Failed to delete server:', error);
      setError(`Failed to delete server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };



  if (isLoading) {
    return (
      <div className="max-w-4xl">
        <h1 className={`text-2xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>MCP Settings</h1>
        <div className="flex items-center justify-center py-8">
          <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="space-y-6">
        {/* Server List */}
        <MCPServerList
          servers={servers}
          onAddServer={handleAddServer}
          onEditServer={handleEditServer}
          onToggleServer={handleToggleServer}
          onDeleteServer={handleDeleteServer}
        />
      </div>
      
      {/* Error Toast */}
      {error && (
        <ErrorToast
          message={error}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
}
