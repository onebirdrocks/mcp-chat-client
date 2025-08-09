/**
 * Example usage of MCPClientManager
 * This file demonstrates how to use the MCP client manager in the application
 */

import { getMCPClientManager, initializeMCPClientManager } from './MCPClientManager';
import { MCPServerConfig } from '@/types';

// Example MCP server configurations
const exampleConfigs: MCPServerConfig[] = [
  {
    id: 'ebook-server',
    name: 'Ebook MCP Server',
    command: 'uv',
    args: ['run', 'src/ebook_mcp/main.py'],
    env: {
      PYTHONPATH: '.',
    },
    enabled: true,
    status: 'disconnected',
  },
  {
    id: 'filesystem-server',
    name: 'Filesystem MCP Server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    enabled: true,
    status: 'disconnected',
  },
];

/**
 * Initialize MCP client manager with server configurations
 */
export async function initializeMCPServers() {
  try {
    console.log('Initializing MCP servers...');
    const manager = await initializeMCPClientManager(exampleConfigs);
    
    // Get connection statuses
    const statuses = manager.getConnectionStatuses();
    console.log('Server connection statuses:', statuses);
    
    // Get all available tools
    const tools = manager.getAllTools();
    console.log(`Found ${tools.length} tools across all servers:`, tools.map(t => t.name));
    
    return manager;
  } catch (error) {
    console.error('Failed to initialize MCP servers:', error);
    throw error;
  }
}

/**
 * Example of executing a tool
 */
export async function executeExampleTool() {
  const manager = getMCPClientManager();
  
  try {
    // List all available tools
    const tools = manager.getAllTools();
    if (tools.length === 0) {
      console.log('No tools available');
      return;
    }
    
    // Execute the first available tool as an example
    const firstTool = tools[0];
    console.log(`Executing tool: ${firstTool.name}`);
    
    const result = await manager.executeTool(firstTool.name, {
      // Example parameters - would depend on the specific tool
      path: '/tmp/example.txt',
    });
    
    console.log('Tool execution result:', result);
    return result;
  } catch (error) {
    console.error('Tool execution failed:', error);
    throw error;
  }
}

/**
 * Example of updating server configurations
 */
export async function updateServerConfigurations() {
  const manager = getMCPClientManager();
  
  // Add a new server configuration
  const updatedConfigs: MCPServerConfig[] = [
    ...exampleConfigs,
    {
      id: 'new-server',
      name: 'New MCP Server',
      command: 'python',
      args: ['new_server.py'],
      enabled: true,
      status: 'disconnected',
    },
  ];
  
  try {
    console.log('Updating server configurations...');
    await manager.updateServerConfigs(updatedConfigs);
    
    const statuses = manager.getConnectionStatuses();
    console.log('Updated server statuses:', statuses);
  } catch (error) {
    console.error('Failed to update server configurations:', error);
    throw error;
  }
}

/**
 * Example of graceful shutdown
 */
export async function shutdownMCPServers() {
  const manager = getMCPClientManager();
  
  try {
    console.log('Shutting down MCP servers...');
    await manager.shutdown();
    console.log('MCP servers shutdown complete');
  } catch (error) {
    console.error('Error during shutdown:', error);
    throw error;
  }
}

// Example usage in an application startup
export async function applicationStartup() {
  try {
    // Initialize MCP servers
    await initializeMCPServers();
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await shutdownMCPServers();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await shutdownMCPServers();
      process.exit(0);
    });
    
    console.log('Application startup complete');
  } catch (error) {
    console.error('Application startup failed:', error);
    process.exit(1);
  }
}