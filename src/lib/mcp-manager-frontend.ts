import { MCPServer, MCPTool } from '@/types/mcp';

class FrontendMCPServerManager {
  // 获取所有服务器
  async getAllServers(): Promise<MCPServer[]> {
    try {
      const response = await fetch('/api/mcp/servers');
      if (response.ok) {
        const data = await response.json();
        return data.servers || [];
      }
    } catch (error) {
      console.error('Failed to get servers:', error);
    }
    return [];
  }

  // 添加服务器
  async addServer(server: Omit<MCPServer, 'id' | 'enabled' | 'tools' | 'lastConnected' | 'status'>): Promise<string> {
    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server)
      });

      if (response.ok) {
        const data = await response.json();
        return data.serverId;
      } else {
        throw new Error('Failed to add server');
      }
    } catch (error) {
      console.error('Failed to add server:', error);
      throw error;
    }
  }

  // 更新服务器
  async updateServer(server: MCPServer): Promise<void> {
    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server)
      });

      if (!response.ok) {
        throw new Error('Failed to update server');
      }
    } catch (error) {
      console.error('Failed to update server:', error);
      throw error;
    }
  }

  // 删除服务器
  async deleteServer(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/mcp/servers?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete server');
      }
    } catch (error) {
      console.error('Failed to delete server:', error);
      throw error;
    }
  }

  // 获取单个服务器
  async getServer(id: string): Promise<MCPServer | undefined> {
    try {
      const servers = await this.getAllServers();
      return servers.find(server => server.id === id);
    } catch (error) {
      console.error('Failed to get server:', error);
      return undefined;
    }
  }

  // 启用/禁用服务器
  async toggleServer(id: string, enabled: boolean): Promise<void> {
    try {
      const response = await fetch('/api/mcp/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: id, enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle server');
      }
    } catch (error) {
      console.error('Failed to toggle server:', error);
      throw error;
    }
  }

  // 获取所有启用的工具
  async getAllEnabledTools(): Promise<Record<string, any>> {
    try {
      const response = await fetch('/api/mcp/tools');
      if (response.ok) {
        const data = await response.json();
        return data.tools || {};
      }
    } catch (error) {
      console.error('Failed to get tools:', error);
    }
    return {};
  }

  // 执行工具调用
  async executeTool(toolName: string, arguments_: Record<string, unknown>): Promise<any> {
    try {
      console.log(`🔧 前端执行工具: ${toolName}`);
      console.log(`🔧 工具参数:`, JSON.stringify(arguments_, null, 2));
      
      const requestBody = {
        toolCalls: [{
          toolName: toolName,
          input: arguments_
        }]
      };
      
      console.log(`🔧 发送请求体:`, JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/mcp/execute-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log(`🔧 响应状态:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🔧 响应数据:`, JSON.stringify(data, null, 2));
        
        if (data.results && data.results[0] && data.results[0].success) {
          return data.results[0].result;
        } else {
          const errorMessage = data.results?.[0]?.error;
          console.log(`🔧 工具执行失败，错误信息:`, errorMessage);
          throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Tool execution failed');
        }
      } else {
        const errorText = await response.text();
        console.log(`🔧 HTTP错误响应:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`🔧 执行工具 ${toolName} 失败:`, error);
      throw error;
    }
  }

  // 检查服务器健康状态
  async checkServerHealth(id: string): Promise<{ status: MCPServer['status']; tools?: MCPTool[] }> {
    try {
      const response = await fetch(`/api/mcp/health/${id}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Failed to check server health:', error);
    }

    return { status: 'disconnected' };
  }

  // 重新加载配置
  async reloadConfig(): Promise<void> {
    try {
      const response = await fetch('/api/mcp/reload-config', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to reload config');
      }
    } catch (error) {
      console.error('Failed to reload config:', error);
      throw error;
    }
  }
}

export const frontendMCPServerManager = new FrontendMCPServerManager();
