import type { Metadata, Viewport } from 'next'
import { detectTheme, detectLanguage, detectUserAgent } from '../lib/server-utils'
import { AccessibilityProvider } from '../src/components/ui/AccessibilityProvider'
import { IntegrationManager } from '../src/components/IntegrationManager'
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary'
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
                  
                  // Initialize accessibility preferences
                  const a11ySettings = localStorage.getItem('accessibility-settings');
                  if (a11ySettings) {
                    try {
                      const settings = JSON.parse(a11ySettings);
                      if (settings.highContrast) document.documentElement.classList.add('high-contrast');
                      if (settings.reducedMotion) document.documentElement.classList.add('reduced-motion');
                      if (settings.fontSize) document.documentElement.classList.add('font-' + settings.fontSize);
                      if (settings.focusVisible) document.documentElement.classList.add('focus-visible-enabled');
                      if (settings.screenReaderOptimized) document.documentElement.classList.add('screen-reader-optimized');
                      if (settings.keyboardNavigation) document.documentElement.classList.add('keyboard-navigation-enhanced');
                    } catch (e) {}
                  }
                  
                  // Detect system preferences
                  if (window.matchMedia('(prefers-contrast: high)').matches) {
                    document.documentElement.classList.add('high-contrast');
                  }
                  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                    document.documentElement.classList.add('reduced-motion');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        {/* Skip Links */}
        <div className="skip-links">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <a href="#navigation" className="skip-link">
            Skip to navigation
          </a>
          <a href="#search" className="skip-link">
            Skip to search
          </a>
        </div>

        <ErrorBoundary>
          <I18nProvider initialLanguage={language}>
            <AccessibilityProvider>
              <IntegrationManager>
                <div id="root" className="relative flex min-h-screen flex-col">
                  {/* Main Application */}
                  <main id="main-content" role="main" className="flex-1">
                    {children}
                  </main>
                </div>
              </IntegrationManager>
            </AccessibilityProvider>
          </I18nProvider>
        </ErrorBoundary>
        {/* Live regions for screen reader announcements */}
        <div id="a11y-live-polite" aria-live="polite" aria-atomic="true" className="sr-only"></div>
        <div id="a11y-live-assertive" aria-live="assertive" aria-atomic="true" className="sr-only"></div>
      </body>
    </html>
  )
}