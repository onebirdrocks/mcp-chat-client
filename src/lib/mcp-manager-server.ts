import { MCPServer, MCPTool } from '@/types/mcp';
import { DirectMCPClient } from './mcp-client-direct';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface MCPClientWrapper {
  server: MCPServer;
  client: DirectMCPClient; // 统一使用DirectMCPClient
  tools: Record<string, any>;
  isConnected: boolean;
}

export class ServerMCPServerManager {
  private clients: Map<string, MCPClientWrapper> = new Map();
  private configFilePath: string;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 1000; // 1秒

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

      // 只使用标准MCP SDK客户端
      console.log(`🔧 Creating MCP client with command: "${server.command}", args: [${(server.args || []).join(', ')}]`);
      const client = new DirectMCPClient(
        server.command,
        server.args || [],
        { ...process.env, ...server.env || {} }
      );
      await client.connect();

      const rawToolSet = await client.listTools();
      console.log(`🔧 Raw tool set from MCP server:`, JSON.stringify(rawToolSet, null, 2));

      if (rawToolSet && rawToolSet.tools && rawToolSet.tools.length > 0) {
        const processedTools: Record<string, any> = {};

        for (const tool of rawToolSet.tools) {
          console.log(`🔧 Processing tool: ${tool.name}`);
          console.log(`🔧 Tool description: ${tool.description}`);
          console.log(`🔧 Tool inputSchema:`, JSON.stringify(tool.inputSchema, null, 2));

          // 直接修复schema中的数组问题
          const fixedSchema = this.fixSchemaArrays(tool.inputSchema);
          console.log(`🔧 Fixed schema for tool ${tool.name}:`, JSON.stringify(fixedSchema, null, 2));

          const aiSdkToolName = `${server.name}_${tool.name}`;

          processedTools[aiSdkToolName] = {
            name: aiSdkToolName,
            description: tool.description,
            inputSchema: fixedSchema,
            outputSchema: {},
            _originalName: tool.name,
          };
        }

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
          client, // 统一使用DirectMCPClient
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
        // 断开标准MCP客户端
        await clientWrapper.client.disconnect();
        if (clientWrapper.directClient) {
          await clientWrapper.directClient.disconnect();
        }

        this.clients.delete(id);
      }

