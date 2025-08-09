import { Metadata } from 'next'
import { NavigationLayout } from '../../src/components/next'
import { detectLanguage, detectUserAgent } from '../../lib/server-utils'
import { getServerSettings } from '../../lib/server-data'

export const metadata: Metadata = {
  title: {
    default: 'Chat',
    template: '%s | MCP Chat UI'
  },
  description: 'Chat with AI models through MCP servers',
}

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side data fetching for chat context
  const [language, userAgent, serverSettings] = await Promise.all([
    detectLanguage(),
    detectUserAgent(),
    getServerSettings()
  ])
  
  // Check if we have any active providers
  const hasActiveProviders = serverSettings.llmProviders.some(p => p.enabled && p.status === 'connected')
  
  return (
    <NavigationLayout
      data-language={language}
      data-device={userAgent.isMobile ? 'mobile' : userAgent.isTablet ? 'tablet' : 'desktop'}
      data-has-providers={hasActiveProviders}
    >
      {/* Provider warning banner */}
      {!hasActiveProviders && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3">
          <div className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
            {language === 'zh'
              ? '⚠️ 没有可用的LLM提供商。请在设置中配置提供商。'
              : '⚠️ No active LLM providers available. Please configure providers in settings.'
            }
          </div>
        </div>
      )}
      
      {/* Main chat content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </NavigationLayout>
  )
}