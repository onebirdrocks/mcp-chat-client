import { initializeSessionManager } from '@/services/SessionManager';

let isInitialized = false;

/**
 * Initialize all backend services
 */
export async function initializeBackend(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    console.log('Initializing backend services...');
    
    // Initialize session manager
    await initializeSessionManager();
    console.log('Session manager initialized');

    isInitialized = true;
    console.log('Backend initialization complete');
  } catch (error) {
    console.error('Failed to initialize backend:', error);
    throw error;
  }
}

/**
 * Ensure backend is initialized before handling requests
 */
export async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeBackend();
  }
}

/**
 * Check if backend is initialized
 */
export function isBackendInitialized(): boolean {
  return isInitialized;
}