      console.log(`Disconnected from MCP server: ${server.name}`);
    } catch (error) {
      console.error(`Failed to disconnect from MCP server ${server.name}:`, error);
      throw error;
    }
  }

  // 修复schema中的数组类型问题
  private fixSchemaArrays(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      // 如果没有schema，返回一个空对象schema
      return {
        type: 'object',
        properties: {},
        additionalProperties: false
      };
    }

    // 如果是数组类型但缺少items，添加默认的items
    if (schema.type === 'array' && !schema.items) {
      console.log(`🔧 Fixing array schema missing items`);
      return {
        ...schema,
        items: { type: 'string' }
      };
    }

    // 如果是数组类型且已经有items，递归处理items但保持数组结构
    if (schema.type === 'array' && schema.items) {
      return {
        ...schema,
        items: this.fixSchemaArrays(schema.items)
      };
    }

    // 递归处理对象属性
    if (schema.type === 'object' && schema.properties) {
      const fixedProperties: any = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        fixedProperties[key] = this.fixSchemaArrays(value);
      }
      return {
        ...schema,
        properties: fixedProperties
      };
    }

    // 如果schema没有type，但有properties，假设它是对象类型
    if (!schema.type && schema.properties) {
      return {
        type: 'object',
        ...schema
      };
    }

    // 如果schema没有type也没有properties，返回一个空对象schema
    if (!schema.type && !schema.properties) {
      return {
        type: 'object',
        properties: {},
        additionalProperties: false
      };
    }

    // 对于基本类型（string, number, boolean等），直接返回
    return schema;
  }

  // 处理工具schema的公共方法
  private processToolSchema(tool: any): any {
    console.log(`🔧 Processing schema for tool ${tool.name}:`, JSON.stringify(tool.inputSchema, null, 2));

    const toolParameters = tool.inputSchema?.jsonSchema || tool.inputSchema;
    console.log(`🔧 Tool parameters after jsonSchema check:`, JSON.stringify(toolParameters, null, 2));

    if (!toolParameters) {
      console.log(`🔧 No tool parameters found for tool ${tool.name}`);
      return null;
    }

    // 处理嵌套的schema格式 - AI SDK的MCP实现会将参数包装在value对象中
    let finalParameters = toolParameters;
    if (toolParameters && typeof toolParameters === 'object' && 'properties' in toolParameters &&
      (toolParameters as any).properties && (toolParameters as any).properties.value &&
      (toolParameters as any).properties.value.jsonSchema) {
      finalParameters = (toolParameters as any).properties.value.jsonSchema;
      console.log(`🔧 Extracted nested schema from value wrapper:`, JSON.stringify(finalParameters, null, 2));
    }

    // 修复数组schema问题
    finalParameters = this.fixSchemaArrays(finalParameters);
    console.log(`🔧 Schema after fixing arrays:`, JSON.stringify(finalParameters, null, 2));

    // 验证schema格式
    if (!finalParameters || typeof finalParameters !== 'object' || !('type' in finalParameters) || (finalParameters as any).type !== 'object') {
      console.log(`🔧 Invalid schema format for tool ${tool.name}:`, JSON.stringify(finalParameters, null, 2));
      return null;
    }

    // 检查是否有null值
    const hasNullValues = JSON.stringify(finalParameters).includes('null');
    if (hasNullValues) {
      console.log(`🔧 Schema contains null values for tool ${tool.name}:`, JSON.stringify(finalParameters, null, 2));
      // 移除null值
      finalParameters = JSON.parse(JSON.stringify(finalParameters).replace(/:null/g, ':undefined'));
    }

    console.log(`🔧 Final processed schema for tool ${tool.name}:`, JSON.stringify(finalParameters, null, 2));
    return finalParameters;
  }

  // 获取所有启用的工具，按服务器组织
  getAllEnabledTools(): Record<string, Record<string, any>> {
    const toolsByServer: Record<string, Record<string, any>> = {};

    console.log('🔧 getAllEnabledTools: checking clients...');
    for (const [id, clientWrapper] of this.clients) {
      console.log(`🔧 Client ${id}: connected=${clientWrapper.isConnected}, tools=${clientWrapper.server.tools?.length || 0}`);
      if (clientWrapper.isConnected && clientWrapper.server.tools) {
        const serverName = clientWrapper.server.name;
        toolsByServer[serverName] = {};

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

          // 提取原始工具名称（去掉服务器前缀）
          const originalToolName = tool.name.replace(`${serverName}_`, '');

          // 使用原始工具名称作为键
          toolsByServer[serverName][originalToolName] = {
            type: 'function' as const,
            function: {
              name: originalToolName, // 使用原始工具名称
              description: tool.description ?
                `${tool.description} (Use this tool to ${originalToolName.replace(/_/g, ' ').toLowerCase()})` :
                `Tool: ${originalToolName} - Use this tool to ${originalToolName.replace(/_/g, ' ').toLowerCase()}`,
              parameters: finalParameters
            }
          };
        }
      }
    }

    console.log('🔧 getAllEnabledTools result:', Object.keys(toolsByServer));
    console.log('🔧 Connected clients:', Array.from(this.clients.entries()).map(([id, wrapper]) => ({
      id,
      name: wrapper.server.name,
      isConnected: wrapper.isConnected,
      toolsCount: wrapper.server.tools?.length || 0
    })));
    return toolsByServer;
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
    // 在所有连接的服务器中查找工具
    for (const [id, clientWrapper] of this.clients) {
      if (clientWrapper.isConnected && clientWrapper.server.tools) {
        const tool = clientWrapper.server.tools.find(t => {
          const originalToolName = t.name.replace(`${clientWrapper.server.name}_`, '');
          return originalToolName === toolName;
        });

        if (tool) {
          return {
            toolName: toolName, // 返回原始工具名称
            serverName: clientWrapper.server.name,
            description: tool.description || '',
            inputSchema: tool.inputSchema || {},
            outputSchema: tool.outputSchema || {},
            isConnected: clientWrapper.isConnected
          };
        }
      }
    }

    return null;
  }

  async executeTool(serverName: string, toolName: string, arguments_: Record<string, unknown>): Promise<any> {
    return await this.executeToolWithRetry(serverName, toolName, arguments_, 0);
  }

  private async executeToolWithRetry(serverName: string, toolName: string, arguments_: Record<string, unknown>, retryCount: number): Promise<any> {
    try {
      const clientWrapper = Array.from(this.clients.values()).find(
        c => c.server.name === serverName
      );

      if (!clientWrapper) {
        // 尝试自动连接
        console.log(`🔧 服务器 ${serverName} 未连接，尝试自动连接...`);
        await this.autoReconnectServer(serverName);

        // 重新获取客户端
        const newClientWrapper = Array.from(this.clients.values()).find(
          c => c.server.name === serverName
        );

        if (!newClientWrapper) {
          throw new Error(`No client found for server: ${serverName} after reconnection attempt`);
        }
      }

      const currentClientWrapper = Array.from(this.clients.values()).find(
        c => c.server.name === serverName
      );

      if (!currentClientWrapper || !currentClientWrapper.isConnected) {
        throw new Error(`Client not connected for server: ${serverName}`);
      }

      // 查找实际的工具名称（可能包含服务器前缀）
      const actualTool = currentClientWrapper.server.tools?.find(t => {
        const originalToolName = t.name.replace(`${serverName}_`, '');
        return originalToolName === toolName;
      });

      if (!actualTool) {
        throw new Error(`Tool ${toolName} not found in server ${serverName}`);
      }

      // 提取原始工具名称（不带服务器前缀）
      const originalToolName = actualTool.name.replace(`${serverName}_`, '');

      console.log(`🔧 调用工具 - 服务器: ${serverName}, 原始工具名: ${toolName}, 实际工具名: ${actualTool.name}, MCP调用名: ${originalToolName}`);
      console.log(`🔧 调用工具 - 原始参数:`, JSON.stringify(arguments_, null, 2));

      // AI SDK的MCP实现期望参数被包装在value对象中
      console.log(`🔧 传递给MCP的原始参数:`, JSON.stringify(arguments_, null, 2));

      // 检查工具的原始schema来确定正确的参数格式
      const toolSchema = actualTool.inputSchema;
      console.log(`🔧 工具原始schema:`, JSON.stringify(toolSchema, null, 2));

      // 检查客户端类型和可用方法
      console.log(`🔧 客户端类型:`, typeof currentClientWrapper.client);
      console.log(`🔧 客户端构造函数:`, currentClientWrapper.client.constructor.name);
      console.log(`🔧 客户端方法:`, Object.getOwnPropertyNames(currentClientWrapper.client));

      let finalArguments = arguments_;

      // 如果schema有嵌套的value结构，需要包装参数
      if (toolSchema &&
        toolSchema.jsonSchema &&
        toolSchema.jsonSchema.properties &&
        toolSchema.jsonSchema.properties.value) {
        finalArguments = { value: arguments_ };
        console.log(`🔧 检测到嵌套schema，包装参数:`, JSON.stringify(finalArguments, null, 2));
      } else {
        console.log(`🔧 使用原始参数格式:`, JSON.stringify(finalArguments, null, 2));
      }

      // MCP协议使用原始工具名称（不带服务器前缀）
      const mcpToolName = toolName; // 使用去掉前缀的工具名称
      console.log(`🔧 尝试调用工具: ${mcpToolName} (完整名称: ${actualTool.name})`);
      console.log(`🔧 调用参数:`, JSON.stringify({ name: mcpToolName, arguments: finalArguments }, null, 2));

      // 使用标准MCP客户端调用工具
      console.log(`🔧 使用标准MCP客户端调用工具`);
      const result = await currentClientWrapper.client.callTool(mcpToolName, arguments_);
      console.log(`🔧 标准MCP客户端调用成功!`);
      console.log(`🔧 工具执行成功:`, result);

      // 重置重连计数
      this.reconnectAttempts.delete(serverName);

      return result;

      // 尝试不同的参数传递方式
      const callOptions = [
        // 方式1: 直接传递包装的参数
        { name: originalToolName, arguments: finalArguments },
        // 方式2: 尝试不同的参数结构
        { name: originalToolName, arguments: { ...finalArguments } },
        // 方式3: 尝试JSON序列化后再解析
        { name: originalToolName, arguments: JSON.parse(JSON.stringify(finalArguments)) },
        // 方式4: 如果是嵌套schema，尝试直接传递原始参数
        { name: originalToolName, arguments: arguments_ },
        // 方式5: 尝试展开参数
        { name: originalToolName, ...finalArguments }
      ];

      let lastError;
      for (let i = 0; i < callOptions.length; i++) {
        const option = callOptions[i];
        console.log(`🔧 尝试调用方式 ${i + 1}:`, JSON.stringify(option, null, 2));

        try {
          const result = await currentClientWrapper.client.callTool(option);
          console.log(`🔧 调用方式 ${i + 1} 成功!`);

          // 检查结果是否包含错误
          if (result && result.content && result.content[0] && result.content[0].text) {
            const resultText = result.content[0].text;
            if (resultText.includes('validation error') || resultText.includes('Field required')) {
              console.log(`🔧 调用方式 ${i + 1} 返回验证错误，继续尝试下一种方式`);
              lastError = new Error(resultText);
              continue;
            }
          }

          return result;
        } catch (error) {
          console.log(`🔧 调用方式 ${i + 1} 失败:`, error.message);
          lastError = error;

          // 如果是第一种方式失败，继续尝试其他方式
          if (i < callOptions.length - 1) {
            continue;
          }
        }
      }

      // 如果所有方式都失败，抛出最后一个错误
      throw lastError;

      console.log(`🔧 工具调用成功，结果:`, JSON.stringify(result, null, 2));

      // 重置重连计数
      this.reconnectAttempts.delete(serverName);

      return result;
    } catch (error) {
      console.error(`🔧 Failed to execute tool ${toolName} from server ${serverName}:`, error);
      console.error(`🔧 Error details:`, error);

      // 检查是否是连接相关的错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionError = errorMessage.includes('connection') ||
        errorMessage.includes('disconnected') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('EPIPE');

      // 如果是连接错误且还有重试次数，尝试重新连接
      if (isConnectionError && retryCount < this.maxReconnectAttempts) {
        console.log(`🔧 检测到连接错误，尝试重新连接服务器 ${serverName} (第 ${retryCount + 1} 次重试)`);

        try {
          // 先断开现有连接
          await this._disconnectServer(serverName);

          // 等待一段时间后重新连接
          await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * (retryCount + 1)));

          // 重新连接
          await this.autoReconnectServer(serverName);

          // 递归重试
          return await this.executeToolWithRetry(serverName, toolName, arguments_, retryCount + 1);
        } catch (reconnectError) {
          console.error(`🔧 重新连接失败:`, reconnectError);
          // 如果重连失败，继续抛出原始错误
        }
      }

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
        await clientWrapper.client.disconnect();
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

  // 自动重连服务器
  private async autoReconnectServer(serverName: string): Promise<void> {
    const server = this.getAllServers().find(s => s.name === serverName);
    if (!server) {
      throw new Error(`Server ${serverName} not found in configuration`);
    }

    const currentAttempts = this.reconnectAttempts.get(serverName) || 0;

    if (currentAttempts >= this.maxReconnectAttempts) {
      throw new Error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached for server ${serverName}`);
    }

    console.log(`🔧 自动重连服务器 ${serverName} (第 ${currentAttempts + 1} 次尝试)`);

    try {
      // 更新重连计数
      this.reconnectAttempts.set(serverName, currentAttempts + 1);

      // 尝试连接
      await this._connectServer(server.id);

      console.log(`🔧 服务器 ${serverName} 自动重连成功`);

      // 重连成功，重置计数
      this.reconnectAttempts.delete(serverName);
    } catch (error) {
      console.error(`🔧 服务器 ${serverName} 自动重连失败:`, error);
      throw error;
    }
  }

  // 批量自动连接所有配置的服务器
  async autoConnectAllServers(): Promise<void> {
    const servers = this.getAllServers();
    console.log(`🔧 尝试自动连接 ${servers.length} 个服务器...`);

    const connectionPromises = servers.map(async (server) => {
      try {
        const clientWrapper = this.clients.get(server.id);
        if (!clientWrapper || !clientWrapper.isConnected) {
          console.log(`🔧 自动连接服务器: ${server.name}`);
          await this._connectServer(server.id);
          console.log(`🔧 服务器 ${server.name} 连接成功`);
        } else {
          console.log(`🔧 服务器 ${server.name} 已连接，跳过`);
        }
      } catch (error) {
        console.error(`🔧 自动连接服务器 ${server.name} 失败:`, error);
        // 不抛出错误，继续连接其他服务器
      }
    });

    await Promise.allSettled(connectionPromises);

    const connectedCount = Array.from(this.clients.values()).filter(c => c.isConnected).length;
    console.log(`🔧 自动连接完成，成功连接 ${connectedCount}/${servers.length} 个服务器`);
  }

  // 健康检查和自动重连
  async performHealthCheck(): Promise<{
    totalServers: number;
    connectedServers: number;
    disconnectedServers: string[];
    reconnectionAttempts: Record<string, number>;
  }> {
    const servers = this.getAllServers();
    const disconnectedServers: string[] = [];
    let connectedCount = 0;

    for (const server of servers) {
      const clientWrapper = this.clients.get(server.id);
      if (clientWrapper && clientWrapper.isConnected) {
        connectedCount++;
      } else {
        disconnectedServers.push(server.name);

        // 尝试自动重连断开的服务器
        try {
          console.log(`🔧 健康检查发现服务器 ${server.name} 断开，尝试重连...`);
          await this.autoReconnectServer(server.name);
          connectedCount++;
          // 从断开列表中移除
          const index = disconnectedServers.indexOf(server.name);
          if (index > -1) {
            disconnectedServers.splice(index, 1);
          }
        } catch (error) {
          console.error(`🔧 健康检查重连服务器 ${server.name} 失败:`, error);
        }
      }
    }

    return {
      totalServers: servers.length,
      connectedServers: connectedCount,
      disconnectedServers,
      reconnectionAttempts: Object.fromEntries(this.reconnectAttempts)
    };
  }

  // 重置重连计数
  resetReconnectionAttempts(serverName?: string): void {
    if (serverName) {
      this.reconnectAttempts.delete(serverName);
      console.log(`🔧 重置服务器 ${serverName} 的重连计数`);
    } else {
      this.reconnectAttempts.clear();
      console.log(`🔧 重置所有服务器的重连计数`);
    }
  }

  // 设置重连参数
  setReconnectionConfig(maxAttempts: number, delay: number): void {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectDelay = delay;
    console.log(`🔧 更新重连配置: 最大尝试次数=${maxAttempts}, 延迟=${delay}ms`);
  }
}

export const serverMCPServerManager = new ServerMCPServerManager();
