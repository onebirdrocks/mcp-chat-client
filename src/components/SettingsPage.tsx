'use client'

import React, { useState } from 'react'
import LLMProviderConfig from './LLMProviderConfig'
import MCPServerConfig from './MCPServerConfig'
import PreferencesConfig from '../../app/components/PreferencesConfig'

interface SettingsPageProps {
  language: 'en' | 'zh'
  serverSettings: any
}

export default function SettingsPage({ language, serverSettings }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'llm' | 'mcp' | 'preferences' | 'security' | 'export'>('llm')

  // Localized text
  const text = language === 'zh' ? {
    settings: '设置',
    backToChat: '← 返回聊天',
    history: '历史记录',
    llmProviders: 'LLM 提供商',
    mcpServers: 'MCP 服务器',
    preferences: '偏好设置',
    security: '安全',
    dataExport: '数据导出',
    providerConfiguration: 'LLM 提供商配置',
    providerStatus: '提供商状态',
    connected: '已连接',
    pending: '待配置',
    error: '错误',
    providerManagement: '提供商管理',
    addProvider: '添加提供商',
    note: '注意',
    singleUserNote: '这是单用户部署。API密钥在服务器端管理，从不暴露给客户端。',
    sessionNote: '创建新聊天会话时，您将从此处配置的提供商中选择。所有凭据都安全存储在服务器上。'
  } : {
    settings: 'Settings',
    backToChat: '← Back to Chat',
    history: 'History',
    llmProviders: 'LLM Providers',
    mcpServers: 'MCP Servers',
    preferences: 'Preferences',
    security: 'Security',
    dataExport: 'Data Export',
    providerConfiguration: 'LLM Provider Configuration',
    providerStatus: 'Provider Status',
    connected: 'Connected',
    pending: 'Pending',
    error: 'Error',
    providerManagement: 'Provider Management',
    addProvider: 'Add Provider',
    note: 'Note',
    singleUserNote: 'This is a single-user deployment. API keys are managed server-side and never exposed to the client.',
    sessionNote: 'When creating new chat sessions, you\'ll select from providers configured here. All credentials remain securely stored on the server.'
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'llm':
        return (
          <div className="space-y-6">
            {/* Provider Status Overview */}
            <div>
              <h3 className="text-lg font-medium mb-4">{text.providerStatus}</h3>
              <div className="space-y-3">
                {serverSettings.llmProviders.map((provider: any) => {
                  const statusColor = provider.status === 'connected' ? 'bg-green-500' : 
                                     provider.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  const statusText = provider.status === 'connected' ? text.connected :
                                    provider.status === 'error' ? text.error : text.pending
                  const statusTextColor = provider.status === 'connected' ? 'text-green-600' :
                                         provider.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                  
                  return (
                    <div key={provider.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
                        <span className="font-medium">{provider.displayName}</span>
                        <span className="text-sm text-muted-foreground">
                          {provider.models.length > 0 
                            ? provider.models.map((m: any) => m.displayName).join(', ')
                            : (language === 'zh' ? '未配置' : 'Not configured')
                          }
                        </span>
                      </div>
                      <span className={`text-sm ${statusTextColor}`}>{statusText}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Configuration Actions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{text.providerManagement}</h3>
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  {text.addProvider}
                </button>
              </div>
              
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                <p className="mb-2">
                  <strong>{text.note}:</strong> {text.singleUserNote}
                </p>
                <p>
                  {text.sessionNote}
                </p>
              </div>
            </div>

            {/* LLM Provider Management Component */}
            <LLMProviderConfig language={language} />
          </div>
        )
      
      case 'mcp':
        return (
          <div className="space-y-6">
            {/* MCP Servers Status */}
            {serverSettings.mcpServers.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">{text.mcpServers}</h3>
                <div className="space-y-3">
                  {serverSettings.mcpServers.map((server: any) => {
                    const statusColor = server.status === 'connected' ? 'bg-green-500' : 
                                       server.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    const statusText = server.status === 'connected' ? text.connected :
                                      server.status === 'error' ? text.error : text.pending
                    const statusTextColor = server.status === 'connected' ? 'text-green-600' :
                                           server.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                    
                    return (
                      <div key={server.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
                          <span className="font-medium">{server.displayName}</span>
                          <span className="text-sm text-muted-foreground">
                            {server.toolCount > 0 
                              ? `${server.toolCount} ${language === 'zh' ? '个工具' : 'tools'}`
                              : (language === 'zh' ? '无工具' : 'No tools')
                            }
                          </span>
                        </div>
                        <span className={`text-sm ${statusTextColor}`}>{statusText}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* MCP Server Management Component */}
            <MCPServerConfig language={language} />
          </div>
        )
      
      case 'preferences':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{text.preferences}</h3>
            <PreferencesConfig />
          </div>
        )
      
      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{text.security}</h3>
            <p className="text-muted-foreground">Security settings coming soon...</p>
          </div>
        )
      
      case 'export':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">{text.dataExport}</h3>
            <p className="text-muted-foreground">Data export options coming soon...</p>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Settings Navigation */}
      <div className="grid md:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('llm')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'llm'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {text.llmProviders}
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'mcp'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {text.mcpServers}
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {text.preferences}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'security'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {text.security}
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'export'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {text.dataExport}
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3">
          <div className="bg-card border rounded-lg p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}