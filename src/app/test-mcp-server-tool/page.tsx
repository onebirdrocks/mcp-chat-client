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
        const toolsResponse = await fetch('/api/mcp/tools');
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          console.log('All tools loaded:', toolsData.tools?.map((t: any) => t.toolName));
          console.log('First tool structure:', toolsData.tools?.[0]);
          setTools(toolsData.tools || []);
          setAvailableTools(toolsData.tools || []);
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
      const responseData = await response.json();
      console.log('Connect response data:', responseData);
      
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
        const toolsResponse = await fetch('/api/mcp/tools');
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          console.log('Tools response data:', toolsData);
          console.log('Tools after connection:', toolsData.tools?.map((t: any) => t.toolName));
          console.log('First tool after connection:', toolsData.tools?.[0]);
          setTools(toolsData.tools || []);
          setAvailableTools(toolsData.tools || []);
        }
      } else {
        console.error('Failed to connect server:', responseData);
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
        const toolsResponse = await fetch('/api/mcp/tools');
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          setTools(toolsData.tools || []);
          setAvailableTools(toolsData.tools || []);
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
        const errorData = await response.json();
        alert(`添加服务器失败: ${errorData.error}`);
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
      const parsedConfig = JSON.parse(configJson);
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
            
            if (toolsResponse.ok) {
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
        const errorData = await response.json();
        alert(`保存配置失败: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('保存配置失败');
    }
  };

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
      // 检查可用工具
      console.log('Available tools:', availableTools);
      console.log('Available tools details:', availableTools.map(tool => ({
        name: tool.toolName,
        serverName: tool.serverName,
        description: tool.description
      })));
      
      // 检查是否有相关的电子书工具
      const ebookTools = availableTools.filter(tool => 
        tool.toolName.includes('get_all_') && 
        (tool.toolName.includes('pdf') || tool.toolName.includes('epub'))
      );
      console.log('Ebook tools:', ebookTools);
      console.log('Selected provider:', selectedProvider);
      console.log('Selected model:', selectedModel);

      // 调用模型进行工具调用
      const response = await simplifiedToolCallClient.callModelWithTools(
        selectedProvider,
        selectedModel,
        userMessage.content,
        messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      );

      console.log('Model response:', response);

      // 处理API返回的格式
      const result = response.result || response;
      const content = result.text || result.content || '抱歉，我无法处理这个请求。';
      const toolCalls = result.toolCalls || [];
      
      console.log('Result:', result);
      console.log('Content:', content);
      console.log('Tool calls:', toolCalls);
      console.log('Tool calls length:', toolCalls.length);

      if (toolCalls && toolCalls.length > 0) {
        // 有工具调用，等待用户确认
        setCurrentToolCalls(toolCalls);
        setCurrentToolStatus('pending');
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: content || '我需要使用一些工具来帮助你。请确认以下工具调用：',
          timestamp: new Date(),
          toolCalls: toolCalls,
          toolStatus: 'pending'
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // 没有工具调用，直接显示回复
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: content,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误。请重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolCallsConfirmed = async (toolCalls: ToolCall[]) => {
    setCurrentToolStatus('executing');
    
    try {
      // 执行工具调用
      const results = await simplifiedToolCallClient.executeToolCalls(toolCalls);
      setCurrentToolResults(results);
      setCurrentToolStatus('completed');

      // 更新消息中的工具结果
      setMessages(prev => prev.map(msg => 
        msg.toolCalls ? { ...msg, toolResults: results, toolStatus: 'completed' } : msg
      ));

      // 继续对话
      const lastMessage = messages[messages.length - 1];
      const response = await simplifiedToolCallClient.continueConversationWithToolResults(
        selectedProvider,
        selectedModel,
        '请基于工具执行结果继续回答用户的问题。',
        messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        results
      );

      console.log('Continue conversation response:', response);

      // 处理API返回的格式
      const result = response.result || response;
      const content = result.text || result.content || '工具执行完成。';

      const finalMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: content,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, finalMessage]);
    } catch (error) {
      console.error('Failed to execute tool calls:', error);
      setCurrentToolStatus('failed');
    }
  };

  const handleToolCallsCancelled = () => {
    setCurrentToolStatus('cancelled');
    setCurrentToolCalls([]);
    setCurrentToolResults([]);
  };

  const handleSingleToolExecuted = async (toolCall: ToolCall) => {
    try {
      const result = await simplifiedToolCallClient.executeToolCalls([toolCall]);
      setCurrentToolResults(prev => [...prev, ...result]);
    } catch (error) {
      console.error('Failed to execute single tool:', error);
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
                  // 重新加载数据
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
                      
                      if (toolsResponse.ok) {
                        const toolsData = await toolsResponse.json();
                        console.log('Tools after refresh:', toolsData.tools?.map((t: any) => t.toolName));
                        setTools(toolsData.tools || []);
                        setAvailableTools(toolsData.tools || []);
                      }
                    } catch (error) {
                      console.error('Failed to reload data:', error);
                    } finally {
                      setIsLoadingServers(false);
                      setIsLoadingTools(false);
                    }
                  };
                  loadData();
                }}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                刷新
        </button>
            </div>
      </div>

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
