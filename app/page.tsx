import { Metadata } from 'next'
import Link from 'next/link'
import { NavigationLayout } from '../src/components/next'
import { getRecentSessions, getServerSettings } from '../lib/server-data'
import { detectLanguage } from '../lib/server-utils'

export const metadata: Metadata = {
  title: 'MCP Chat UI - Home',
  description: 'Start a new conversation with AI models through MCP servers',
}

export default async function HomePage() {
  // Server-side data fetching
  const [recentSessions, serverSettings, language] = await Promise.all([
    getRecentSessions(3),
    getServerSettings(),
    detectLanguage()
  ])
  
  // Count active providers
  const activeProviders = serverSettings.llmProviders.filter(p => p.enabled && p.status === 'connected')
  const activeMcpServers = serverSettings.mcpServers.filter(s => s.enabled && s.status === 'connected')
  
  // Localized text based on detected language
  const text = language === 'zh' ? {
    welcome: '欢迎使用 MCP Chat UI',
    description: '一个安全的本地优先聊天界面，连接到您的模型上下文协议服务器，支持多个LLM提供商，具有明确的工具执行控制。',
    startNewChat: '开始新聊天',
    configureSettings: '配置设置',
    recentSessions: '最近会话',
    systemStatus: '系统状态',
    activeProviders: '活跃提供商',
    mcpServers: 'MCP 服务器',
    securePrivate: '安全私密',
    toolControl: '工具控制',
    multiProvider: '多提供商',
    noProviders: '无可用提供商',
    newChatSession: '新建聊天会话',
    openSettings: '打开设置',
    viewAll: '查看全部',
    messages: '条消息',
    continue: '继续'
  } : {
    welcome: 'Welcome to MCP Chat UI',
    description: 'A secure, local-first chat interface that connects to your Model Context Protocol servers and supports multiple LLM providers with explicit tool execution control.',
    startNewChat: 'Start New Chat',
    configureSettings: 'Configure Settings',
    recentSessions: 'Recent Sessions',
    systemStatus: 'System Status',
    activeProviders: 'Active Providers',
    mcpServers: 'MCP Servers',
    securePrivate: 'Secure & Private',
    toolControl: 'Tool Control',
    multiProvider: 'Multi-Provider',
    noProviders: 'No providers available',
    newChatSession: 'New Chat Session',
    openSettings: 'Open Settings',
    viewAll: 'View All',
    messages: 'messages',
    continue: 'Continue'
  }
  return (
    <NavigationLayout>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {text.welcome}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {text.description}
            </p>
            
            {/* System Status Indicators */}
            <div className="flex items-center justify-center space-x-6 mt-6">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${activeProviders.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {activeProviders.length} {text.activeProviders}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${activeMcpServers.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {activeMcpServers.length} {text.mcpServers}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Start Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{text.startNewChat}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {language === 'zh' 
                  ? '与您配置的AI模型开始对话。从服务器上配置的可用提供商和模型中选择。'
                  : 'Begin a conversation with your configured AI models. Choose from available providers and models configured on the server.'
                }
              </p>
              <div className="mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {language === 'zh' ? '可用提供商:' : 'Available Providers:'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeProviders.map(provider => (
                    <span key={provider.id} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                      {provider.displayName}
                    </span>
                  ))}
                  {activeProviders.length === 0 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                      {text.noProviders}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/chat"
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeProviders.length > 0 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {text.newChatSession}
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{text.configureSettings}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {language === 'zh'
                  ? '管理您的LLM提供商、MCP服务器连接，并自定义您的聊天体验偏好。'
                  : 'Manage your LLM providers, MCP server connections, and customize your chat experience preferences.'
                }
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {text.openSettings}
              </Link>
            </div>
          </div>

          {/* Recent Sessions Section */}
          {recentSessions.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{text.recentSessions}</h2>
                <Link
                  href="/history"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  {text.viewAll}
                </Link>
              </div>
              <div className="grid gap-4">
                {recentSessions.map(session => (
                  <div key={session.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1 truncate">{session.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>{session.provider} {session.model}</span>
                          <span>•</span>
                          <span>{session.messageCount} {text.messages}</span>
                          <span>•</span>
                          <span>{new Date(session.updatedAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}</span>
                        </div>
                      </div>
                      <Link
                        href={`/chat/${session.id}`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors ml-4 flex-shrink-0"
                      >
                        {text.continue}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{text.securePrivate}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {language === 'zh'
                  ? '本地优先架构，具有加密API密钥存储，无外部数据传输。'
                  : 'Local-first architecture with encrypted API key storage and no external data transmission.'
                }
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{text.toolControl}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {language === 'zh'
                  ? '所有MCP工具执行都需要明确确认，操作流程透明。'
                  : 'Explicit confirmation required for all MCP tool executions with transparent operation flow.'
                }
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{text.multiProvider}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {language === 'zh'
                  ? '支持OpenAI、DeepSeek、OpenRouter等多个LLM提供商，统一界面。'
                  : 'Support for OpenAI, DeepSeek, OpenRouter and other LLM providers with unified interface.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </NavigationLayout>
  )
}