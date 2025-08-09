'use client'

import React, { useState, useEffect } from 'react'
import { MCPServerConfig as MCPServerConfigType, MCPTool } from '../../lib/types'

interface MCPServerConfigProps {
  language?: 'en' | 'zh'
}

interface MCPServerStatus {
  serverId: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  lastCheck: Date
  responseTime?: number
  error?: string
  toolCount: number
  uptime?: number
}

interface MCPConfigData {
  mcpServers: Record<string, MCPServerConfigType>
}

export default function MCPServerConfig({ language = 'en' }: MCPServerConfigProps) {
  const [servers, setServers] = useState<Record<string, MCPServerConfigType>>({})
  const [serverStatuses, setServerStatuses] = useState<Record<string, MCPServerStatus>>({})
  const [serverTools, setServerTools] = useState<Record<string, MCPTool[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingServer, setEditingServer] = useState<string | null>(null)
  const [editingConfig, setEditingConfig] = useState<string>('')
  const [showAddServer, setShowAddServer] = useState(false)
  const [newServerConfig, setNewServerConfig] = useState({
    id: '',
    command: '',
    args: [] as string[],
    env: {} as Record<string, string>,
    disabled: false,
    timeout: 30000,
    maxConcurrency: 5
  })
  const [testingConnection, setTestingConnection] = useState<string | null>(null)

  // Localized text
  const text = language === 'zh' ? {
    mcpServers: 'MCP 服务器',
    serverConfiguration: 'MCP 服务器配置',
    addServer: '添加服务器',
    editServer: '编辑服务器',
    deleteServer: '删除服务器',
    testConnection: '测试连接',
    enableServer: '启用服务器',
    disableServer: '禁用服务器',
    serverStatus: '服务器状态',
    availableTools: '可用工具',
    connectionStatus: '连接状态',
    lastCheck: '最后检查',
    responseTime: '响应时间',
    uptime: '运行时间',
    toolCount: '工具数量',
    serverDetails: '服务器详情',
    command: '命令',
    arguments: '参数',
    environment: '环境变量',
    timeout: '超时时间',
    maxConcurrency: '最大并发',
    serverId: '服务器ID',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    test: '测试',
    enable: '启用',
    disable: '禁用',
    refresh: '刷新',
    connected: '已连接',
    disconnected: '已断开',
    error: '错误',
    connecting: '连接中',
    healthy: '健康',
    unhealthy: '不健康',
    unknown: '未知',
    noServers: '未配置服务器',
    noTools: '无可用工具',
    configurationEditor: '配置编辑器',
    jsonConfiguration: 'JSON 配置',
    invalidJson: '无效的 JSON 格式',
    serverAdded: '服务器已添加',
    serverUpdated: '服务器已更新',
    serverDeleted: '服务器已删除',
    connectionTested: '连接已测试',
    errorOccurred: '发生错误',
    confirmDelete: '确认删除',
    deleteConfirmation: '确定要删除服务器 "{name}" 吗？此操作无法撤销。',
    troubleshooting: '故障排除',
    troubleshootingTips: '故障排除提示',
    checkCommand: '检查命令路径是否正确',
    checkArgs: '验证参数格式',
    checkEnv: '确认环境变量设置',
    checkPermissions: '检查文件权限',
    viewLogs: '查看日志',
    reconnect: '重新连接',
    ms: '毫秒',
    seconds: '秒',
    minutes: '分钟',
    hours: '小时',
    days: '天'
  } : {
    mcpServers: 'MCP Servers',
    serverConfiguration: 'MCP Server Configuration',
    addServer: 'Add Server',
    editServer: 'Edit Server',
    deleteServer: 'Delete Server',
    testConnection: 'Test Connection',
    enableServer: 'Enable Server',
    disableServer: 'Disable Server',
    serverStatus: 'Server Status',
    availableTools: 'Available Tools',
    connectionStatus: 'Connection Status',
    lastCheck: 'Last Check',
    responseTime: 'Response Time',
    uptime: 'Uptime',
    toolCount: 'Tool Count',
    serverDetails: 'Server Details',
    command: 'Command',
    arguments: 'Arguments',
    environment: 'Environment Variables',
    timeout: 'Timeout',
    maxConcurrency: 'Max Concurrency',
    serverId: 'Server ID',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    test: 'Test',
    enable: 'Enable',
    disable: 'Disable',
    refresh: 'Refresh',
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
    connecting: 'Connecting',
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    unknown: 'Unknown',
    noServers: 'No servers configured',
    noTools: 'No tools available',
    configurationEditor: 'Configuration Editor',
    jsonConfiguration: 'JSON Configuration',
    invalidJson: 'Invalid JSON format',
    serverAdded: 'Server added',
    serverUpdated: 'Server updated',
    serverDeleted: 'Server deleted',
    connectionTested: 'Connection tested',
    errorOccurred: 'An error occurred',
    confirmDelete: 'Confirm Delete',
    deleteConfirmation: 'Are you sure you want to delete server "{name}"? This action cannot be undone.',
    troubleshooting: 'Troubleshooting',
    troubleshootingTips: 'Troubleshooting Tips',
    checkCommand: 'Check if command path is correct',
    checkArgs: 'Verify argument format',
    checkEnv: 'Confirm environment variable settings',
    checkPermissions: 'Check file permissions',
    viewLogs: 'View Logs',
    reconnect: 'Reconnect',
    ms: 'ms',
    seconds: 'seconds',
    minutes: 'minutes',
    hours: 'hours',
    days: 'days'
  }

  // Load server configurations and statuses
  useEffect(() => {
    loadServers()
    loadServerStatuses()
    loadServerTools()
  }, [])

  const loadServers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/mcp-servers')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data: MCPConfigData = await response.json()
      setServers(data.mcpServers || {})
    } catch (err) {
      console.error('Failed to load MCP servers:', err)
      setError(err instanceof Error ? err.message : 'Failed to load servers')
    } finally {
      setLoading(false)
    }
  }

  const loadServerStatuses = async () => {
    try {
      const response = await fetch('/api/settings/mcp-servers/status')
      if (response.ok) {
        const statuses = await response.json()
        setServerStatuses(statuses)
      }
    } catch (err) {
      console.error('Failed to load server statuses:', err)
    }
  }

  const loadServerTools = async () => {
    try {
      const response = await fetch('/api/settings/mcp-servers/tools')
      if (response.ok) {
        const tools = await response.json()
        setServerTools(tools)
      }
    } catch (err) {
      console.error('Failed to load server tools:', err)
    }
  }

  const saveServer = async (serverId: string, config: MCPServerConfigType) => {
    try {
      const response = await fetch('/api/settings/mcp-servers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, config })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      await loadServers()
      await loadServerStatuses()
      setEditingServer(null)
      setShowAddServer(false)
      
      // Show success message
      setError(null)
    } catch (err) {
      console.error('Failed to save server:', err)
      setError(err instanceof Error ? err.message : 'Failed to save server')
    }
  }

  const deleteServer = async (serverId: string) => {
    if (!confirm(text.deleteConfirmation.replace('{name}', serverId))) {
      return
    }

    try {
      const response = await fetch(`/api/settings/mcp-servers/${serverId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      await loadServers()
      await loadServerStatuses()
    } catch (err) {
      console.error('Failed to delete server:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete server')
    }
  }

  const testConnection = async (serverId: string) => {
    try {
      setTestingConnection(serverId)
      const response = await fetch(`/api/settings/mcp-servers/${serverId}/test`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Refresh statuses after test
      await loadServerStatuses()
      await loadServerTools()
      
      setError(null)
    } catch (err) {
      console.error('Failed to test connection:', err)
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setTestingConnection(null)
    }
  }

  const toggleServerEnabled = async (serverId: string, enabled: boolean) => {
    const server = servers[serverId]
    if (!server) return

    await saveServer(serverId, { ...server, disabled: !enabled })
  }

  const startEditingServer = (serverId: string) => {
    const server = servers[serverId]
    if (server) {
      setEditingServer(serverId)
      setEditingConfig(JSON.stringify({
        command: server.command,
        args: server.args || [],
        env: server.env || {},
        disabled: server.disabled || false,
        timeout: server.timeout || 30000,
        maxConcurrency: server.maxConcurrency || 5
      }, null, 2))
    }
  }

  const saveEditedServer = async () => {
    if (!editingServer) return

    try {
      const config = JSON.parse(editingConfig)
      await saveServer(editingServer, config)
    } catch (err) {
      setError(text.invalidJson)
    }
  }

  const addNewServer = async () => {
    if (!newServerConfig.id || !newServerConfig.command) {
      setError('Server ID and command are required')
      return
    }

    await saveServer(newServerConfig.id, {
      command: newServerConfig.command,
      args: newServerConfig.args,
      env: newServerConfig.env,
      disabled: newServerConfig.disabled,
      timeout: newServerConfig.timeout,
      maxConcurrency: newServerConfig.maxConcurrency
    })

    // Reset form
    setNewServerConfig({
      id: '',
      command: '',
      args: [],
      env: {},
      disabled: false,
      timeout: 30000,
      maxConcurrency: 5
    })
  }

  const formatUptime = (uptime?: number) => {
    if (!uptime) return '-'
    
    const seconds = Math.floor(uptime / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} ${text.days}`
    if (hours > 0) return `${hours} ${text.hours}`
    if (minutes > 0) return `${minutes} ${text.minutes}`
    return `${seconds} ${text.seconds}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return 'bg-green-500'
      case 'error':
      case 'unhealthy':
        return 'bg-red-500'
      case 'connecting':
      case 'unknown':
      default:
        return 'bg-yellow-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return text.connected
      case 'disconnected':
        return text.disconnected
      case 'error':
        return text.error
      case 'connecting':
        return text.connecting
      case 'healthy':
        return text.healthy
      case 'unhealthy':
        return text.unhealthy
      default:
        return text.unknown
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{text.serverConfiguration}</h3>
        <div className="flex space-x-2">
          <button
            onClick={loadServerStatuses}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {text.refresh}
          </button>
          <button
            onClick={() => setShowAddServer(true)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {text.addServer}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Server List */}
      {Object.keys(servers).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{text.noServers}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(servers).map(([serverId, server]) => {
            const status = serverStatuses[serverId]
            const tools = serverTools[serverId] || []
            const isEditing = editingServer === serverId

            return (
              <div key={serverId} className="border rounded-lg p-4 space-y-4">
                {/* Server Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status?.status || 'unknown')}`}></div>
                    <h4 className="font-medium">{serverId}</h4>
                    <span className="text-sm text-muted-foreground">
                      {getStatusText(status?.status || 'unknown')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => testConnection(serverId)}
                      disabled={testingConnection === serverId}
                      className="text-sm px-3 py-1 border rounded hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {testingConnection === serverId ? '...' : text.test}
                    </button>
                    <button
                      onClick={() => toggleServerEnabled(serverId, !!server.disabled)}
                      className={`text-sm px-3 py-1 border rounded transition-colors ${
                        server.disabled 
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      {server.disabled ? text.enable : text.disable}
                    </button>
                    <button
                      onClick={() => startEditingServer(serverId)}
                      className="text-sm px-3 py-1 border rounded hover:bg-accent transition-colors"
                    >
                      {text.edit}
                    </button>
                    <button
                      onClick={() => deleteServer(serverId)}
                      className="text-sm px-3 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50 transition-colors"
                    >
                      {text.delete}
                    </button>
                  </div>
                </div>

                {/* Server Details */}
                {!isEditing ? (
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium">{text.command}:</span>
                          <span className="ml-2 font-mono bg-muted px-2 py-1 rounded">{server.command}</span>
                        </div>
                        {server.args && server.args.length > 0 && (
                          <div>
                            <span className="font-medium">{text.arguments}:</span>
                            <div className="ml-2 space-y-1">
                              {server.args.map((arg, index) => (
                                <div key={index} className="font-mono bg-muted px-2 py-1 rounded text-xs">
                                  {arg}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {server.env && Object.keys(server.env).length > 0 && (
                          <div>
                            <span className="font-medium">{text.environment}:</span>
                            <div className="ml-2 space-y-1">
                              {Object.entries(server.env).map(([key, value]) => (
                                <div key={key} className="font-mono bg-muted px-2 py-1 rounded text-xs">
                                  {key}={value}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      {status && (
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">{text.lastCheck}:</span>
                            <span className="ml-2">{new Date(status.lastCheck).toLocaleString()}</span>
                          </div>
                          {status.responseTime && (
                            <div>
                              <span className="font-medium">{text.responseTime}:</span>
                              <span className="ml-2">{status.responseTime}{text.ms}</span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">{text.uptime}:</span>
                            <span className="ml-2">{formatUptime(status.uptime)}</span>
                          </div>
                          <div>
                            <span className="font-medium">{text.toolCount}:</span>
                            <span className="ml-2">{status.toolCount}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Configuration Editor */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{text.jsonConfiguration}</label>
                      <textarea
                        value={editingConfig}
                        onChange={(e) => setEditingConfig(e.target.value)}
                        className="w-full h-64 p-3 border rounded-md font-mono text-sm bg-background"
                        placeholder="Enter JSON configuration..."
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingServer(null)}
                        className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                      >
                        {text.cancel}
                      </button>
                      <button
                        onClick={saveEditedServer}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        {text.save}
                      </button>
                    </div>
                  </div>
                )}

                {/* Available Tools */}
                {!isEditing && tools.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2">{text.availableTools}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {tools.map((tool) => (
                        <div key={tool.name} className="bg-muted/50 p-2 rounded text-sm">
                          <div className="font-medium">{tool.name.replace(`${serverId}.`, '')}</div>
                          {tool.description && (
                            <div className="text-muted-foreground text-xs mt-1">{tool.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Troubleshooting */}
                {!isEditing && status?.status === 'unhealthy' && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <h5 className="font-medium text-yellow-800 mb-2">{text.troubleshootingTips}</h5>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• {text.checkCommand}</li>
                      <li>• {text.checkArgs}</li>
                      <li>• {text.checkEnv}</li>
                      <li>• {text.checkPermissions}</li>
                    </ul>
                    {status.error && (
                      <div className="mt-2 p-2 bg-yellow-100 rounded text-xs font-mono">
                        {status.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Server Modal */}
      {showAddServer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">{text.addServer}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{text.serverId}</label>
                <input
                  type="text"
                  value={newServerConfig.id}
                  onChange={(e) => setNewServerConfig(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., filesystem"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">{text.command}</label>
                <input
                  type="text"
                  value={newServerConfig.command}
                  onChange={(e) => setNewServerConfig(prev => ({ ...prev, command: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., npx"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">{text.arguments}</label>
                <textarea
                  value={newServerConfig.args.join('\n')}
                  onChange={(e) => setNewServerConfig(prev => ({ 
                    ...prev, 
                    args: e.target.value.split('\n').filter(arg => arg.trim()) 
                  }))}
                  className="w-full p-2 border rounded-md h-24"
                  placeholder="One argument per line"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{text.timeout} (ms)</label>
                  <input
                    type="number"
                    value={newServerConfig.timeout}
                    onChange={(e) => setNewServerConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{text.maxConcurrency}</label>
                  <input
                    type="number"
                    value={newServerConfig.maxConcurrency}
                    onChange={(e) => setNewServerConfig(prev => ({ ...prev, maxConcurrency: parseInt(e.target.value) || 5 }))}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddServer(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
              >
                {text.cancel}
              </button>
              <button
                onClick={addNewServer}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {text.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}