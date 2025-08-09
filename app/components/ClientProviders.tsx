'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../src/i18n';
import { initializeSettings } from '../../src/store/settingsStore';
import { initializeTheme } from '../../src/utils/themeInit';

interface ClientProvidersProps {
  children: React.ReactNode;
  initialLanguage?: string;
  initialTheme?: string;
}

const ClientProviders: React.FC<ClientProvidersProps> = ({ 
  children, 
  initialLanguage = 'en'
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize theme first to prevent flash
        initializeTheme();
        
        // Initialize i18n with the current locale from Next.js router
        const currentLocale = router.locale || initialLanguage;
        if (i18n.language !== currentLocale) {
          await i18n.changeLanguage(currentLocale);
        }
        
        // Initialize settings store
        await initializeSettings();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Still mark as initialized to prevent infinite loading
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [router.locale, initialLanguage]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-gray-600 dark:text-gray-400">Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
};

export default ClientProviders;