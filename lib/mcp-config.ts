import { z } from 'zod';
import fs from 'fs/promises';
import { watch, FSWatcher } from 'fs';
import path from 'path';

// Zod schema for individual MCP server configuration
export const MCPServerConfigSchema = z.object({
  command: z.string().min(1, 'Command is required'),
  args: z.array(z.string()).optional().default([]),
  env: z.record(z.string(), z.string()).optional().default({}),
  disabled: z.boolean().optional().default(false),
  timeout: z.number().positive().optional().default(30000), // 30 seconds default
  maxConcurrency: z.number().positive().optional().default(5)
});

// Zod schema for the complete MCP configuration file
export const MCPConfigSchema = z.object({
  mcpServers: z.record(z.string(), MCPServerConfigSchema)
});

// TypeScript types derived from Zod schemas
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type MCPConfig = z.infer<typeof MCPConfigSchema>;

// Configuration manager class
export class MCPConfigManager {
  private static instance: MCPConfigManager;
  private config: MCPConfig | null = null;
  private configPath: string;
  private watchers: Set<() => void> = new Set();
  private fileWatcher: FSWatcher | null = null;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'mcp.config.json');
  }

  public static getInstance(): MCPConfigManager {
    if (!MCPConfigManager.instance) {
      MCPConfigManager.instance = new MCPConfigManager();
    }
    return MCPConfigManager.instance;
  }

  /**
   * Load and validate the MCP configuration from file
   */
  public async loadConfig(): Promise<MCPConfig> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);
      
      // Validate using Zod schema
      const validatedConfig = MCPConfigSchema.parse(parsedConfig);
      
      this.config = validatedConfig;
      console.log(`MCP configuration loaded successfully from ${this.configPath}`);
      
      return validatedConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('MCP configuration validation failed:', error.errors);
        throw new Error(`Invalid MCP configuration: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
      
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(`MCP configuration file not found: ${this.configPath}`);
        throw new Error(`MCP configuration file not found: ${this.configPath}`);
      }
      
      console.error('Failed to load MCP configuration:', error);
      throw new Error(`Failed to load MCP configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current configuration (loads if not already loaded)
   */
  public async getConfig(): Promise<MCPConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!;
  }

  /**
   * Get configuration for a specific server
   */
  public async getServerConfig(serverId: string): Promise<MCPServerConfig | null> {
    const config = await this.getConfig();
    return config.mcpServers[serverId] || null;
  }

  /**
   * Get all enabled server configurations
   */
  public async getEnabledServers(): Promise<Record<string, MCPServerConfig>> {
    const config = await this.getConfig();
    const enabledServers: Record<string, MCPServerConfig> = {};
    
    for (const [serverId, serverConfig] of Object.entries(config.mcpServers)) {
      if (!serverConfig.disabled) {
        enabledServers[serverId] = serverConfig;
      }
    }
    
    return enabledServers;
  }

  /**
   * Validate a configuration object without loading from file
   */
  public validateConfig(config: unknown): MCPConfig {
    return MCPConfigSchema.parse(config);
  }

  /**
   * Save configuration to file
   */
  public async saveConfig(config: MCPConfig): Promise<void> {
    try {
      // Validate before saving
      const validatedConfig = MCPConfigSchema.parse(config);
      
      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });
      
      // Write configuration file
      await fs.writeFile(this.configPath, JSON.stringify(validatedConfig, null, 2), 'utf-8');
      
      this.config = validatedConfig;
      console.log(`MCP configuration saved to ${this.configPath}`);
      
      // Notify watchers
      this.notifyWatchers();
    } catch (error) {
      console.error('Failed to save MCP configuration:', error);
      throw new Error(`Failed to save MCP configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start watching the configuration file for changes
   */
  public startWatching(): void {
    if (this.fileWatcher) {
      return; // Already watching
    }

    try {
      this.fileWatcher = watch(this.configPath, { persistent: false }, async (eventType) => {
        if (eventType === 'change') {
          console.log('MCP configuration file changed, reloading...');
          try {
            await this.loadConfig();
            this.notifyWatchers();
          } catch (error) {
            console.error('Failed to reload MCP configuration:', error);
          }
        }
      });
      
      console.log(`Started watching MCP configuration file: ${this.configPath}`);
    } catch (error) {
      console.error('Failed to start watching MCP configuration file:', error);
    }
  }

  /**
   * Stop watching the configuration file
   */
  public stopWatching(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
      console.log('Stopped watching MCP configuration file');
    }
  }

  /**
   * Add a watcher callback that gets called when configuration changes
   */
  public addWatcher(callback: () => void): void {
    this.watchers.add(callback);
  }

  /**
   * Remove a watcher callback
   */
  public removeWatcher(callback: () => void): void {
    this.watchers.delete(callback);
  }

  /**
   * Notify all watchers of configuration changes
   */
  private notifyWatchers(): void {
    for (const watcher of this.watchers) {
      try {
        watcher();
      } catch (error) {
        console.error('Error in MCP configuration watcher:', error);
      }
    }
  }

  /**
   * Reload configuration from file
   */
  public async reloadConfig(): Promise<MCPConfig> {
    return await this.loadConfig();
  }

  /**
   * Check if configuration file exists
   */
  public async configExists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create default configuration file if it doesn't exist
   */
  public async createDefaultConfig(): Promise<void> {
    if (await this.configExists()) {
      return; // Config already exists
    }

    const defaultConfig: MCPConfig = {
      mcpServers: {
        "filesystem": {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
          env: {},
          disabled: false,
          timeout: 30000,
          maxConcurrency: 5
        }
      }
    };

    await this.saveConfig(defaultConfig);
    console.log('Created default MCP configuration');
  }
}

// Export singleton instance
export const mcpConfigManager = MCPConfigManager.getInstance();