export interface MCPServer {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  tools?: MCPTool[];
  lastConnected?: Date;
  status: 'connected' | 'disconnected' | 'error';
}

export interface MCPTool {
  name: string;
  description: string;
  serverName?: string; // 添加服务器名称字段
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}



export interface AddMCPServerFormData {
  name: string;
  description: string;
  command: string;
  args: string;
  env: string;
}

export interface EditMCPServerFormData extends AddMCPServerFormData {
  id: string;
}
