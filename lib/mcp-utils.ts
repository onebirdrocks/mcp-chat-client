import { mcpConfigManager, MCPConfig, MCPServerConfig } from './mcp-config';

/**
 * Utility functions for MCP configuration management
 */

/**
 * Initialize MCP configuration system
 * This should be called during application startup
 */
export async function initializeMCPConfig(): Promise<MCPConfig> {
  try {
    // Create default config if it doesn't exist
    await mcpConfigManager.createDefaultConfig();
    
    // Load the configuration
    const config = await mcpConfigManager.loadConfig();
    
    // Start watching for changes
    mcpConfigManager.startWatching();
    
    return config;
  } catch (error) {
    console.error('Failed to initialize MCP configuration:', error);
    throw error;
  }
}

/**
 * Get all MCP server configurations
 */
export async function getAllMCPServers(): Promise<Record<string, MCPServerConfig>> {
  const config = await mcpConfigManager.getConfig();
  return config.mcpServers;
}

/**
 * Get only enabled MCP server configurations
 */
export async function getEnabledMCPServers(): Promise<Record<string, MCPServerConfig>> {
  return await mcpConfigManager.getEnabledServers();
}

/**
 * Get configuration for a specific MCP server
 */
export async function getMCPServerConfig(serverId: string): Promise<MCPServerConfig | null> {
  return await mcpConfigManager.getServerConfig(serverId);
}

/**
 * Check if an MCP server is enabled
 */
export async function isMCPServerEnabled(serverId: string): Promise<boolean> {
  const config = await getMCPServerConfig(serverId);
  return config !== null && !config.disabled;
}

/**
 * Get list of enabled MCP server IDs
 */
export async function getEnabledMCPServerIds(): Promise<string[]> {
  const enabledServers = await getEnabledMCPServers();
  return Object.keys(enabledServers);
}

/**
 * Validate MCP configuration object
 */
export function validateMCPConfig(config: unknown): MCPConfig {
  return mcpConfigManager.validateConfig(config);
}

/**
 * Reload MCP configuration from file
 */
export async function reloadMCPConfig(): Promise<MCPConfig> {
  return await mcpConfigManager.reloadConfig();
}

/**
 * Add a callback to be notified when MCP configuration changes
 */
export function onMCPConfigChange(callback: () => void): void {
  mcpConfigManager.addWatcher(callback);
}

/**
 * Remove a configuration change callback
 */
export function offMCPConfigChange(callback: () => void): void {
  mcpConfigManager.removeWatcher(callback);
}

/**
 * Save MCP configuration to file
 */
export async function saveMCPConfig(config: MCPConfig): Promise<void> {
  return await mcpConfigManager.saveConfig(config);
}

/**
 * Check if MCP configuration file exists
 */
export async function mcpConfigExists(): Promise<boolean> {
  return await mcpConfigManager.configExists();
}

/**
 * Create default MCP configuration if it doesn't exist
 */
export async function createDefaultMCPConfig(): Promise<void> {
  return await mcpConfigManager.createDefaultConfig();
}

/**
 * Get MCP server command and arguments for spawning process
 */
export async function getMCPServerCommand(serverId: string): Promise<{ command: string; args: string[]; env: Record<string, string> } | null> {
  const config = await getMCPServerConfig(serverId);
  if (!config || config.disabled) {
    return null;
  }
  
  return {
    command: config.command,
    args: config.args || [],
    env: config.env || {}
  };
}

/**
 * Get MCP server timeout setting
 */
export async function getMCPServerTimeout(serverId: string): Promise<number> {
  const config = await getMCPServerConfig(serverId);
  return config?.timeout || 30000; // Default 30 seconds
}

/**
 * Get MCP server max concurrency setting
 */
export async function getMCPServerMaxConcurrency(serverId: string): Promise<number> {
  const config = await getMCPServerConfig(serverId);
  return config?.maxConcurrency || 5; // Default 5 concurrent operations
}