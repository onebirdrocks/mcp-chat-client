import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { MCPConfigManager, MCPConfigSchema, MCPServerConfigSchema } from '../mcp-config';
import { validateMCPConfig } from '../mcp-utils';

interface TestConfigManager {
  configPath: string;
  loadConfig: () => Promise<unknown>;
  getServerConfig: (serverId: string) => Promise<unknown>;
  getEnabledServers: () => Promise<Record<string, unknown>>;
}

describe('MCP Configuration System', () => {
  const testConfigPath = path.join(process.cwd(), 'config', 'test-mcp.config.json');
  let configManager: MCPConfigManager;

  beforeEach(() => {
    configManager = MCPConfigManager.getInstance();
  });

  afterEach(async () => {
    // Clean up test config file
    try {
      await fs.unlink(testConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Zod Schema Validation', () => {
    it('should validate a correct MCP server configuration', () => {
      const validServerConfig = {
        command: 'uv',
        args: ['--directory', '/path/to/server', 'run', 'main.py'],
        env: { PYTHONPATH: '/path/to/server' },
        disabled: false,
        timeout: 30000,
        maxConcurrency: 5
      };

      expect(() => MCPServerConfigSchema.parse(validServerConfig)).not.toThrow();
    });

    it('should validate a minimal MCP server configuration', () => {
      const minimalServerConfig = {
        command: 'npx'
      };

      const result = MCPServerConfigSchema.parse(minimalServerConfig);
      expect(result.command).toBe('npx');
      expect(result.args).toEqual([]);
      expect(result.env).toEqual({});
      expect(result.disabled).toBe(false);
      expect(result.timeout).toBe(30000);
      expect(result.maxConcurrency).toBe(5);
    });

    it('should reject invalid MCP server configuration', () => {
      const invalidServerConfig = {
        command: '', // Empty command should fail
        args: ['test'],
        timeout: -1 // Negative timeout should fail
      };

      expect(() => MCPServerConfigSchema.parse(invalidServerConfig)).toThrow();
    });

    it('should validate a complete MCP configuration', () => {
      const validConfig = {
        mcpServers: {
          'test-server': {
            command: 'uv',
            args: ['run', 'main.py'],
            env: { TEST: 'value' }
          },
          'another-server': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp']
          }
        }
      };

      expect(() => MCPConfigSchema.parse(validConfig)).not.toThrow();
    });
  });

  describe('Configuration Loading', () => {
    it('should load and validate configuration from file', async () => {
      const testConfig = {
        mcpServers: {
          'test-server': {
            command: 'echo',
            args: ['hello'],
            env: { TEST: 'value' }
          }
        }
      };

      // Create test config file
      await fs.mkdir(path.dirname(testConfigPath), { recursive: true });
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // Temporarily change config path for testing
      const testManager = configManager as unknown as TestConfigManager;
      const originalConfigPath = testManager.configPath;
      testManager.configPath = testConfigPath;

      try {
        const loadedConfig = await configManager.loadConfig();
        expect(loadedConfig).toEqual({
          mcpServers: {
            'test-server': {
              command: 'echo',
              args: ['hello'],
              env: { TEST: 'value' },
              disabled: false,
              timeout: 30000,
              maxConcurrency: 5
            }
          }
        });
      } finally {
        testManager.configPath = originalConfigPath;
      }
    });

    it('should throw error for invalid configuration file', async () => {
      const invalidConfig = {
        mcpServers: {
          'invalid-server': {
            command: '', // Invalid empty command
            timeout: -1 // Invalid negative timeout
          }
        }
      };

      // Create invalid test config file
      await fs.mkdir(path.dirname(testConfigPath), { recursive: true });
      await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig, null, 2));

      // Temporarily change config path for testing
      const testManager = configManager as unknown as TestConfigManager;
      const originalConfigPath = testManager.configPath;
      testManager.configPath = testConfigPath;

      try {
        await expect(configManager.loadConfig()).rejects.toThrow('Invalid MCP configuration');
      } finally {
        testManager.configPath = originalConfigPath;
      }
    });
  });

  describe('Configuration Utilities', () => {
    it('should validate configuration object', () => {
      const validConfig = {
        mcpServers: {
          'test-server': {
            command: 'echo',
            args: ['test']
          }
        }
      };

      expect(() => validateMCPConfig(validConfig)).not.toThrow();
    });

    it('should reject invalid configuration object', () => {
      const invalidConfig = {
        mcpServers: {
          'test-server': {
            command: '', // Invalid empty command
          }
        }
      };

      expect(() => validateMCPConfig(invalidConfig)).toThrow();
    });
  });

  describe('Server Configuration Access', () => {
    beforeEach(async () => {
      const testConfig = {
        mcpServers: {
          'enabled-server': {
            command: 'echo',
            args: ['enabled'],
            disabled: false
          },
          'disabled-server': {
            command: 'echo',
            args: ['disabled'],
            disabled: true
          }
        }
      };

      // Create test config file
      await fs.mkdir(path.dirname(testConfigPath), { recursive: true });
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

      // Temporarily change config path for testing
      const testManager = configManager as unknown as TestConfigManager;
      testManager.configPath = testConfigPath;
      
      await configManager.loadConfig();
    });

    it('should get specific server configuration', async () => {
      const serverConfig = await configManager.getServerConfig('enabled-server');
      expect(serverConfig).toBeDefined();
      expect(serverConfig?.command).toBe('echo');
      expect(serverConfig?.args).toEqual(['enabled']);
    });

    it('should return null for non-existent server', async () => {
      const serverConfig = await configManager.getServerConfig('non-existent');
      expect(serverConfig).toBeNull();
    });

    it('should get only enabled servers', async () => {
      const enabledServers = await configManager.getEnabledServers();
      expect(Object.keys(enabledServers)).toEqual(['enabled-server']);
      expect(enabledServers['disabled-server']).toBeUndefined();
    });
  });
});