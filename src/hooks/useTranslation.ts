import { useTranslation as useI18nTranslation } from 'react-i18next';
import { 
  createTypedTranslation, 
  createNamespacedTranslation,
  pluralize,
  translateWithValues,
  type TranslationKey 
} from '../utils/i18n';

/**
 * Enhanced translation hook that provides type-safe translations
 * and additional utility functions
 */
export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();
  
  // Type-safe translation function
  const tSafe = createTypedTranslation(t);
  
  // Namespaced translation functions
  const tNs = createNamespacedTranslation(t);
  
  // Pluralization helper
  const tPlural = (key: string, count: number, options?: any) => 
    pluralize(t, key, count, options);
  
  // Translation with interpolation
  const tValues = (key: TranslationKey, values: Record<string, any>) => 
    translateWithValues(t, key, values);
  
  return {
    // Original i18next functions
    t,
    i18n,
    
    // Enhanced type-safe functions
    tSafe,
    tNs,
    tPlural,
    tValues,
    
    // Convenience properties
    currentLanguage: i18n.language,
    isReady: i18n.isInitialized,
  };
};

export default useTranslation;