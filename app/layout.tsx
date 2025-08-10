import type { Metadata, Viewport } from 'next'
import { I18nProvider } from './components/I18nProvider'
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-gray-900 font-sans antialiased" suppressHydrationWarning>
        <I18nProvider initialLanguage="en">
          <div id="root" className="relative flex min-h-screen flex-col">
            <main id="main-content" role="main" className="flex-1">
              {children}
            </main>
          </div>
        </I18nProvider>
      </body>
    </html>
  )
}