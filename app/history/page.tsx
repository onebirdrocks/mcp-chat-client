import { Metadata } from 'next'
import Link from 'next/link'
import { getChatHistory } from '../../lib/server-data'
import { detectLanguage } from '../../lib/server-utils'

export const metadata: Metadata = {
  title: 'Chat History',
  description: 'View and manage your chat sessions and conversation history',
}

export default async function HistoryPage() {
  // Server-side data fetching
  const [{ sessions, stats }, language] = await Promise.all([
    getChatHistory(),
    detectLanguage()
  ])
  
  // Localized text
  const text = language === 'zh' ? {
    chatHistory: '聊天历史',
    backToChat: '← 返回聊天',
    settings: '设置',
    searchConversations: '搜索对话...',
    allSessions: '所有会话',
    recent: '最近',
    archived: '已归档',
    exportAll: '导出全部',
    totalSessions: '总会话数',
    totalMessages: '总消息数',
    tokensUsed: '已使用令牌',
    toolsExecuted: '已执行工具',
    recentSessions: '最近会话',
    messages: '条消息',
    toolsUsed: '个工具已使用',
    hoursAgo: '小时前',
    daysAgo: '天前',
    noSessions: '暂无聊天会话',
    noSessionsDesc: '您还没有任何聊天会话。开始新对话来查看历史记录。',
    startNewChat: '开始新聊天'
  } : {
    chatHistory: 'Chat History',
    backToChat: '← Back to Chat',
    settings: 'Settings',
    searchConversations: 'Search conversations...',
    allSessions: 'All Sessions',
    recent: 'Recent',
    archived: 'Archived',
    exportAll: 'Export All',
    totalSessions: 'Total Sessions',
    totalMessages: 'Total Messages',
    tokensUsed: 'Tokens Used',
    toolsExecuted: 'Tools Executed',
    recentSessions: 'Recent Sessions',
    messages: 'messages',
    toolsUsed: 'tools used',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    noSessions: 'No Chat Sessions',
    noSessionsDesc: 'You don\'t have any chat sessions yet. Start a new conversation to see history here.',
    startNewChat: 'Start New Chat'
  }
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {text.backToChat}
              </Link>
              <h1 className="text-2xl font-bold text-foreground">{text.chatHistory}</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link
                href="/settings"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {text.settings}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Search and Filter Bar */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={text.searchConversations}
                    className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <select className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>{text.allSessions}</option>
                  <option>{text.recent}</option>
                  <option>{text.archived}</option>
                </select>
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  {text.exportAll}
                </button>
              </div>
            </div>
          </div>

          {/* Session Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{stats.totalSessions}</div>
              <div className="text-sm text-muted-foreground">{text.totalSessions}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{stats.totalMessages}</div>
              <div className="text-sm text-muted-foreground">{text.totalMessages}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">
                {stats.totalTokensUsed > 1000 
                  ? `${(stats.totalTokensUsed / 1000).toFixed(1)}K` 
                  : stats.totalTokensUsed
                }
              </div>
              <div className="text-sm text-muted-foreground">{text.tokensUsed}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">
                {sessions.reduce((acc, session) => acc + (session.tags.includes('tools-used') ? 1 : 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">{text.toolsExecuted}</div>
            </div>
          </div>

          {/* Session List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{text.recentSessions}</h2>
            
            {sessions.length > 0 ? (
              sessions.map(session => {
                const timeAgo = Math.floor((Date.now() - new Date(session.updatedAt).getTime()) / (1000 * 60 * 60))
                const timeText = timeAgo < 24 
                  ? `${timeAgo} ${text.hoursAgo}`
                  : `${Math.floor(timeAgo / 24)} ${text.daysAgo}`
                
                const hasTools = session.tags.includes('tools-used')
                
                return (
                  <div key={session.id} className="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground mb-1">
                          {session.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                          <span>{session.provider} {session.model}</span>
                          <span>•</span>
                          <span>{session.messageCount} {text.messages}</span>
                          <span>•</span>
                          <span>{timeText}</span>
                          {hasTools && (
                            <>
                              <span>•</span>
                              <span className="text-primary">{text.toolsUsed}</span>
                            </>
                          )}
                        </div>
                        {session.totalTokens > 0 && (
                          <div className="text-xs text-muted-foreground mb-2">
                            {session.totalTokens} tokens • ${session.estimatedCost.toFixed(4)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Link
                          href={`/chat/${session.id}`}
                          className="p-2 hover:bg-muted rounded-md transition-colors"
                          title={language === 'zh' ? '继续对话' : 'Continue conversation'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </Link>
                        <button 
                          className="p-2 hover:bg-muted rounded-md transition-colors"
                          title={language === 'zh' ? '编辑标题' : 'Edit title'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          className="p-2 hover:bg-muted rounded-md transition-colors"
                          title={language === 'zh' ? '删除会话' : 'Delete session'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              /* Empty State */
              <div className="mt-8 p-8 border-2 border-dashed border-muted rounded-lg text-center text-muted-foreground">
                <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium mb-2">{text.noSessions}</h3>
                <p className="text-sm mb-4">{text.noSessionsDesc}</p>
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {text.startNewChat}
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}