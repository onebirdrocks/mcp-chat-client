import { Metadata } from 'next'
import Link from 'next/link'
import { getServerSettings } from '../../lib/server-data'
import { detectLanguage } from '../../lib/server-utils'

export const metadata: Metadata = {
  title: 'New Chat',
  description: 'Start a new conversation with AI models',
}

export default async function ChatPage() {
  // Server-side data fetching
  const [serverSettings, language] = await Promise.all([
    getServerSettings(),
    detectLanguage()
  ])
  
  const activeProviders = serverSettings.llmProviders.filter(p => p.enabled && p.status === 'connected')
  
  // Localized text
  const text = language === 'zh' ? {
    newChat: '新建聊天',
    selectProvider: '选择提供商和模型',
    selectProviderDesc: '选择一个LLM提供商和模型来开始对话。',
    noProviders: '没有可用的提供商',
    noProvidersDesc: '没有配置或连接的LLM提供商。请在设置中配置提供商。',
    goToSettings: '前往设置',
    provider: '提供商',
    model: '模型',
    startChat: '开始聊天',
    supportsTools: '支持工具调用'
  } : {
    newChat: 'New Chat',
    selectProvider: 'Select Provider and Model',
    selectProviderDesc: 'Choose an LLM provider and model to start your conversation.',
    noProviders: 'No Providers Available',
    noProvidersDesc: 'No LLM providers are configured or connected. Please configure providers in settings.',
    goToSettings: 'Go to Settings',
    provider: 'Provider',
    model: 'Model',
    startChat: 'Start Chat',
    supportsTools: 'Supports tool calling'
  }
  
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← {language === 'zh' ? '返回首页' : 'Back to Home'}
            </Link>
            <h1 className="text-xl font-semibold text-foreground">{text.newChat}</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <Link
              href="/history"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {language === 'zh' ? '历史记录' : 'History'}
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {language === 'zh' ? '设置' : 'Settings'}
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {activeProviders.length > 0 ? (
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-2">{text.selectProvider}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {text.selectProviderDesc}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{text.provider}</label>
                  <select className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">{language === 'zh' ? '选择提供商...' : 'Select provider...'}</option>
                    {activeProviders.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">{text.model}</label>
                  <select className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">{language === 'zh' ? '先选择提供商...' : 'Select provider first...'}</option>
                  </select>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {text.supportsTools}
                    </span>
                  </div>
                </div>
                
                <button 
                  className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled
                >
                  {text.startChat}
                </button>
                
                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {language === 'zh'
                    ? '注意：交互式聊天组件将在后续任务中实现。这包括消息输入、流式响应和工具确认对话框。'
                    : 'Note: Interactive chat components will be implemented in future tasks. This includes message input, streaming responses, and tool confirmation dialogs.'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2">{text.noProviders}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {text.noProvidersDesc}
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {text.goToSettings}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}