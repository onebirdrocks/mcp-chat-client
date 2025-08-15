import { MCPServer, MCPTool } from '@/types/mcp';
import { experimental_createMCPClient, jsonSchema } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { normalizeToObjectSchema } from './normalizeToObjectSchema';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface MCPClientWrapper {
  server: MCPServer;
  client: any;
  tools: Record<string, any>;
  isConnected: boolean;
}

export class ServerMCPServerManager {
  private clients: Map<string, MCPClientWrapper> = new Map();
  private configFilePath: string;

  constructor() {
    this.configFilePath = join(process.cwd(), '.mcp-servers.json');
  }

  // 直接从配置文件读取服务器列表
  getAllServers(): MCPServer[] {
    try {
      if (existsSync(this.configFilePath)) {
        const data = readFileSync(this.configFilePath, 'utf-8');
        const config = JSON.parse(data);
        
        if (config.mcpServers && typeof config.mcpServers === 'object') {
          const servers = Object.entries(config.mcpServers).map(([name, serverConfig]: [string, any]) => {
            const clientWrapper = this.clients.get(name);
            return {
              id: name, // 直接使用服务器名称作为 ID
              name,
              command: serverConfig.command,
              args: serverConfig.args || [],
              env: serverConfig.env || {},
              enabled: true,
              tools: clientWrapper?.server.tools || [],
              status: (clientWrapper?.isConnected ? 'connected' : 'disconnected') as 'connected' | 'disconnected' | 'error'
            };
          });
          
          // 检查重复的服务器名称
          const names = servers.map(s => s.name);
          const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
          if (duplicates.length > 0) {
            console.error(`Duplicate server names found: ${duplicates.join(', ')}`);
            throw new Error(`Duplicate server names: ${duplicates.join(', ')}`);
          }
          
          return servers;
        }
      }
    } catch (error) {
      console.error('Failed to load MCP servers configuration:', error);
    }
    return [];
  }

  // 获取单个服务器
  getServer(id: string): MCPServer | undefined {
    return this.getAllServers().find(server => server.id === id);
  }

  // 根据服务器名称获取服务器配置和工具信息
  async getServerConfigByName(serverName: string): Promise<{
    server: MCPServer;
    tools: MCPTool[];
    isConnected: boolean;
    clientWrapper?: MCPClientWrapper;
  } | null> {
    const server = this.getAllServers().find(s => s.name === serverName);
    if (!server) {
      return null;
    }

    const clientWrapper = this.clients.get(server.id);
    const isConnected = clientWrapper?.isConnected || false;
    const tools = clientWrapper?.server.tools || [];

    return {
      server,
      tools,
      isConnected,
      clientWrapper
    };
  }

  // 保存配置到文件
  private saveConfigToFile(config: { mcpServers: Record<string, any> }): void {
    try {
      writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('Configuration saved to file:', this.configFilePath);
    } catch (error) {
      console.error('Failed to save configuration to file:', error);
      throw error;
    }
  }

  // 从 JSON 保存配置
  async saveConfigFromJson(config: { mcpServers: Record<string, any> }): Promise<void> {
    // 验证配置结构
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      throw new Error('Invalid configuration structure. Expected "mcpServers" object.');
    }

    // 保存配置到文件
    this.saveConfigToFile(config);
    
