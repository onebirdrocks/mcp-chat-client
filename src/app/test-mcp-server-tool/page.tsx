'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import LLMProviderSelector from '@/components/chat/LLMProviderSelector';
import ModelSelector from '@/components/chat/ModelSelector';
import InlineToolCallConfirmation from '@/components/chat/InlineToolCallConfirmation';
import { ToolCall, ToolCallResult } from '@/lib/tool-call-client-simplified';
import { simplifiedToolCallClient } from '@/lib/tool-call-client-simplified';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolCallResult[];
  toolStatus?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
}

interface MCPServer {
  name: string;
  description?: string;
  command: string;
  args?: string;
  env?: Record<string, string>;
}

interface Tool {
  toolName: string;
  serverName: string;
  description?: string;
  inputSchema?: any;
  outputSchema?: any;
}

// 工具卡片组件
const ToolCard = ({ tool, isDarkMode }: { tool: Tool; isDarkMode: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`p-3 rounded border ${
        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-medium text-sm break-words">{tool.toolName}</div>
          {tool.description && (
            <div className={`text-xs mt-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {tool.description}
            </div>
          )}
        </div>
        {tool.inputSchema && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`ml-2 p-1 rounded text-xs ${
              isDarkMode 
                ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
            title={isExpanded ? '收起参数' : '展开参数'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
      </div>
      
      {isExpanded && tool.inputSchema && (
        <div className={`mt-2 p-2 rounded text-xs ${
          isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
        }`}>
          <div className="font-medium mb-1">参数信息:</div>
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(tool.inputSchema, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// 添加服务器表单组件
const AddServerForm = ({ 
  onSubmit, 
  onCancel, 
  isDarkMode 
}: { 
  onSubmit: (data: { name: string; description?: string; command: string; args?: string; env?: string }) => void;
  onCancel: () => void;
  isDarkMode: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    command: '',
    args: '',
    env: ''
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={`block text-sm font-medium mb-1 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          服务器名称 *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
          placeholder="例如: my-server"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          描述
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
          placeholder="服务器描述（可选）"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          命令 *
        </label>
        <input
          type="text"
          value={formData.command}
          onChange={(e) => setFormData({ ...formData, command: e.target.value })}
          required
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
          placeholder="例如: python -m my_mcp_server"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          参数
        </label>
        <input
          type="text"
          value={formData.args}
          onChange={(e) => setFormData({ ...formData, args: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
          placeholder="例如: --port 8000 --host localhost"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium mb-1 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          环境变量 (JSON)
        </label>
        <textarea
          value={formData.env}
          onChange={(e) => setFormData({ ...formData, env: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
          placeholder='{"API_KEY": "your-api-key", "DEBUG": "true"}'
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'bg-gray-600 text-white hover:bg-gray-500'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          取消
        </button>
        <button
          type="submit"
          className={`px-4 py-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          添加
        </button>
      </div>
    </form>
  );
};

export default function TestMCPServerToolPage() {
  const { isDarkMode } = useTheme();
  
  // MCP服务器管理状态
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [serverStatus, setServerStatus] = useState<Record<string, boolean>>({});
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  
  // 添加服务器和编辑配置状态
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [showEditConfigModal, setShowEditConfigModal] = useState(false);
  const [configJson, setConfigJson] = useState('');
  
  // 健康检查和自动重连状态
  const [isPerformingHealthCheck, setIsPerformingHealthCheck] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  
  // 工具调用状态
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);
  const [currentToolResults, setCurrentToolResults] = useState<ToolCallResult[]>([]);
  const [currentToolStatus, setCurrentToolStatus] = useState<'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'>('pending');
  const [pendingToolCallConfirmation, setPendingToolCallConfirmation] = useState<{
    resolve: (confirmed: boolean) => void;
    toolCalls: ToolCall[];
  } | null>(null);

  // 加载MCP服务器和工具
  useEffect(() => {
    const loadServersAndTools = async () => {
      setIsLoadingServers(true);
      setIsLoadingTools(true);
      
      try {
        // 加载服务器列表
        const serversResponse = await fetch('/api/mcp');
        if (serversResponse.ok) {
          const serversData = await serversResponse.json();
          setServers(serversData.servers || []);
        }

        // 加载服务器状态
        const statusResponse = await fetch('/api/mcp/server-status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          // 将serverStatus数组转换为以服务器名为键的对象
          const statusMap: Record<string, boolean> = {};
          if (statusData.data && statusData.data.serverStatus) {
            statusData.data.serverStatus.forEach((server: any) => {
              statusMap[server.name] = server.status === 'connected';
            });
          }
          setServerStatus(statusMap);
        }

        // 加载工具列表
        try {
          const toolsResponse = await fetch('/api/mcp/tools');
          if (toolsResponse && toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            console.log('All tools loaded:', toolsData.tools?.map((t: any) => t.toolName));
            console.log('First tool structure:', toolsData.tools?.[0]);
            setTools(toolsData.tools || []);
            setAvailableTools(toolsData.tools || []);
          }
        } catch (toolsError) {
          console.error('Failed to load tools:', toolsError);
        }
      } catch (error) {
        console.error('Failed to load servers and tools:', error);
      } finally {
        setIsLoadingServers(false);
        setIsLoadingTools(false);
      }
    };

    loadServersAndTools();
  }, []);

  // MCP服务器管理功能
  const handleConnectServer = async (serverName: string) => {
    try {
      console.log('Connecting to server:', serverName);
      const response = await fetch(`/api/mcp/connect/${serverName}`, {
        method: 'POST'
      });
      
      console.log('Connect response status:', response.status);
      
      let responseData;
      try {
        responseData = await response.json();
        console.log('Connect response data:', responseData);
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError);
        responseData = null;
      }
      
      if (response.ok) {
        console.log('Server connected successfully, reloading status and tools...');
        
        // 重新加载状态
        const statusResponse = await fetch('/api/mcp/server-status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('Status response data:', statusData);
          // 将serverStatus数组转换为以服务器名为键的对象
          const statusMap: Record<string, boolean> = {};
          if (statusData.data && statusData.data.serverStatus) {
            statusData.data.serverStatus.forEach((server: any) => {
              statusMap[server.name] = server.status === 'connected';
            });
          }
          console.log('Status map:', statusMap);
          setServerStatus(statusMap);
        }
        
        // 重新加载工具
        try {
          const toolsResponse = await fetch('/api/mcp/tools');
          if (toolsResponse && toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            console.log('Tools response data:', toolsData);
            console.log('Tools after connection:', toolsData.tools?.map((t: any) => t.toolName));
            console.log('First tool after connection:', toolsData.tools?.[0]);
            setTools(toolsData.tools || []);
            setAvailableTools(toolsData.tools || []);
          }
        } catch (toolsError) {
          console.error('Failed to reload tools:', toolsError);
        }
      } else {
        console.error('Failed to connect server:', responseData || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to connect server:', error);
    }
  };

  const handleDisconnectServer = async (serverName: string) => {
    try {
      const response = await fetch(`/api/mcp/disconnect/${serverName}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // 重新加载状态
        const statusResponse = await fetch('/api/mcp/server-status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          // 将serverStatus数组转换为以服务器名为键的对象
          const statusMap: Record<string, boolean> = {};
          if (statusData.data && statusData.data.serverStatus) {
            statusData.data.serverStatus.forEach((server: any) => {
              statusMap[server.name] = server.status === 'connected';
            });
          }
          setServerStatus(statusMap);
        }
        
        // 重新加载工具
        try {
          const toolsResponse = await fetch('/api/mcp/tools');
          if (toolsResponse && toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            setTools(toolsData.tools || []);
            setAvailableTools(toolsData.tools || []);
          }
        } catch (toolsError) {
          console.error('Failed to reload tools:', toolsError);
        }
      }
    } catch (error) {
      console.error('Failed to disconnect server:', error);
    }
  };

  // 添加服务器处理函数
  const handleAddServer = async (serverData: {
    name: string;
    description?: string;
    command: string;
    args?: string;
    env?: string;
  }) => {
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverData),
      });

      if (response.ok) {
        setShowAddServerModal(false);
        // 重新加载服务器列表
        const serversResponse = await fetch('/api/mcp');
        if (serversResponse.ok) {
          const serversData = await serversResponse.json();
          setServers(serversData.servers || []);
        }
      } else {
        try {
          const errorData = await response.json();
          alert(`添加服务器失败: ${errorData.error}`);
        } catch (jsonError) {
          alert(`添加服务器失败: HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Failed to add server:', error);
      alert('添加服务器失败');
    }
  };

  // 编辑配置处理函数
  const handleEditConfig = async () => {
    try {
      const response = await fetch('/api/mcp/raw-config');
      if (response.ok) {
        const configData = await response.json();
        setConfigJson(JSON.stringify(configData, null, 2));
        setShowEditConfigModal(true);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      alert('加载配置失败');
    }
  };

  const handleSaveConfig = async () => {
    try {
      // 验证JSON格式
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(configJson);
      } catch (parseError) {
        alert('配置JSON格式无效，请检查语法');
        return;
      }
      
      const response = await fetch('/api/mcp/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jsonContent: configJson }),
      });

      if (response.ok) {
        setShowEditConfigModal(false);
        // 重新加载所有数据
        const loadData = async () => {
          try {
            const [serversResponse, statusResponse, toolsResponse] = await Promise.all([
              fetch('/api/mcp'),
              fetch('/api/mcp/server-status'),
              fetch('/api/mcp/tools')
            ]);
            
            if (serversResponse.ok) {
              const serversData = await serversResponse.json();
              setServers(serversData.servers || []);
            }
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              const statusMap: Record<string, boolean> = {};
              if (statusData.data && statusData.data.serverStatus) {
                statusData.data.serverStatus.forEach((server: any) => {
                  statusMap[server.name] = server.status === 'connected';
                });
              }
              setServerStatus(statusMap);
            }
            
            if (toolsResponse && toolsResponse.ok) {
              const toolsData = await toolsResponse.json();
              setTools(toolsData.tools || []);
              setAvailableTools(toolsData.tools || []);
            }
          } catch (error) {
            console.error('Failed to reload data:', error);
          }
        };
        loadData();
      } else {
        try {
          const errorData = await response.json();
          alert(`保存配置失败: ${errorData.error}`);
        } catch (jsonError) {
          alert(`保存配置失败: HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('保存配置失败');
    }
  };

  // 健康检查处理函数
  const handleHealthCheck = async () => {
    setIsPerformingHealthCheck(true);
    try {
      const response = await fetch('/api/mcp/health-check');
      if (response.ok) {
        const result = await response.json();
        setHealthStatus(result.data);
        console.log('健康检查结果:', result.data);
        
        // 重新加载服务器状态和工具
        await reloadServerData();
      } else {
        try {
          const errorData = await response.json();
          alert(`健康检查失败: ${errorData.error}`);
        } catch (jsonError) {
          alert(`健康检查失败: HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error('健康检查失败:', error);
      alert('健康检查失败');
    } finally {
      setIsPerformingHealthCheck(false);
    }
  };

  // 自动连接所有服务器
  const handleAutoConnectAll = async () => {
    setIsPerformingHealthCheck(true);
    try {
      const response = await fetch('/api/mcp/health-check', {
        method: 'POST'
      });
      if (response.ok) {
        const result = await response.json();
        setHealthStatus(result.data);
        console.log('自动连接结果:', result.data);
        
        // 重新加载服务器状态和工具
        await reloadServerData();
      } else {
        try {
          const errorData = await response.json();
          alert(`自动连接失败: ${errorData.error}`);
        } catch (jsonError) {
          alert(`自动连接失败: HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error('自动连接失败:', error);
      alert('自动连接失败');
    } finally {
      setIsPerformingHealthCheck(false);
    }
  };

  // 重置重连计数
  const handleResetReconnection = async (serverName?: string) => {
    try {
      const response = await fetch('/api/mcp/reset-reconnection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverName }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('重置重连计数成功:', result.message);
        // 可以显示成功消息
      } else {
        try {
          const errorData = await response.json();
          alert(`重置重连计数失败: ${errorData.error}`);
        } catch (jsonError) {
          alert(`重置重连计数失败: HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error('重置重连计数失败:', error);
      alert('重置重连计数失败');
    }
  };

  // 重新加载服务器数据的公共函数
  const reloadServerData = async () => {
    try {
      const [serversResponse, statusResponse, toolsResponse] = await Promise.all([
        fetch('/api/mcp'),
        fetch('/api/mcp/server-status'),
        fetch('/api/mcp/tools')
      ]);
      
      if (serversResponse.ok) {
        const serversData = await serversResponse.json();
        setServers(serversData.servers || []);
      }
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const statusMap: Record<string, boolean> = {};
        if (statusData.data && statusData.data.serverStatus) {
          statusData.data.serverStatus.forEach((server: any) => {
            statusMap[server.name] = server.status === 'connected';
          });
        }
        setServerStatus(statusMap);
      }
      
      if (toolsResponse && toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        setTools(toolsData.tools || []);
        setAvailableTools(toolsData.tools || []);
      }
    } catch (error) {
      console.error('Failed to reload server data:', error);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!message.trim() || !selectedProvider || !selectedModel) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // 使用startConversationLoop来自动处理MCP工具调用
      await simplifiedToolCallClient.startConversationLoop(
        selectedProvider,
        selectedModel,
        userMessage.content,
        // onMessage - 处理AI回复
        (messageText: string) => {
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: messageText,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
        },
        // onToolCallsDetected - 请求用户确认工具调用
        async (toolCalls: any[]) => {
          console.log('🔧 工具调用确认 - 原始数据:', JSON.stringify(toolCalls, null, 2));
          
          // 创建包含工具调用的助手消息
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'AI想要执行以下工具调用，请确认是否执行：',
            timestamp: new Date(),
            toolCalls: toolCalls,
            toolStatus: 'pending'
          };
          setMessages(prev => [...prev, assistantMessage]);
          
          // 等待用户通过InlineToolCallConfirmation确认
          return new Promise((resolve) => {
            // 设置待确认的工具调用
            setPendingToolCallConfirmation({
              resolve,
              toolCalls
            });
          });
        },
        // onToolResults - 处理工具执行结果
        (results: any[]) => {
          const successfulResults = results.filter(r => r.success);
          const failedResults = results.filter(r => !r.success);
          
          let resultMessage = '';
          if (successfulResults.length > 0) {
            resultMessage += `✅ 成功执行 ${successfulResults.length} 个工具:\n\n`;
            successfulResults.forEach(r => {
              const toolName = r.toolName || r.toolCallId || '未知工具';
              resultMessage += `**${toolName}** 执行结果:\n`;
              
              // 显示实际的工具执行结果
              if (r.result) {
                try {
                  if (typeof r.result === 'object' && r.result !== null) {
                    if (r.result.content && Array.isArray(r.result.content)) {
                      // MCP工具返回格式
                      const content = r.result.content.map((item: any) => item.text || item).join('\n');
                      resultMessage += `${content}\n`;
                    } else if (r.result.structuredContent && r.result.structuredContent.result) {
                      // 结构化内容
                      const content = Array.isArray(r.result.structuredContent.result) 
                        ? r.result.structuredContent.result.join('\n')
                        : JSON.stringify(r.result.structuredContent.result, null, 2);
                      resultMessage += `${content}\n`;
                    } else {
                      resultMessage += `${JSON.stringify(r.result, null, 2)}\n`;
                    }
                  } else {
                    resultMessage += `${String(r.result)}\n`;
                  }
                } catch (error) {
                  resultMessage += `结果格式化错误: ${error}\n`;
                }
              } else {
                resultMessage += `执行成功，但无返回结果\n`;
              }
              resultMessage += '\n';
            });
          }
          
          if (failedResults.length > 0) {
            resultMessage += `\n❌ 失败 ${failedResults.length} 个工具:\n`;
            failedResults.forEach(r => {
              const toolName = r.toolName || r.toolCallId || '未知工具';
              resultMessage += `• ${toolName}: ${r.error || '未知错误'}\n`;
            });
          }
          
          const toolResultMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: resultMessage || '工具执行完成',
            timestamp: new Date(),
            toolResults: results
          };
          setMessages(prev => [...prev, toolResultMessage]);
        },
        // onError - 处理错误
        (error: Error) => {
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ 对话循环出错: ${error.message}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ 发送消息失败: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolCallsConfirmed = async (toolCalls: ToolCall[], sendToLLM: boolean = true) => {
    console.log('🔧 工具调用已确认:', toolCalls);
    
    // 如果有待确认的工具调用，解析Promise
    if (pendingToolCallConfirmation) {
      pendingToolCallConfirmation.resolve(true);
      setPendingToolCallConfirmation(null);
    }
    
    setCurrentToolStatus('executing');
    setCurrentToolCalls(toolCalls);
    setCurrentToolResults([]);

    try {
      // 执行工具调用
      const results = await simplifiedToolCallClient.executeToolCalls(toolCalls);
      console.log('🔧 工具执行结果:', results);
      
      setCurrentToolResults(results);
      setCurrentToolStatus(results.some(r => !r.success) ? 'failed' : 'completed');

      // 更新消息中的工具结果
      setMessages(prev => prev.map(msg => {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          return { 
            ...msg, 
            toolResults: results,
            toolStatus: results.some(r => !r.success) ? 'failed' : 'completed'
          };
        }
        return msg;
      }));

      // 如果需要发送给LLM，继续对话
      if (sendToLLM) {
        await continueConversationWithResults(results);
      }
    } catch (error) {
      console.error('🔧 工具执行失败:', error);
      setCurrentToolStatus('failed');
      
      // 更新消息状态
      setMessages(prev => prev.map(msg => {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          return { ...msg, toolStatus: 'failed' };
        }
        return msg;
      }));
    }
  };

  const handleToolCallsCancelled = () => {
    console.log('🔧 工具调用已取消');
    
    // 如果有待确认的工具调用，解析Promise
    if (pendingToolCallConfirmation) {
      pendingToolCallConfirmation.resolve(false);
      setPendingToolCallConfirmation(null);
    }
    
    setCurrentToolStatus('cancelled');
    setCurrentToolCalls([]);
    setCurrentToolResults([]);
  };

  const continueConversationWithResults = async (results: ToolCallResult[]) => {
    try {
      // 获取所有工具结果
      const allToolResults = results.length > 0 ? results : 
        messages.flatMap(msg => msg.toolResults || []);
      
      console.log('All tool results for LLM:', allToolResults);
      
      if (allToolResults.length === 0) {
        console.warn('No tool results found, skipping LLM call');
        const finalMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '工具执行完成，但没有获取到结果。',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, finalMessage]);
        return;
      }
      
      // 创建新的助手消息用于流式显示
      const assistantMessageId = Date.now().toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // 继续对话，发送结果给LLM（使用流式响应）
      const response = await simplifiedToolCallClient.continueConversationWithToolResults(
        selectedProvider,
        selectedModel,
        '请基于工具执行结果继续回答用户的问题。',
        messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        allToolResults
      );

      console.log('Continue conversation response:', response);

      // 处理流式响应
      if (response.result && response.result.text) {
        // 更新助手消息的内容
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: response.result.text }
            : msg
        ));
      } else {
        // 如果没有获取到内容，显示默认消息
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: '基于工具执行结果的分析已完成。' }
            : msg
        ));
      }
    } catch (error) {
      console.error('Failed to continue conversation with tool results:', error);
      
      // 添加错误消息
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '处理工具结果时出现错误，请重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSingleToolExecuted = async (toolCall: ToolCall) => {
    try {
      console.log('Executing single tool:', toolCall);
      const result = await simplifiedToolCallClient.executeToolCalls([toolCall]);
      console.log('Tool execution result:', result);
      
      // 更新当前工具结果
      setCurrentToolResults(prev => [...prev, ...result]);
      
      // 更新消息中的工具结果
      setMessages(prev => prev.map(msg => {
        if (msg.toolCalls && msg.toolCalls.some(tc => tc.id === toolCall.id)) {
          const existingResults = msg.toolResults || [];
          const newResults = [...existingResults, ...result];
          return { ...msg, toolResults: newResults };
        }
        return msg;
      }));
    } catch (error) {
      console.error('Failed to execute single tool:', error);
      
      // 添加错误结果
      const errorResult = {
        toolCallId: toolCall.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setCurrentToolResults(prev => [...prev, errorResult]);
      
      // 更新消息中的错误结果
      setMessages(prev => prev.map(msg => {
        if (msg.toolCalls && msg.toolCalls.some(tc => tc.id === toolCall.id)) {
          const existingResults = msg.toolResults || [];
          const newResults = [...existingResults, errorResult];
          return { ...msg, toolResults: newResults };
        }
        return msg;
      }));
    }
  };

  const canSendMessage = message.trim() && selectedProvider && selectedModel;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">MCP服务器工具测试</h1>
        
        {/* MCP服务器管理区域 */}
        <div className={`mb-6 p-4 rounded-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">MCP服务器管理</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddServerModal(true)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isDarkMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                添加服务器
              </button>
              <button
                onClick={handleEditConfig}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isDarkMode
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
              >
                编辑配置
              </button>
              <button 
                onClick={() => {
                  setIsLoadingServers(true);
                  setIsLoadingTools(true);
                  reloadServerData().finally(() => {
                    setIsLoadingServers(false);
                    setIsLoadingTools(false);
                  });
                }}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                刷新
              </button>
              <button
                onClick={handleHealthCheck}
                disabled={isPerformingHealthCheck}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isPerformingHealthCheck
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {isPerformingHealthCheck ? '检查中...' : '健康检查'}
              </button>
              <button
                onClick={handleAutoConnectAll}
                disabled={isPerformingHealthCheck}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isPerformingHealthCheck
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {isPerformingHealthCheck ? '连接中...' : '自动连接'}
              </button>
              <button
                onClick={() => handleResetReconnection()}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isDarkMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                重置重连
              </button>
            </div>
      </div>

          {/* 健康状态显示 */}
          {healthStatus && (
            <div className={`mb-4 p-3 rounded-lg border ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
            }`}>
              <h3 className="text-md font-medium mb-2">系统健康状态</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    总服务器数:
                  </span>
                  <span className="ml-1">{healthStatus.totalServers}</span>
                </div>
                <div>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    已连接:
                  </span>
                  <span className={`ml-1 ${
                    healthStatus.connectedServers === healthStatus.totalServers 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }`}>
                    {healthStatus.connectedServers}
                  </span>
                </div>
                <div>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    断开连接:
                  </span>
                  <span className={`ml-1 ${
                    healthStatus.disconnectedServers.length > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {healthStatus.disconnectedServers.length}
                  </span>
                </div>
                <div>
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    重连尝试:
                  </span>
                  <span className="ml-1">
                    {Object.keys(healthStatus.reconnectionAttempts).length}
                  </span>
                </div>
              </div>
              {healthStatus.disconnectedServers.length > 0 && (
                <div className="mt-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    断开的服务器:
                  </span>
                  <span className="ml-1 text-sm text-red-600">
                    {healthStatus.disconnectedServers.join(', ')}
                  </span>
                </div>
              )}
              {Object.keys(healthStatus.reconnectionAttempts).length > 0 && (
                <div className="mt-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    重连尝试次数:
                  </span>
                  <div className="ml-1 text-sm">
                    {Object.entries(healthStatus.reconnectionAttempts).map(([server, attempts]) => (
                      <span key={server} className="mr-3">
                        {server}: {attempts as number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 服务器列表 */}
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">服务器列表</h3>
            {isLoadingServers ? (
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                加载中...
              </div>
            ) : servers.length === 0 ? (
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                没有配置的MCP服务器
        </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server) => (
                  <div
                    key={server.name}
                    className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                  <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{server.name}</h4>
                    <div className="flex items-center gap-2">
                        {serverStatus[server.name] && (
                          <span className={`px-2 py-1 text-xs rounded ${
                            isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {(() => {
                              const serverTools = tools.filter(tool => tool.serverName === server.name);
                              console.log(`Server ${server.name} tools:`, serverTools.map(t => t.toolName));
                              return serverTools.length;
                            })()} 个工具
                      </span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            serverStatus[server.name]
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {serverStatus[server.name] ? '已连接' : '未连接'}
                      </span>
                      </div>
                    </div>
                    {server.description && (
                      <p className={`text-sm mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {server.description}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {serverStatus[server.name] ? (
                        <button
                          onClick={() => handleDisconnectServer(server.name)}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          断开连接
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnectServer(server.name)}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          连接
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 可用工具列表 */}
                    <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-medium">可用工具</h3>
              {tools.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                    共 {tools.length} 个工具
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                  }`}>
                    {Object.keys(tools.reduce((acc, tool) => {
                      acc[tool.serverName] = true;
                      return acc;
                    }, {} as Record<string, boolean>)).length} 个服务器
                  </span>
                </div>
              )}
            </div>
            {isLoadingTools ? (
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                加载中...
              </div>
            ) : tools.length === 0 ? (
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                没有可用的工具，请先连接MCP服务器
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // 按服务器名称分组工具
                  const toolsByServer: Record<string, Tool[]> = {};
                  tools.forEach(tool => {
                    if (!toolsByServer[tool.serverName]) {
                      toolsByServer[tool.serverName] = [];
                    }
                    toolsByServer[tool.serverName].push(tool);
                  });

                  return Object.entries(toolsByServer).map(([serverName, serverTools]) => (
                    <div key={serverName} className={`p-3 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">{serverName}</h4>
                        <span className={`px-2 py-1 text-xs rounded ${
                          isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {serverTools.length} 个工具
                          </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {serverTools.map((tool, index) => (
                          <ToolCard key={index} tool={tool} isDarkMode={isDarkMode} />
                        ))}
                      </div>
                    </div>
                  ));
                })()}
                    </div>
                  )}
                </div>
        </div>

        {/* 模型选择区域 */}
        <div className={`mb-6 p-4 rounded-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <h2 className="text-lg font-semibold mb-4">模型设置</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                LLM Provider
              </label>
              <LLMProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                模型
              </label>
              <ModelSelector
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
            </div>

          {/* 可用工具信息 */}
          <div className="mt-4">
            <div className={`flex items-center gap-2 text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <span>可用MCP工具: {isLoadingTools ? '加载中...' : `${availableTools.length} 个`}</span>
              {availableTools.length > 0 && (
                <span className={`px-2 py-1 text-xs rounded ${
                  isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                }`}>
                  来自 {Object.keys(serverStatus).filter(name => serverStatus[name]).length} 个已连接服务器
                </span>
              )}
            </div>
            {availableTools.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTools.slice(0, 10).map((tool, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-xs rounded ${
                      isDarkMode 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {tool.toolName}
                  </span>
                ))}
                {availableTools.length > 10 && (
                  <span className={`px-2 py-1 text-xs rounded ${
                    isDarkMode 
                      ? 'bg-gray-700 text-gray-300' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    +{availableTools.length - 10} 更多
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 对话区域 */}
        <div className={`mb-6 rounded-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-lg font-semibold">对话</h2>
      </div>

          <div className="h-96 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className={`text-center py-8 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                开始对话吧！选择模型后输入消息。
              </div>
            ) : (
      <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? isDarkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="text-sm">{msg.content}</div>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mt-2">
                          <InlineToolCallConfirmation
                            toolCalls={msg.toolCalls}
                            toolResults={msg.toolResults}
                            onConfirm={handleToolCallsConfirmed}
                            onCancel={handleToolCallsCancelled}
                            onExecuteSingle={handleSingleToolExecuted}
                            isWaitingForLLM={isLoading}
                          />
                        </div>
                      )}
                      <div className={`text-xs mt-2 ${
                        msg.role === 'user'
                          ? 'text-blue-100'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
      </div>

        {/* 输入区域 */}
        <div className={`flex gap-2 p-4 rounded-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              !selectedProvider || !selectedModel
                ? "请先选择LLM Provider和模型..."
                : "输入你的消息，模型将自动选择合适的MCP工具..."
            }
            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            disabled={!selectedProvider || !selectedModel || isLoading}
              />
              <button 
            onClick={handleSendMessage}
            disabled={!canSendMessage || isLoading}
            className={`px-4 py-2 rounded-lg transition-colors ${
              canSendMessage && !isLoading
                ? isDarkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
          
      {/* 添加服务器模态框 */}
      {showAddServerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg max-w-md w-full mx-4 ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <h3 className="text-lg font-semibold mb-4">添加MCP服务器</h3>
            <AddServerForm
              onSubmit={handleAddServer}
              onCancel={() => setShowAddServerModal(false)}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}

      {/* 编辑配置模态框 */}
      {showEditConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto ${
            isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}>
            <h3 className="text-lg font-semibold mb-4">编辑MCP配置</h3>
            <div className="mb-4">
              <textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className={`w-full h-96 p-3 border rounded-lg font-mono text-sm ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
                placeholder="输入JSON配置..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditConfigModal(false)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-600 text-white hover:bg-gray-500'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                取消
              </button>
          <button 
                onClick={handleSaveConfig}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                保存
          </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
