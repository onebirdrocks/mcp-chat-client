import { headers } from 'next/headers'
import { cookies } from 'next/headers'

/**
 * Server-side theme detection utility
 * Detects theme preference from cookies or headers
 */
export async function detectTheme(): Promise<'light' | 'dark' | 'system'> {
  const cookieStore = await cookies()
  const headersList = await headers()
  
  // Check for explicit theme cookie
  const themeCookie = cookieStore.get('theme')
  if (themeCookie?.value && ['light', 'dark', 'system'].includes(themeCookie.value)) {
    return themeCookie.value as 'light' | 'dark' | 'system'
  }
  
  // Check Accept header for dark mode preference
  const acceptHeader = headersList.get('accept') || ''
  if (acceptHeader.includes('prefers-color-scheme: dark')) {
    return 'dark'
  }
  
  // Default to system preference
  return 'system'
}

/**
 * Server-side language detection utility
 * Detects language preference from cookies, headers, or defaults to English
 */
export async function detectLanguage(): Promise<'en' | 'zh'> {
  const cookieStore = await cookies()
  const headersList = await headers()
  
  // Check for explicit language cookie
  const langCookie = cookieStore.get('language')
  if (langCookie?.value && ['en', 'zh'].includes(langCookie.value)) {
    return langCookie.value as 'en' | 'zh'
  }
  
  // Check Accept-Language header
  const acceptLanguage = headersList.get('accept-language') || ''
  
  // Simple language detection - prioritize Chinese variants
  if (acceptLanguage.includes('zh')) {
    return 'zh'
  }
  
  // Default to English
  return 'en'
}

/**
 * Server-side user agent detection for responsive hints
 */
export async function detectUserAgent(): Promise<{
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  browser: string
}> {
  const headersList = await headers()
  const userAgent = headersList.get('user-agent') || ''
  
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
  const isDesktop = !isMobile && !isTablet
  
  let browser = 'unknown'
  if (userAgent.includes('Chrome')) browser = 'chrome'
  else if (userAgent.includes('Firefox')) browser = 'firefox'
  else if (userAgent.includes('Safari')) browser = 'safari'
  else if (userAgent.includes('Edge')) browser = 'edge'
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    browser
  }
}

/**
 * Get server-side environment information
 */
export function getServerEnvironment() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  }
}