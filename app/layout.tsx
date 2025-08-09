import type { Metadata, Viewport } from 'next'
import { detectTheme, detectLanguage, detectUserAgent } from '../lib/server-utils'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'MCP Chat UI',
    template: '%s | MCP Chat UI'
  },
  description: 'A modern, secure chat interface for Model Context Protocol servers with multi-LLM provider support',
  keywords: ['MCP', 'Model Context Protocol', 'Chat', 'AI', 'LLM', 'OpenAI', 'DeepSeek', 'OpenRouter'],
  authors: [{ name: 'MCP Chat UI Team' }],
  creator: 'MCP Chat UI',
  publisher: 'MCP Chat UI',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side detection of user preferences
  const theme = await detectTheme()
  const language = await detectLanguage()
  const userAgent = await detectUserAgent()
  
  // Set initial theme class based on server-side detection
  const themeClass = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : ''
  
  return (
    <html 
      lang={language} 
      className={themeClass}
      suppressHydrationWarning
      data-theme={theme}
      data-device={userAgent.isMobile ? 'mobile' : userAgent.isTablet ? 'tablet' : 'desktop'}
    >
      <head>
        {/* Theme detection script to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || '${theme}';
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const isDark = theme === 'dark' || (theme === 'system' && systemDark);
                  document.documentElement.classList.toggle('dark', isDark);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div id="root" className="relative flex min-h-screen flex-col">
          {children}
        </div>
        
        {/* Initialize client-side features */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize accessibility features
              if (typeof window !== 'undefined') {
                // Set up skip links
                const skipLinks = document.createElement('div');
                skipLinks.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50';
                skipLinks.innerHTML = \`
                  <a href="#main-content" class="bg-blue-600 text-white px-4 py-2 rounded-md">Skip to main content</a>
                  <a href="#navigation" class="bg-blue-600 text-white px-4 py-2 rounded-md ml-2">Skip to navigation</a>
                \`;
                document.body.insertBefore(skipLinks, document.body.firstChild);
              }
            `,
          }}
        />
      </body>
    </html>
  )
}