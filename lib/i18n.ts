import { GetStaticPropsContext } from 'next';

export const SUPPORTED_LOCALES = ['en', 'zh'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  zh: '中文',
};

/**
 * Get locale from Next.js context
 */
export function getLocaleFromContext(context: GetStaticPropsContext): SupportedLocale {
  const locale = context.locale as SupportedLocale;
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

/**
 * Get all supported locales for static generation
 */
export function getAllLocales(): SupportedLocale[] {
  return [...SUPPORTED_LOCALES];
}

/**
 * Check if a locale is supported
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Get locale name for display
 */
export function getLocaleName(locale: SupportedLocale): string {
  return LOCALE_NAMES[locale];
}

/**
 * Detect browser language preference
 */
export function detectBrowserLanguage(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  
  const browserLang = navigator.language || (navigator as any).userLanguage;
  const langCode = browserLang.split('-')[0] as SupportedLocale;
  
  return isSupportedLocale(langCode) ? langCode : DEFAULT_LOCALE;
}

/**
 * Load translations for a specific locale
 */
export async function loadTranslations(locale: SupportedLocale) {
  try {
    // Dynamic import based on locale
    const translations = await import(`../src/locales/${locale}/translation.json`);
    return translations.default;
  } catch (error) {
    console.warn(`Failed to load translations for locale ${locale}, falling back to default`);
    const fallbackTranslations = await import(`../src/locales/${DEFAULT_LOCALE}/translation.json`);
    return fallbackTranslations.default;
  }
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format relative time according to locale
 */
export function formatRelativeTime(date: Date, locale: SupportedLocale): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
}