    // 重新加载配置
    await this.reloadConfig();
  }

  // 添加服务器（需要修改配置文件）
  async addServer(server: Omit<MCPServer, 'id' | 'enabled' | 'tools' | 'lastConnected' | 'status'>): Promise<string> {
    // 检查是否已存在同名服务器
    const existingServers = this.getAllServers();
    const existingServer = existingServers.find(s => s.name === server.name);
    if (existingServer) {
      throw new Error(`Server with name '${server.name}' already exists`);
    }
    
    // 读取当前配置
    let currentConfig: { mcpServers: Record<string, any> } = { mcpServers: {} };
    if (existsSync(this.configFilePath)) {
      try {
        const data = readFileSync(this.configFilePath, 'utf-8');
        currentConfig = JSON.parse(data);
      } catch (error) {
        console.error('Failed to read existing config:', error);
      }
    }
    
    // 添加新服务器到配置
    currentConfig.mcpServers[server.name] = {
      command: server.command,
      args: server.args || [],
      env: server.env || {}
    };
    
    // 保存配置到文件
    this.saveConfigToFile(currentConfig);
    
    return server.name;
  }

  // 更新服务器（需要修改配置文件）
  async updateServer(server: MCPServer): Promise<void> {
    // 读取当前配置
    let currentConfig: { mcpServers: Record<string, any> } = { mcpServers: {} };
    if (existsSync(this.configFilePath)) {
      try {
        const data = readFileSync(this.configFilePath, 'utf-8');
        currentConfig = JSON.parse(data);
      } catch (error) {
        console.error('Failed to read existing config:', error);
        throw error;
      }
    }
    
    // 检查服务器是否存在
    if (!currentConfig.mcpServers[server.name]) {
      throw new Error(`Server with name '${server.name}' not found`);
    }
    
    // 更新服务器配置
    currentConfig.mcpServers[server.name] = {
      command: server.command,
      args: server.args || [],
      env: server.env || {}
    };
    
    // 保存配置到文件
    this.saveConfigToFile(currentConfig);
  }

  // 删除服务器（需要修改配置文件）
  async deleteServer(id: string): Promise<void> {
    // 读取当前配置
    let currentConfig: { mcpServers: Record<string, any> } = { mcpServers: {} };
    if (existsSync(this.configFilePath)) {
      try {
        const data = readFileSync(this.configFilePath, 'utf-8');
        currentConfig = JSON.parse(data);
      } catch (error) {
        console.error('Failed to read existing config:', error);
        throw error;
      }
    }
    
    // 查找服务器名称
    const serverName = Object.keys(currentConfig.mcpServers).find(name => name === id);
    if (!serverName) {
      throw new Error(`Server with ID '${id}' not found`);
    }
    
    // 删除服务器配置
    delete currentConfig.mcpServers[serverName];
    
    // 保存配置到文件
    this.saveConfigToFile(currentConfig);
    
    // 断开连接
    await this.disconnectServer(id);
  }

  async toggleServer(id: string, enabled: boolean): Promise<{ tools?: MCPTool[] }> {
    const server = this.getServer(id);
    if (!server) {
      throw new Error('Server not found');
    }

    if (enabled) {
      await this.connectServer(id);
      const clientWrapper = this.clients.get(id);
      return { tools: clientWrapper?.server.tools };
    } else {
      await this.disconnectServer(id);
      return {};
    }
  }

  private async _connectServer(id: string): Promise<void> {
    const server = this.getServer(id);
    if (!server) return;

    try {
      console.log(`Connecting to MCP server: ${server.name}`);
      
      const client = await experimental_createMCPClient({
        transport: new Experimental_StdioMCPTransport({
          command: server.command,
          args: server.args || [],
          env: server.env || {},
        }),
      });

      const rawToolSet = await client.tools();
      
      if (rawToolSet && Object.keys(rawToolSet).length > 0) {
        const processedTools: Record<string, any> = Object.fromEntries(
          Object.entries(rawToolSet).map(([name, tool]) => {
            const rawSchema = (tool as any).inputSchema?.schema ?? (tool as any).inputSchema ?? null;
            const normalized = normalizeToObjectSchema(rawSchema);
            const inputSchema = jsonSchema(normalized);
            
            const aiSdkToolName = `${server.name}_${name}`;
            
            return [
              aiSdkToolName,
              {
                ...tool,
                inputSchema,
                _originalName: `${server.name}_${name}`,
              },
            ];
          })
        );

        const clientWrapper: MCPClientWrapper = {
          server: {
            ...server,
            tools: Object.keys(processedTools).map(name => ({
              name,
              description: processedTools[name].description,
              inputSchema: processedTools[name].inputSchema,
              outputSchema: processedTools[name].outputSchema
            })),
            status: 'connected',
            lastConnected: new Date()
          },
          client,
          tools: processedTools,
          isConnected: true
        };
        
        this.clients.set(id, clientWrapper);
        console.log(`Successfully connected to MCP server: ${server.name} (${Object.keys(processedTools).length} tools)`);
      } else {
        throw new Error('No tools returned from server');
      }
    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.name}:`, error);
      throw error;
    }
  }

  private async _disconnectServer(id: string): Promise<void> {
    const server = this.getServer(id);
    if (!server) return;

    try {
      const clientWrapper = this.clients.get(id);
      if (clientWrapper) {
        await clientWrapper.client.close();
        this.clients.delete(id);
      }
      
      console.log(`Disconnected from MCP server: ${server.name}`);
    } catch (error) {
      console.error(`Failed to disconnect from MCP server ${server.name}:`, error);
      throw error;
    }
  }

  // 处理工具schema的公共方法
  private processToolSchema(tool: any): any {
    const toolParameters = tool.inputSchema?.jsonSchema || tool.inputSchema;
    
    if (!toolParameters) {
      return null;
    }
    
    // 处理嵌套的schema格式 - 如果parameters有value.jsonSchema结构，提取内部的schema
    let finalParameters = toolParameters;
    if (toolParameters && typeof toolParameters === 'object' && 'properties' in toolParameters && 
        (toolParameters as any).properties && (toolParameters as any).properties.value && 
        (toolParameters as any).properties.value.jsonSchema) {
      finalParameters = (toolParameters as any).properties.value.jsonSchema;
    }
    
    // 验证schema格式
    if (!finalParameters || typeof finalParameters !== 'object' || !('type' in finalParameters) || (finalParameters as any).type !== 'object') {
      return null;
    }
    
    return finalParameters;
  }

  getAllEnabledTools(): Record<string, any> {
    const allTools: Record<string, any> = {};
    
    console.log('🔧 getAllEnabledTools: checking clients...');
    for (const [id, clientWrapper] of this.clients) {
      console.log(`🔧 Client ${id}: connected=${clientWrapper.isConnected}, tools=${clientWrapper.server.tools?.length || 0}`);
      if (clientWrapper.isConnected && clientWrapper.server.tools) {
        for (const tool of clientWrapper.server.tools) {
          // 调试：查看工具的inputSchema结构
          console.log(`🔧 Tool ${tool.name} inputSchema:`, JSON.stringify(tool.inputSchema, null, 2));

          // 使用公共方法处理schema
          const finalParameters = this.processToolSchema(tool);
          
          if (!finalParameters) {
            console.warn(`🔧 Tool ${tool.name} has invalid schema, skipping`);
            continue;
          }
          
          console.log(`🔧 Tool ${tool.name} processed parameters:`, JSON.stringify(finalParameters, null, 2));
          
          allTools[tool.name] = {
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description ?
                `${tool.description} (Use this tool to ${tool.name.replace(/_/g, ' ').toLowerCase()})` :
                `Tool: ${tool.name} - Use this tool to ${tool.name.replace(/_/g, ' ').toLowerCase()}`,
              parameters: finalParameters
            }
          };
        }
      }
    }
    
    console.log('🔧 getAllEnabledTools result:', Object.keys(allTools));
    console.log('🔧 Sample tool format:', Object.values(allTools)[0]);
    console.log('🔧 Connected clients:', Array.from(this.clients.entries()).map(([id, wrapper]) => ({
      id,
      name: wrapper.server.name,
      isConnected: wrapper.isConnected,
      toolsCount: wrapper.server.tools?.length || 0
    })));
    return allTools;
  }

  // 获取所有工具的 metadata
  getAllToolsMetadata(): Array<{
    toolName: string;
    serverName: string;
    description: string;
    inputSchema: any;
    outputSchema: any;
    isConnected: boolean;
  }> {
    const toolsMetadata: Array<{
      toolName: string;
      serverName: string;
      description: string;
      inputSchema: any;
      outputSchema: any;
      isConnected: boolean;
    }> = [];

    for (const [id, clientWrapper] of this.clients) {
      const serverName = clientWrapper.server.name;
      const isConnected = clientWrapper.isConnected;

      if (isConnected && clientWrapper.server.tools?.length) {
        for (const tool of clientWrapper.server.tools!) {
          // 使用公共方法处理schema
          const processedInputSchema = this.processToolSchema(tool) || tool.inputSchema || {};
          
          toolsMetadata.push({
            toolName: tool.name,
            serverName,
            description: tool.description || '',
            inputSchema: processedInputSchema,
            outputSchema: tool.outputSchema || {},
            isConnected
          });
        }
      }
    }

    return toolsMetadata;
  }

  // 根据工具名称获取工具的 metadata
  getToolMetadata(toolName: string): {
    toolName: string;
    serverName: string;
    description: string;
    inputSchema: any;
    outputSchema: any;
    isConnected: boolean;
  } | null {
    const serverName = toolName.split('_')[0];
    
    const clientWrapper = Array.from(this.clients.values()).find(
      c => c.server.name === serverName
    );

    if (!clientWrapper || !clientWrapper.isConnected) {
      return null;
    }

    const tool = clientWrapper.server.tools?.find(t => t.name === toolName);
    if (!tool) {
      return null;
    }

    return {
      toolName: tool.name,
      serverName,
      description: tool.description || '',
      inputSchema: tool.inputSchema || {},
      outputSchema: tool.outputSchema || {},
      isConnected: clientWrapper.isConnected
    };
  }

  async executeTool(toolName: string, arguments_: Record<string, unknown>): Promise<any> {
    const serverName = toolName.split('_')[0];
    
    const clientWrapper = Array.from(this.clients.values()).find(
      c => c.server.name === serverName
    );
    
    if (!clientWrapper) {
      throw new Error(`No client found for server: ${serverName}`);
    }
    
    if (!clientWrapper.isConnected) {
      throw new Error(`Client not connected for server: ${serverName}`);
    }
    
    const originalToolName = toolName.replace(`${serverName}_`, '');
    
    console.log(`🔧 调用工具 - 原始工具名: ${originalToolName}`);
    console.log(`🔧 调用工具 - 参数:`, JSON.stringify(arguments_, null, 2));
    
    try {
      // 根据MCP协议，callTool需要提供name和arguments
      const result = await clientWrapper.client.callTool(originalToolName, { 
        name: originalToolName,
        arguments: arguments_ 
      });
      console.log(`🔧 工具调用成功，结果:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error(`🔧 Failed to execute tool ${toolName}:`, error);
      console.error(`🔧 Error details:`, error);
      // 确保错误是字符串
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(errorMessage);
    }
  }

  async checkServerHealth(id: string): Promise<{ status: MCPServer['status']; tools?: MCPTool[] }> {
    const server = this.getServer(id);
    if (!server) {
      return { status: 'disconnected' };
    }

    const clientWrapper = this.clients.get(id);
    if (clientWrapper && clientWrapper.isConnected) {
      return { 
        status: 'connected', 
        tools: clientWrapper.server.tools 
      };
    } else {
      return { status: 'disconnected' };
    }
  }

  // 获取配置文件路径
  getConfigFilePath(): string {
    return this.configFilePath;
  }

  // 重新加载配置（清除所有连接）
  async reloadConfig(): Promise<void> {
    // 断开所有连接
    for (const [id, clientWrapper] of this.clients) {
      try {
        await clientWrapper.client.close();
      } catch (error) {
        console.error(`Error closing client ${id}:`, error);
      }
    }
    this.clients.clear();
    console.log('Configuration reloaded, all connections cleared');
  }

  // 连接指定服务器
  async connectServer(serverId: string): Promise<void> {
    await this._connectServer(serverId);
  }

  // 断开指定服务器连接
  async disconnectServer(serverId: string): Promise<void> {
    await this._disconnectServer(serverId);
  }

  // 强制刷新指定服务器
  async forceRefreshServer(serverId: string): Promise<void> {
    const server = this.getServer(serverId);
    if (!server) {
      throw new Error(`Server with ID '${serverId}' not found`);
    }

    console.log(`Force refreshing server: ${server.name}`);
    
    // 断开现有连接
    await this._disconnectServer(serverId);
    
    // 重新连接
    await this._connectServer(serverId);
    
    console.log(`Server ${server.name} refreshed successfully`);
  }

  // 获取服务器状态
  getServerStatus(): Array<{
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    tools: MCPTool[];
    lastConnected?: Date;
  }> {
    const servers = this.getAllServers();
    return servers.map(server => {
      const clientWrapper = this.clients.get(server.id);
      return {
        id: server.id,
        name: server.name,
        status: clientWrapper?.isConnected ? 'connected' : 'disconnected',
        tools: clientWrapper?.server.tools || [],
        lastConnected: clientWrapper?.server.lastConnected
      };
    });
  }

  // 获取工具到服务器的映射
  getToolToServerMap(): Record<string, string> {
    const toolToServerMap: Record<string, string> = {};
    
    for (const [id, clientWrapper] of this.clients) {
      if (clientWrapper.isConnected && clientWrapper.server.tools) {
        for (const tool of clientWrapper.server.tools) {
          toolToServerMap[tool.name] = clientWrapper.server.name;
        }
      }
    }
    
    return toolToServerMap;
  }

  // 获取健康的服务器
  getHealthyServers(): Array<{
    id: string;
    name: string;
    tools: MCPTool[];
  }> {
    const healthyServers: Array<{
      id: string;
      name: string;
      tools: MCPTool[];
    }> = [];
    
    for (const [id, clientWrapper] of this.clients) {
      if (clientWrapper.isConnected) {
        healthyServers.push({
          id: clientWrapper.server.id,
          name: clientWrapper.server.name,
          tools: clientWrapper.server.tools || []
        });
      }
    }
    
    return healthyServers;
  }
}

export const serverMCPServerManager = new ServerMCPServerManager();
